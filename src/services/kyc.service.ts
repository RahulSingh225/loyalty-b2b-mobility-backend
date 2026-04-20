import { z } from 'zod';
import axios from 'axios';
import { db } from '../config/db';
import { thirdPartyVerificationLogs, users, retailers, electricians, counterSales, approvalStatuses, userAssociations } from '../schema';
import { eq, desc, and } from 'drizzle-orm';
import { cacheMaster } from '../utils/masterCache';
import { APPROVAL_STATUS } from '../utils/approvalStatus';

import {
    KycVerificationResult,
    TenacioPanRequest,
    TenacioPanResponse,
    TenacioGstRequest,
    TenacioGstResponse,
    TenacioBankRequest,
    TenacioBankResponse,
    TenacioUpiRequest,
    TenacioUpiResponse,
    TenacioDigilockerRequest,
    TenacioDigilockerResponse,
    TenacioDigilockerFetchRequest,
    TenacioDigilockerFetchResponse,
    TenacioITRComplianceRes,
    TenacioResponse
} from '../types/kyc.types';

export type KycDocumentType = 'AADHAR' | 'PAN' | 'GST';

export class KycService {
    private tanacioBaseUrl: string;
    private tenacioAPIKey: string;
    private tenacioClientId: string;
    constructor() {
        this.tanacioBaseUrl = process.env.TENACIO_BASE_URL!;
        this.tenacioAPIKey = process.env.TENACIO_API_KEY!;
        this.tenacioClientId = process.env.TENACIO_CLIENT_ID!;
    }

    private async updateStatus(userId: number, statusName: string) {
        /* const statuses = await cacheMaster('approvalStatuses', async () => db.select().from(approvalStatuses).execute()); */
        const statuses = await db.select().from(approvalStatuses).execute();
        const statusId = statuses.find((s: any) => s.name === statusName)?.id;
        if (statusId) {
            await db.update(users).set({ approvalStatusId: statusId }).where(eq(users.id, userId));
        }
    }

    async verifyDocument(type: KycDocumentType, value: string, userId?: number): Promise<KycVerificationResult> {
        switch (type) {
            case 'AADHAR':
                return this.verifyAadhaar(value);
            case 'PAN':
                return this.verifyPan(value, userId);
            case 'GST':
                return this.verifyGst(value, userId);
            default:
                throw new Error('Unsupported Document Type');
        }
    }



    private async verifyAadhaar(aadhaar: string): Promise<KycVerificationResult> {
        // TODO: Integrate Vendor API
        // Fixed data points: Name, Address, DOB, Gender, District, State
        console.log(`Verifying Aadhaar: ${aadhaar}`);

        // Stub validation logic
        if (aadhaar.length !== 12) {
            return { verified: false, message: 'Invalid Aadhaar Format' };
        }

        return {
            verified: true,
            data: {
                name: 'Mock User',
                address: 'Mock Address',
                district: 'Mock District',
                state: 'Mock State'
            }
        };
    }

