import { z } from 'zod';

export type KycDocumentType = 'AADHAR' | 'PAN' | 'GST';

export interface KycVerificationResult {
    verified: boolean;
    data?: Record<string, any>;
    message?: string;
}

export class KycService {
    async verifyDocument(type: KycDocumentType, value: string): Promise<KycVerificationResult> {
        switch (type) {
            case 'AADHAR':
                return this.verifyAadhaar(value);
            case 'PAN':
                return this.verifyPan(value);
            case 'GST':
                return this.verifyGst(value);
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

    private async verifyPan(pan: string): Promise<KycVerificationResult> {
        // TODO: Integrate Vendor API
        // Fixed data points: Name, Type, Status
        console.log(`Verifying PAN: ${pan}`);

        const panRegex = /[A-Z]{5}[0-9]{4}[A-Z]{1}/;
        if (!panRegex.test(pan)) {
            return { verified: false, message: 'Invalid PAN Format' };
        }

        return {
            verified: true,
            data: {
                name: 'Mock User',
                status: 'VALID'
            }
        };
    }

    private async verifyGst(gst: string): Promise<KycVerificationResult> {
        // TODO: Integrate Vendor API
        console.log(`Verifying GST: ${gst}`);

        return {
            verified: true,
            data: {
                legalName: 'Mock Business',
                status: 'Active'
            }
        };
    }
}

export const kycService = new KycService();
