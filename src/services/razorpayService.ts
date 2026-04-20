// Razorpay Payout Service
// Handles all interactions with Razorpay Payout API

import axios, { AxiosError, AxiosInstance } from 'axios';
import crypto from 'crypto';
import { razorpayConfig } from '../config/razorpay.config';
import { AppError } from '../middlewares/errorHandler';
import { db } from '../config/db';
import { thirdPartyApiLogs } from '../schema';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface BankAccountDetails {
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
    bankName?: string;
}

export interface UpiDetails {
    upiId: string;
}

export interface ContactDetails {
    name: string;
    email: string;
    contact: string;
    type?: 'employee' | 'vendor' | 'customer';
    referenceId?: string;
}

export interface PayoutRequest {
    amount: number; // in paise (100 paise = 1 INR)
    currency?: string;
    mode: 'NEFT' | 'RTGS' | 'IMPS' | 'UPI';
    purpose?: string;
    fundAccount: {
        accountType: 'bank_account' | 'vpa';
        bankAccount?: BankAccountDetails;
        vpa?: { address: string };
        contact: ContactDetails;
    };
    queueIfLowBalance?: boolean;
    referenceId: string;
    narration?: string;
    notes?: Record<string, string>;
}

export interface PayoutResponse {
    id: string;
    entity: 'payout';
    fund_account_id: string;
    amount: number;
    currency: string;
    notes: Record<string, string>;
    fees: number;
    tax: number;
    status: 'processing' | 'processed' | 'reversed' | 'failed' | 'cancelled' | 'queued';
    purpose: string;
    utr: string | null;
    mode: string;
    reference_id: string;
    narration: string;
    batch_id: string | null;
    failure_reason: string | null;
    created_at: number;
    fee_type: string | null;
    error?: {
        source: string | null;
        reason: string | null;
        description: string | null;
        code: string;
        step: string;
        metadata: Record<string, any>;
    };
}

export interface RazorpayError {
    error: {
        code: string;
        description: string;
        source?: string;
        step?: string;
        reason?: string;
        metadata?: Record<string, any>;
    };
}

// ============================================================================
// Razorpay Service Class
// ============================================================================

class RazorpayService {
    private client: AxiosInstance;
    private idempotencyStore: Map<string, { timestamp: number; response: any }> = new Map();
    private idempotencyTTL = 24 * 60 * 60 * 1000; // 24 hours