    private async verifyPan(pan: string, userId?: number): Promise<KycVerificationResult> {
        // Validate PAN format
        const panRegex: RegExp = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
        if (!panRegex.test(pan)) {
            return { verified: false, message: 'Invalid PAN Format' };
        }

        const url: string = `${process.env.TENACIO_BASE_URL}/api/v1/services/pan-advanced`;

        const requestPayload: TenacioPanRequest = {
            input: {
                panNumber: pan,
                consent: true,
            },
        };

        const headers: Record<string, string> = {
            "client-id": process.env.TENACIO_CLIENT_ID!,
            "x-api-key": process.env.TENACIO_API_KEY!,
            "workflow-id": process.env.TENACIO_PAN_WORKFLOW_ID!,
            "Content-Type": "application/json",
        };

        const startTime: number = Date.now();

        try {
            const response = await axios.post<TenacioPanResponse>(url, requestPayload, { headers });
            console.log(response)
            const responseTimeMs: number = Date.now() - startTime;

            const { status, requestId, data, serviceStatusCode } = response.data;

            // Persist log to third_party_verification_logs
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "pan",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: response.data as unknown as Record<string, unknown>,
                    responseObject: {
                        panData: data || null,
                    },
                    metadata: {
                        httpStatus: response.status,
                        responseTimeMs,
                        requestId,
                        serviceStatusCode,
                    },
                });
            }

            // Check if API call was successful and panStatus is "active"
            if (status !== "success" || !data) {
                return {
                    verified: false,
                    message: "PAN verification failed - No data returned from API"
                };
            }
            console.log('-----', data.panStatus)
            // Validate panStatus is "active"
            if (data.panStatus?.trim().toLowerCase() !== "active" && data.panStatus?.trim().toLowerCase() !== "valid") {
                return {
                    verified: false,
                    message: `PAN is not active. Current status: ${data.panStatus || 'unknown'}`,
                    data: {
                        panNumber: data.panNumber,
                        panStatus: data.panStatus,
                        fullName: data.fullName,
                    }
                };
            }

            // Update user's blockStatus to 'pan_verification' -> PAN_VERIFIED upon successful verification
            if (userId) {
                await this.updateStatus(userId, APPROVAL_STATUS.PAN_VERIFIED);
            }

            // Success - PAN is active
            return {
                verified: true,
                data: {
                    panNumber: data.panNumber,
                    fullName: data.fullName,
                    firstName: data.firstName,
                    middleName: data.middleName,
                    lastName: data.lastName,
                    dob: data.dob,
                    gender: data.gender,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    maskedAadhaar: data.maskedAadhaar,
                    aadhaarLinked: data.aadhaarLinked,
                    panStatus: data.panStatus,
                    panCategory: data.panCategory,
                    address: data.address,
                    panIssueDate: data.panIssueDate,
                }
            };



        } catch (error: any) {
            console.log(error)
            const responseTimeMs: number = Date.now() - startTime;

            // Persist failure log
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "pan",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: (error?.response?.data ?? {}) as Record<string, unknown>,
                    responseObject: {},
                    metadata: {
                        errorMessage: error.message,
                        httpStatus: error?.response?.status,
                        responseTimeMs,
                    },
                });
            }

            return {
                verified: false,
                message: `PAN verification failed: ${error.message || 'Unknown error'}`
            };
        }
    }

    private async verifyGst(gst: string, userId?: number): Promise<KycVerificationResult> {

        // Validate GST format (15 characters: 2 for state, 10 for PAN, 1 for entity, 1 for Z, 1 check digit)
        const gstRegex: RegExp = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gst)) {
            return { verified: false, message: 'Invalid GST Format' };
        }

        const url: string = `${process.env.TENACIO_BASE_URL}/api/v1/services/gst-basic`;

        const requestPayload: TenacioGstRequest = {
            input: {
                gstin: gst,
                consent: true,
            },
        };

        const headers: Record<string, string> = {
            "client-id": process.env.TENACIO_CLIENT_ID!,
            "x-api-key": process.env.TENACIO_API_KEY!,
            "workflow-id": process.env.TENACIO_GST_WORKFLOW_ID!,
            "Content-Type": "application/json",
        };

        const startTime = Date.now();

        try {
            console.log('Calling Tenacio GST API:', url, requestPayload);
            const response = await axios.post<TenacioGstResponse>(url, requestPayload, { headers });
            const responseTimeMs = Date.now() - startTime;

            const { status, requestId, data, serviceStatusCode } = response.data;

            // Persist log to third_party_verification_logs
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "gst",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: response.data,
                    responseObject: {
                        gstData: data || null,
                    },
                    metadata: {
                        httpStatus: response.status,
                        responseTimeMs,
                        requestId,
                        serviceStatusCode,
                    },
                });
            }

            // Check if API call was successful and gstinStatus is "Active"
            if (status !== "success" || !data) {
                return {
                    verified: false,
                    message: "GST verification failed - No data returned from API"
                };
            }

            // Validate gstinStatus is "Active"
            if (data.gstinStatus?.toLowerCase() !== "active") {
                return {
                    verified: false,
                    message: `GST is not active. Current status: ${data.gstinStatus || 'unknown'}`,
                    data: {
                        gstin: data.gstin,
                        gstinStatus: data.gstinStatus,
                        legalName: data.legalName,
                        tradeName: data.tradeName,
                    }
                };
            }

            // Update user's blockStatus to 'gst_number_verification' -> GST_NUMBER_VERIFIED upon successful verification
            if (userId) {
                await this.updateStatus(userId, APPROVAL_STATUS.GST_NUMBER_VERIFIED);
            }

            // Success - GST is active
            return {
                verified: true,
                data: {
                    gstin: data.gstin,
                    legalName: data.legalName,
                    tradeName: data.tradeName,
                    panNumber: data.panNumber,
                    constitutionOfBusiness: data.constitutionOfBusiness,
                    taxPayerType: data.taxPayerType,
                    gstinStatus: data.gstinStatus,
                    registrationDate: data.registrationDate,
                    cancellationDate: data.cancellationDate,
                    aadhaarValidation: data.aadhaarValidation,
                    eInvoicingStatus: data.eInvoicingStatus,
                    natureOfBusinessActivities: data.natureOfBusinessActivities,
                    natureOfCoreBusinessActivityCode: data.natureOfCoreBusinessActivityCode,
                    natureOfCoreBusinessActivityDescription: data.natureOfCoreBusinessActivityDescription,
                    jurisdiction: data.jurisdiction,
                    principalAddress: data.principalAddress,
                    additionalAddress: data.additionalAddress,
                    fieldVisitConducted: data.fieldVisitConducted,
                    hsnDetails: data.hsnDetails,
                }
            };


        } catch (error: any) {
            const responseTimeMs = Date.now() - startTime;

            // Persist failure log
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "gst",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: error?.response?.data ?? {},
                    responseObject: {},
                    metadata: {
                        errorMessage: error.message,
                        httpStatus: error?.response?.status,
                        responseTimeMs,
                    },
                });
            }

            return {
                verified: false,
                message: `GST verification failed: ${error.message || 'Unknown error'}`
            };
        }
    }

    private async verifyBankAccount(accountNumber: string, ifsc: string, userId?: number, updateBlockStatus: boolean = false): Promise<KycVerificationResult> {
        console.log(`Verifying Bank Account: ${accountNumber}, IFSC: ${ifsc}`);

        // Validate IFSC format (11 characters: 4 letters + 7 alphanumeric)
        const ifscRegex: RegExp = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!ifscRegex.test(ifsc)) {
            return { verified: false, message: 'Invalid IFSC Code Format' };
        }

        // Validate account number (basic validation - typically 9-18 digits)
        if (!accountNumber || accountNumber.length < 9 || accountNumber.length > 18) {
            return { verified: false, message: 'Invalid Bank Account Number' };
        }

        const url: string = `${process.env.TENACIO_BASE_URL}/api/v1/services/pennyless`;

        const requestPayload: TenacioBankRequest = {
            input: {
                bankAccountNumber: accountNumber,
                ifscNumber: ifsc,
                consent: true,
            },
        };

        const headers: Record<string, string> = {
            "client-id": process.env.TENACIO_CLIENT_ID!,
            "x-api-key": process.env.TENACIO_API_KEY!,
            "workflow-id": process.env.TENACIO_BANK_WORKFLOW_ID!,
            "Content-Type": "application/json",
        };

        const startTime = Date.now();

        try {
            console.log('Calling Tenacio Bank Verification API:', url, requestPayload);
            const response = await axios.post<TenacioBankResponse>(url, requestPayload, { headers });
            const responseTimeMs = Date.now() - startTime;

            const { status, requestId, data, serviceStatusCode } = response.data;

            // Persist log to third_party_verification_logs
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "bank_account",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: response.data,
                    responseObject: {
                        bankData: data || null,
                    },
                    metadata: {
                        httpStatus: response.status,
                        responseTimeMs,
                        requestId,
                        serviceStatusCode,
                    },
                });
            }

            // Check if API call was successful
            if (status !== "success" || !data) {
                return {
                    verified: false,
                    message: "Bank account verification failed - No data returned from API"
                };
            }

            // Validate accountExists is true
            if (!data.accountExists) {
                return {
                    verified: false,
                    message: "Bank account does not exist",
                    data: {
                        accountExists: data.accountExists,
                        accountStatus: data.accountStatus,
                    }
                };
            }

            // Validate accountStatus is "valid"
            if (data.accountStatus?.toLowerCase() !== "valid") {
                return {
                    verified: false,
                    message: `Bank account is not valid. Current status: ${data.accountStatus || 'unknown'}`,
                    data: {
                        accountExists: data.accountExists,
                        accountStatus: data.accountStatus,
                        fullName: data.fullName,
                    }
                };
            }

            // Check if fullName is present
            if (!data.fullName) {
                return {
                    verified: false,
                    message: "Bank account verification failed - Name not available",
                    data: {
                        accountExists: data.accountExists,
                        accountStatus: data.accountStatus,
                    }
                };
            }

            // Update user's blockStatus to 'bank_account_verified' -> BANK_ACCOUNT_VERIFIED upon successful verification IF requested
            if (userId && updateBlockStatus) {
                await this.updateStatus(userId, APPROVAL_STATUS.BANK_ACCOUNT_VERIFIED);
            }

            // Success - Bank account is valid
            return {
                verified: true,
                data: {
                    accountExists: data.accountExists,
                    accountStatus: data.accountStatus,
                    fullName: data.fullName,
                    bankName: data.bankName,
                    ifsc: data.ifsc,
                    branch: data.branch,
                    city: data.city,
                    state: data.state,
                    address: data.address,
                    micr: data.micr,
                    refId: data.refId,
                    utr: data.utr,
                }
            };


        } catch (error: any) {
            const responseTimeMs = Date.now() - startTime;

            // Persist failure log
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "bank_account",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: error?.response?.data ?? {},
                    responseObject: {},
                    metadata: {
                        errorMessage: error.message,
                        httpStatus: error?.response?.status,
                        responseTimeMs,
                    },
                });
            }

            return {
                verified: false,
                message: `Bank account verification failed: ${error.message || 'Unknown error'}`
            };
        }
    }

    private async verifyUpi(upiId: string, userId?: number): Promise<KycVerificationResult> {
        console.log(`Verifying UPI ID: ${upiId}`);

        const url: string = `${process.env.TENACIO_BASE_URL}/api/v1/services/upi-verification`;

        const requestPayload: TenacioUpiRequest = {
            input: {
                upiId: upiId,
                consent: true,
            },
        };

        const headers: Record<string, string> = {
            "client-id": process.env.TENACIO_CLIENT_ID!,
            "x-api-key": process.env.TENACIO_API_KEY!,
            "workflow-id": process.env.TENACIO_UPI_WORKFLOW_ID || 'a4e38b2d-55c3-4b50-a5b7-500d86c7b264',
            "Content-Type": "application/json",
        };

        const startTime = Date.now();

        try {
            console.log('Calling Tenacio UPI Verification API:', url, requestPayload);
            const response = await axios.post<TenacioUpiResponse>(url, requestPayload, { headers });
            const responseTimeMs = Date.now() - startTime;

            const { status, requestId, data, serviceStatusCode } = response.data;

            // Persist log to third_party_verification_logs
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "upi",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: response.data,
                    responseObject: {
                        upiData: data || null,
                    },
                    metadata: {
                        httpStatus: response.status,
                        responseTimeMs,
                        requestId,
                        serviceStatusCode,
                    },
                });
            }

            // Check if API call was successful
            if (status !== "success" || !data) {
                return {
                    verified: false,
                    message: "UPI verification failed - No data returned from API"
                };
            }

            // Return success with UPI data
            // Note: The example response doesn't show a 'status' field in 'data' like 'accountStatus' or 'panStatus'.
            // success is determined by the top-level 'status' field being "success".
            return {
                verified: true,
                data: {
                    upiName: data.upiName,
                    bankName: data.bankName,
                    branch: data.branch,
                    mobile: data.mobile,
                    address: data.address,
                    city: data.city,
                    district: data.district,
                    state: data.state,
                }
            };

        } catch (error: any) {
            const responseTimeMs = Date.now() - startTime;

            // Persist failure log
            if (userId) {
                await db.insert(thirdPartyVerificationLogs).values({
                    userId,
                    verificationType: "upi",
                    provider: "tenacio",
                    requestData: requestPayload,
                    responseData: error?.response?.data ?? {},
                    responseObject: {},
                    metadata: {
                        errorMessage: error.message,
                        httpStatus: error?.response?.status,
                        responseTimeMs,
                    },
                });
            }

            return {
                verified: false,
                message: `UPI verification failed: ${error.message || 'Unknown error'}`
            };
        }
    }

    /**
     * Public method to verify UPI for authenticated users
     * @param upiId UPI ID to verify
     * @param userId User ID for logging purposes
     */
    async verifyUpiId(upiId: string, userId: number): Promise<KycVerificationResult> {
        return this.verifyUpi(upiId, userId);
    }

    /**
     * Public method to verify PAN for authenticated users
     * @param pan PAN number to verify
     * @param userId User ID for logging purposes
     */
    async verifyPanNumber(pan: string, userId: number): Promise<KycVerificationResult> {
        return this.verifyPan(pan, userId);
    }

    /**
     * Public method to verify GST for authenticated users
     * @param gst GST number to verify
     * @param userId User ID for logging purposes
     */
    async verifyGstNumber(gst: string, userId: number): Promise<KycVerificationResult> {
        return this.verifyGst(gst, userId);
    }

    /**
     * Public method to verify Bank Account for authenticated users
     * @param accountNumber Bank account number to verify
     * @param ifsc IFSC code
     * @param userId User ID for logging purposes
     */
    async verifyBankAccountDetails(accountNumber: string, ifsc: string, userId: number, updateBlockStatus: boolean = false): Promise<KycVerificationResult> {
        return this.verifyBankAccount(accountNumber, ifsc, userId, updateBlockStatus);
    }

    async initiateDigilockerVerification(userId: number): Promise<string> {
        const url: string = `${process.env.TENACIO_BASE_URL}/api/v1/services/digilocker-generate-url`;
        const requestPayload: TenacioDigilockerRequest = {
            input: {
                redirectUrl: process.env.DIGILOCKER_REDIRECT_URL!,
                consent: true,
            },
        };
        const headers: Record<string, string> = {
            "client-id": process.env.TENACIO_CLIENT_ID!,
            "x-api-key": process.env.TENACIO_API_KEY!,
            "workflow-id": process.env.TENACIO_WORKFLOW_ID!,
            "Content-Type": "application/json",
        };

        const startTime: number = Date.now();

        try {
            const response = await axios.post<TenacioDigilockerResponse>(url, requestPayload, { headers });
            const responseTimeMs: number = Date.now() - startTime;

            const { status, requestId, data } = response.data;

            // ---- Persist success log ----
            await db.insert(thirdPartyVerificationLogs).values({
                userId,
                verificationType: "digilocker",
                provider: "tenacio",
                requestData: requestPayload,
                responseData: response.data,
                responseObject: {
                    url: data?.url,
                },
                metadata: {
                    httpStatus: response.status,
                    responseTimeMs,
                },
            });

            if (status !== "success" || !data?.url) {
                throw new Error("Failed to generate DigiLocker redirect URL");
            }

            // ✅ ONLY return redirect URL
            return data.url;

        } catch (error: any) {
            const responseTimeMs = Date.now() - startTime;

            // ---- Persist failure log ----
            await db.insert(thirdPartyVerificationLogs).values({
                userId,
                verificationType: "digilocker",
                provider: "tenacio",
                requestData: requestPayload,
                responseData: error?.response?.data ?? {},
                responseObject: {},
                metadata: {
                    errorMessage: error.message,
                    httpStatus: error?.response?.status,
                    responseTimeMs,
                },
            });

            throw new Error("DigiLocker initiation failed");
        }
    }

    async fetchDigilockerDetails(userId: number): Promise<any> {
        const url = `${process.env.TENACIO_BASE_URL}/api/v1/services/aadhaar-download`;

        const startTime = Date.now();

        try {
            // Fetch the latest DigiLocker session from third_party_verification_logs
            const latestSession = await db
                .select()
                .from(thirdPartyVerificationLogs)
                .where(and(
                    eq(thirdPartyVerificationLogs.userId, userId),
                    eq(thirdPartyVerificationLogs.verificationType, 'digilocker'),
                    eq(thirdPartyVerificationLogs.provider, 'tenacio')
                ))
                .orderBy(desc(thirdPartyVerificationLogs.createdAt))
                .limit(1);

            if (!latestSession || latestSession.length === 0) {
                throw new Error("No DigiLocker session found for this user");
            }


            // Extract requestId (session token) from the response data
            const responseData = latestSession[0].responseData as any;
            console.log(responseData)
            const sessionToken = responseData?.data?.sessionToken;

            if (!sessionToken) {
                throw new Error("Session token not found in the latest DigiLocker session");
            }

            const requestPayload: TenacioDigilockerFetchRequest = {
                input: {
                    sessionToken: sessionToken,
                    consent: true,
                },
            };

            const headers = {
                "client-id": process.env.TENACIO_CLIENT_ID!,
                "x-api-key": process.env.TENACIO_API_KEY!,
                "workflow-id": process.env.TENACIO_AADHAAR_DOWNLOAD_WORKFLOW_ID!,
                "Content-Type": "application/json",
            };

            console.log('Fetching DigiLocker details with session token:', sessionToken);
            console.log(url, requestPayload, headers)
            const response = await axios.post<TenacioDigilockerFetchResponse>(url, requestPayload, { headers });
            console.log('******', response, '*******')
            const responseTimeMs = Date.now() - startTime;

            const { status, data, serviceError, serviceStatusCode } = response.data;

            // ---- Persist log (both success and error responses) ----
            await db.insert(thirdPartyVerificationLogs).values({
                userId,
                verificationType: "digilocker_fetch",
                provider: "tenacio",
                requestData: requestPayload,
                responseData: response.data,
                responseObject: {
                    aadhaarData: data || null,
                    error: serviceError || null,
                },
                metadata: {
                    httpStatus: response.status,
                    responseTimeMs,
                    sessionToken,
                    status: status,
                    serviceStatusCode: serviceStatusCode || null,
                },
            });

            // Handle error status (e.g., DigiLocker journey not completed)
            if (status === "error") {
                return {
                    success: false,
                    status: "pending",
                    message: serviceError?.message || "DigiLocker verification not completed",
                    details: serviceError?.details || {},
                    serviceStatusCode: serviceStatusCode,
                };
            }

            // Handle missing data
            if (!data) {
                return {
                    success: false,
                    status: "failed",
                    message: "No data received from DigiLocker",
                };
            }

            // Update user's blockStatus to 'digilocker' -> DIGILOCKER_COMPLETED upon successful verification
            await this.updateStatus(userId, APPROVAL_STATUS.DIGILOCKER_COMPLETED);

            // Return successful Aadhaar data
            return {
                success: true,
                status: "completed",
                data: data,
            };

        } catch (error: any) {
            const responseTimeMs = Date.now() - startTime;

            // ---- Persist failure log ----
            await db.insert(thirdPartyVerificationLogs).values({
                userId,
                verificationType: "digilocker_fetch",
                provider: "tenacio",
                requestData: { input: { sessionToken: "unknown", consent: true } },
                responseData: error?.response?.data ?? {},
                responseObject: {},
                metadata: {
                    errorMessage: error.message,
                    httpStatus: error?.response?.status,
                    responseTimeMs,
                },
            });

            throw new Error(error.message || "DigiLocker details fetch failed");
        }
    }

    getITRDetails = async (panNumber: string) => {
        const url = `${this.tanacioBaseUrl}/api/v1/services/itr-compliance-check`;
        let payload = {
            input: {
                panNumber,
                consent: true
            }
        };

        const logData = {
            url,
            request: JSON.stringify(payload),
            response: "",
            createdAt: new Date(),
            createdBy: 0,
        };

        try {
            const res = await axios.post(url, payload, {
                headers: {
                    "client-id": this.tenacioClientId,
                    "x-api-key": this.tenacioAPIKey,
                    "workflow-id": process.env.TENACIO_ITR_FETCH_WFID!,
                    "Content-Type": "application/json",
                },
            });

            // const res:any = kycItrValidationSample; //sample

            const modifiedRes: TenacioResponse = {
                resCode: res?.data?.serviceStatusCode,
                resMessage: res?.data?.status,
            };
            logData.response = JSON.stringify(res?.data);
            // loggerRepository.serviceProviderInsert(logData);
            return new TenacioITRComplianceRes({ ...modifiedRes, resData: res?.data?.data, ...res?.data, });

        } catch (e: any) {
            logData.response = JSON.stringify(
                e?.response?.data?.message || e?.message || e
            );
            return new TenacioITRComplianceRes({
                resCode: e?.response?.data?.serviceStatusCode || 0,
                resMessage: e?.response?.data?.status || "unknown error",
                ...e?.response?.data?.data,
            });
        }

    };

    async tdsConsent(tenacioData: any, userDetails: any) {
        const validData = {
            aadhaarLinked: false,
            panValid: false,
            itr: false
        }

        // Check Tenacio response flags
        if (tenacioData?.validPan === true) {
            validData.panValid = true;
        }
        if (tenacioData?.panAadhaarLinked === true) {
            validData.aadhaarLinked = true;
        }
        if (tenacioData?.compliant === true) {
            validData.itr = true;
        }

        const tdsSlab = (
            validData.aadhaarLinked &&
            validData.itr &&
            validData.panValid
        ) ? 10 : 20;

        console.log(`[KycService] TDS Consent Calculation - User: ${userDetails.userId}, PAN: ${tenacioData?.panNumber}, Slab: ${tdsSlab}%, AadhaarLinked: ${validData.aadhaarLinked}, ITR: ${validData.itr}, PANValid: ${validData.panValid}`);

        return await db.transaction(async (tx) => {
            const updateData = {
                tdsConsent: true,
                tdsPercentage: tdsSlab,
            };

            // Attempt to update each table. Since userId is unique to a user, this is safe.
            // Using userDetails.userId which is the FK to users table.

            await tx.update(retailers)
                .set(updateData)
                .where(eq(retailers.userId, userDetails.userId));

            await tx.update(electricians)
                .set(updateData)
                .where(eq(electricians.userId, userDetails.userId));

            await tx.update(counterSales)
                .set(updateData)
                .where(eq(counterSales.userId, userDetails.userId));

            // Update user block status if needed? 
            // The prompt snippet suggests updating blockStatus.
            // We'll update it to 'PROFILE_UPDATED' as a safe default for completed KYC steps or 'pending_kyc_verification'
            // effectively 'completing' this step.

            // Using updateStatus helper requires cacheMaster, which isn't tied to this 'tx'.
            // To be safe and transactional, we should resolve ID here query inside 'tx' ?
            // 'cacheMaster' is accessible.

            // Update user block status
            const statuses = await db.select().from(approvalStatuses).execute();
            
            // Check if user is CSB by checking if 'attachedRetailerId' exists
            let statusId;
            if ('attachedRetailerId' in userDetails) {
                statusId = statuses.find((s: any) => s.name === APPROVAL_STATUS.CSB_PENDING_APPROVAL)?.id;
            } else {
                statusId = statuses.find((s: any) => s.name === APPROVAL_STATUS.ACTIVE)?.id;
            }

            if (statusId) {
                await tx.update(users)
                    .set({ approvalStatusId: statusId })
                    .where(eq(users.id, userDetails.userId));

                // Sync association status for CSB
                if ('attachedRetailerId' in userDetails) {
                    const statusName = statuses.find((s: any) => s.id === statusId)?.name;
                    if (statusName) {
                        await tx.update(userAssociations)
                            .set({ status: statusName, updatedAt: new Date().toISOString() })
                            .where(eq(userAssociations.childUserId, userDetails.userId));
                    }
                }
            }

            return {
                ...validData,
                panNumber: tenacioData?.panNumber,
                tdsSlabs: tdsSlab,
            }
        });
    }
}

export const kycService = new KycService();