    constructor() {
        // Create authenticated axios instance
        this.client = axios.create({
            baseURL: razorpayConfig.api.baseUrl,
            timeout: razorpayConfig.api.timeout,
            auth: {
                username: razorpayConfig.keyId,
                password: razorpayConfig.keySecret,
            },
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    // ============================================================================
    // Idempotency Management
    // ============================================================================

    /**
     * Check if request was already processed (idempotency check)
     */
    private checkIdempotency(idempotencyKey: string): PayoutResponse | null {
        if (!razorpayConfig.enableIdempotency) return null;

        const cached = this.idempotencyStore.get(idempotencyKey);

        if (cached) {
            const age = Date.now() - cached.timestamp;

            // Return cached response if within TTL
            if (age < this.idempotencyTTL) {
                console.log(`[Razorpay] Idempotency hit for key: ${idempotencyKey}`);
                return cached.response;
            }

            // Clean up expired entry
            this.idempotencyStore.delete(idempotencyKey);
        }

        return null;
    }

    /**
     * Store response for idempotency
     */
    private storeIdempotency(idempotencyKey: string, response: PayoutResponse): void {
        if (!razorpayConfig.enableIdempotency) return;

        this.idempotencyStore.set(idempotencyKey, {
            timestamp: Date.now(),
            response,
        });

        // Cleanup old entries periodically
        if (this.idempotencyStore.size > 1000) {
            this.cleanupIdempotencyStore();
        }
    }

    /**
     * Clean up expired idempotency entries
     */
    private cleanupIdempotencyStore(): void {
        const now = Date.now();

        for (const [key, value] of this.idempotencyStore.entries()) {
            if (now - value.timestamp > this.idempotencyTTL) {
                this.idempotencyStore.delete(key);
            }
        }
    }

    // ============================================================================
    // API Logging
    // ============================================================================

    /**
     * Log API request/response to database
     */
    private async logApiCall(params: {
        redemptionId?: number;
        provider: string;
        apiType: 'request' | 'webhook';
        endpoint: string;
        method: string;
        requestPayload?: any;
        responsePayload?: any;
        httpStatusCode?: number;
        isSuccess: boolean;
        errorMessage?: string;
        responseTimeMs?: number;
        webhookEventType?: string;
        webhookSignature?: string;
    }, tx?: any): Promise<void> {
        try {
            await (tx || db).insert(thirdPartyApiLogs).values({
                redemptionId: params.redemptionId,
                provider: params.provider,
                apiType: params.apiType,
                apiEndpoint: params.endpoint,
                httpMethod: params.method,
                requestPayload: params.requestPayload,
                responsePayload: params.responsePayload,
                httpStatusCode: params.httpStatusCode,
                isSuccess: params.isSuccess,
                errorMessage: params.errorMessage,
                responseTimeMs: params.responseTimeMs,
                webhookEventType: params.webhookEventType,
                webhookSignature: params.webhookSignature,
            });
        } catch (error) {
            console.error('[Razorpay] Failed to log API call:', error);
        }
    }

    // ============================================================================
    // Payout Operations
    // ============================================================================

    /**
     * Create a payout (UPI or Bank Transfer)
     */
    async createPayout(
        request: PayoutRequest,
        redemptionId?: number, tx?: any
    ): Promise<PayoutResponse> {

        const idempotencyKey = request.referenceId;
        const startTime = Date.now();

        try {
            // Check idempotency
            const cachedResponse = this.checkIdempotency(idempotencyKey);
            if (cachedResponse) {
                return cachedResponse;
            }

            // Build Razorpay request payload
            const payload = {
                account_number: razorpayConfig.accountNumber,
                amount: request.amount,
                currency: request.currency || razorpayConfig.defaults.currency,
                mode: request.mode,
                purpose: request.purpose || razorpayConfig.defaults.purpose,
                fund_account: {
                    account_type: request.fundAccount.accountType,
                    ...(request.fundAccount.bankAccount && {
                        bank_account: {
                            name: request.fundAccount.bankAccount.accountHolderName,
                            ifsc: request.fundAccount.bankAccount.ifscCode,
                            account_number: request.fundAccount.bankAccount.accountNumber,
                        },
                    }),
                    ...(request.fundAccount.vpa && {
                        vpa: {
                            address: request.fundAccount.vpa.address,
                        },
                    }),
                    contact: {
                        name: request.fundAccount.contact.name,
                        email: request.fundAccount.contact.email,
                        contact: request.fundAccount.contact.contact,
                        type: request.fundAccount.contact.type || 'customer',
                        reference_id: request.fundAccount.contact.referenceId || request.referenceId,
                        notes: {},
                    },
                },
                queue_if_low_balance: request.queueIfLowBalance ?? razorpayConfig.defaults.queueIfLowBalance,
                reference_id: request.referenceId,
                narration: '',
                notes: request.notes || {},
            };

            console.log(payload)

            // Make API call with idempotency header
            const response = await this.client.post<PayoutResponse>('/payouts', payload, {
                // headers: {
                //     'X-Payout-Idempotency': idempotencyKey,
                // },
            });
            console.log(response)
            const responseTime = Date.now() - startTime;

            // Log successful API call
            await this.logApiCall({
                redemptionId,
                provider: 'razorpay',
                apiType: 'request',
                endpoint: '/v1/payouts',
                method: 'POST',
                requestPayload: payload,
                responsePayload: response.data,
                httpStatusCode: response.status,
                isSuccess: true,
                responseTimeMs: responseTime,
            }, tx);

            // Store for idempotency
            this.storeIdempotency(idempotencyKey, response.data);

            return response.data;
        } catch (error) {
            if (error.response) {
                // This will tell you EXACTLY what Razorpay didn't like
                console.error("Razorpay Error Data:", JSON.stringify(error.response.data, null, 2));
            } const responseTime = Date.now() - startTime;
            const axiosError = error as AxiosError<RazorpayError>;

            let errorMessage = 'Unknown error';
            let statusCode = 500;

            if (axiosError.response) {
                statusCode = axiosError.response.status;
                errorMessage = axiosError.response.data?.error?.description || axiosError.message;

                // Log failed API call
                await this.logApiCall({
                    redemptionId,
                    provider: 'razorpay',
                    apiType: 'request',
                    endpoint: '/v1/payouts',
                    method: 'POST',
                    requestPayload: request,
                    responsePayload: axiosError.response.data,
                    httpStatusCode: statusCode,
                    isSuccess: false,
                    errorMessage,
                    responseTimeMs: responseTime,
                }, tx);
            }

            // Map Razorpay error codes to user-friendly messages
            const userMessage = this.mapErrorToMessage(axiosError.response?.data?.error);
            throw new AppError(userMessage, statusCode);
        }
    }

    /**
     * Get payout status by ID
     */
    async getPayoutStatus(payoutId: string, redemptionId?: number): Promise<PayoutResponse> {
        const startTime = Date.now();

        try {
            const response = await this.client.get<PayoutResponse>(`/payouts/${payoutId}`);
            const responseTime = Date.now() - startTime;

            await this.logApiCall({
                redemptionId,
                provider: 'razorpay',
                apiType: 'request',
                endpoint: `/v1/payouts/${payoutId}`,
                method: 'GET',
                responsePayload: response.data,
                httpStatusCode: response.status,
                isSuccess: true,
                responseTimeMs: responseTime,
            });

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<RazorpayError>;
            throw new AppError(
                axiosError.response?.data?.error?.description || 'Failed to fetch payout status',
                axiosError.response?.status || 500
            );
        }
    }

    /**
     * Cancel a pending payout
     */
    async cancelPayout(payoutId: string, redemptionId?: number): Promise<PayoutResponse> {
        const startTime = Date.now();

        try {
            const response = await this.client.post<PayoutResponse>(`/payouts/${payoutId}/cancel`);
            const responseTime = Date.now() - startTime;

            await this.logApiCall({
                redemptionId,
                provider: 'razorpay',
                apiType: 'request',
                endpoint: `/v1/payouts/${payoutId}/cancel`,
                method: 'POST',
                responsePayload: response.data,
                httpStatusCode: response.status,
                isSuccess: true,
                responseTimeMs: responseTime,
            });

            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError<RazorpayError>;
            throw new AppError(
                axiosError.response?.data?.error?.description || 'Failed to cancel payout',
                axiosError.response?.status || 500
            );
        }
    }

    // ============================================================================
    // Webhook Verification
    // ============================================================================

    /**
     * Verify Razorpay webhook signature
     */
    verifyWebhookSignature(payload: string, signature: string): boolean {
        if (!razorpayConfig.enableWebhookVerification) {
            console.warn('[Razorpay] Webhook verification is disabled');
            return true;
        }

        if (!razorpayConfig.webhookSecret) {
            console.error('[Razorpay] Webhook secret not configured');
            return false;
        }

        try {
            const expectedSignature = crypto
                .createHmac('sha256', razorpayConfig.webhookSecret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            console.error('[Razorpay] Webhook signature verification failed:', error);
            return false;
        }
    }

    /**
     * Log webhook event
     */
    async logWebhook(params: {
        redemptionId?: number;
        eventType: string;
        payload: any;
        signature: string;
        isSuccess: boolean;
        errorMessage?: string;
    }): Promise<void> {
        await this.logApiCall({
            redemptionId: params.redemptionId,
            provider: 'razorpay',
            apiType: 'webhook',
            endpoint: '/webhooks/razorpay',
            method: 'POST',
            responsePayload: params.payload,
            isSuccess: params.isSuccess,
            errorMessage: params.errorMessage,
            webhookEventType: params.eventType,
            webhookSignature: params.signature,
        });
    }

    // ============================================================================
    // Error Handling
    // ============================================================================

    /**
     * Map Razorpay error codes to user-friendly messages
     */
    private mapErrorToMessage(error?: RazorpayError['error']): string {
        if (!error) return 'Payout failed. Please try again.';

        const errorMap: Record<string, string> = {
            BAD_REQUEST_ERROR: 'Invalid request. Please check your details and try again.',
            GATEWAY_ERROR: 'Payment gateway error. Please try again later.',
            SERVER_ERROR: 'Server error. Please try again later.',
            AUTHENTICATION_ERROR: 'Authentication failed. Please contact support.',
            INVALID_ACCOUNT: 'Invalid bank account details. Please verify and try again.',
            INSUFFICIENT_FUNDS: 'Insufficient funds in payout account. Please contact support.',
            INVALID_VPA: 'Invalid UPI ID. Please verify and try again.',
        };

        return errorMap[error.code] || error.description || 'Payout failed. Please try again.';
    }
}

// Export singleton instance
export const razorpayService = new RazorpayService();
