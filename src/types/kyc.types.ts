/**
 * Type definitions for KYC Verification (PAN, GST, Bank Account, DigiLocker)
 */

// Common Response Interface
export interface KycVerificationResult {
    verified: boolean;
    data?: Record<string, any>;
    message?: string;
}

// -------------------- PAN Verification Types --------------------

export interface TenacioPanRequest {
    input: {
        panNumber: string;
        consent: boolean;
    };
}

export interface TenacioPanResponseData {
    panNumber: string;
    panStatus: string;
    fullName: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    dob?: string;
    gender?: string;
    email?: string;
    phoneNumber?: string;
    maskedAadhaar?: string;
    aadhaarLinked?: boolean;
    panCategory?: string;
    address?: any;
    panIssueDate?: string;
}

export interface TenacioPanResponse {
    status: string;
    requestId: string;
    data: TenacioPanResponseData | null;
    serviceStatusCode: number;
}

// -------------------- GST Verification Types --------------------

export interface TenacioGstRequest {
    input: {
        gstin: string;
        consent: boolean;
    };
}

export interface TenacioGstResponseData {
    gstin: string;
    legalName: string;
    tradeName?: string;
    gstinStatus: string;
    registrationDate?: string;
    constitutionOfBusiness?: string;
    taxPayerType?: string;
    panNumber?: string;
    // ... add other relevant fields as needed
    [key: string]: any;
}

export interface TenacioGstResponse {
    status: string;
    requestId: string;
    data: TenacioGstResponseData | null;
    serviceStatusCode: number;
}


// -------------------- Bank Account Verification Types --------------------

export interface TenacioBankRequest {
    input: {
        bankAccountNumber: string;
        ifscNumber: string;
        consent: boolean;
    };
}

export interface TenacioBankResponseData {
    accountExists: boolean;
    accountStatus: string;
    fullName: string; // Registered Name at bank
    bankName?: string;
    ifsc?: string;
    branch?: string;
    city?: string;
    state?: string;
    utr?: string;        // Payment Reference
    refId?: string;      // Vendor Ref ID
    // ... add other relevant fields
    [key: string]: any;
}

export interface TenacioBankResponse {
    status: string;
    requestId: string;
    data: TenacioBankResponseData | null;
    serviceStatusCode: number;
}

// -------------------- UPI Verification Types --------------------

export interface TenacioUpiRequest {
    input: {
        upiId: string;
        consent: boolean;
    };
}

export interface TenacioUpiResponseData {
    upiName: string;
    bankName?: string;
    branch?: string;
    mobile?: string;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    [key: string]: any;
}

export interface TenacioUpiResponse {
    status: string;
    requestId: string;
    type?: string;
    data: TenacioUpiResponseData | null;
    serviceStatusCode: number;
    vendorResponse?: any[];
}

// -------------------- DigiLocker Types --------------------

// NOTE: Some Digilocker types may duplicate what is in digilocker.types.ts
// Consider consolidating or importing. For now, defining strict structure here for service usage.

export interface TenacioDigilockerRequest {
    input: {
        redirectUrl: string;
        consent: boolean;
    };
}

export interface TenacioDigilockerResponse {
    status: 'success' | 'failed' | 'error';
    requestId: string;
    data?: {
        url: string;
        [key: string]: any;
    };
    message?: string;
    serviceStatusCode?: number;
}

// DigiLocker Fetch/Download Response (Session Based)
export interface TenacioDigilockerFetchRequest {
    input: {
        sessionToken: string;
        consent: boolean;
    };
}

export interface TenacioDigilockerFetchResponse {
    status: 'success' | 'failed' | 'error';
    requestId: string;
    data?: {
        name: string;
        dob: string;
        gender: string;
        address: {
            country: string;
            dist: string;
            state: string;
            po: string;
            loc: string;
            vtc: string;
            subdist: string;
            street: string;
            house: string;
            landmark: string;
        };
        photo: string; // Base64
        [key: string]: any;
    };
    serviceStatusCode?: number;
    serviceError?: {
        message: string;
        details?: any;
    };
}

// -------------------- Additional DigiLocker Types --------------------

/**
 * Third Party Verification Log Entry
 */
export interface ThirdPartyVerificationLog {
    id?: number;
    userId: number;
    verificationType: 'digilocker' | 'pan' | 'aadhaar' | 'gst' | 'bank_account' | 'upi' | 'digilocker_fetch';
    provider: 'tenacio' | 'signzy' | 'karza' | 'perfios';
    requestData: Record<string, any>;
    responseData: Record<string, any>;
    responseObject: Record<string, any>;
    metadata?: {
        httpStatus?: number;
        responseTimeMs?: number;
        errorMessage?: string;
        [key: string]: any;
    };
    createdAt?: string;
}

/**
 * DigiLocker Verification Status
 */
export type DigilockerVerificationStatus =
    | 'pending'
    | 'initiated'
    | 'completed'
    | 'failed'
    | 'expired';

/**
 * DigiLocker Callback Data
 */
export interface DigilockerCallbackData {
    requestId: string;
    status: DigilockerVerificationStatus;
    userData?: {
        name?: string;
        dob?: string;
        gender?: string;
        address?: string;
        photo?: string;
        [key: string]: any;
    };
    documents?: Array<{
        type: string;
        uri: string;
        name: string;
        [key: string]: any;
    }>;
    error?: {
        code: string;
        message: string;
    };
}

/**
 * Environment Variables for DigiLocker Integration
 */
export interface DigilockerEnvConfig extends NodeJS.ProcessEnv {
    TENACIO_BASE_URL: string;
    TENACIO_CLIENT_ID: string;
    TENACIO_API_KEY: string;
    TENACIO_WORKFLOW_ID: string;
    DIGILOCKER_REDIRECT_URL: string;
}

/**
 * DigiLocker Initiation Result
 */
export interface DigilockerInitiationResult {
    success: boolean;
    redirectUrl?: string;
    message?: string;
    error?: string;
}

/**
 * Extended Error for DigiLocker Operations
 */
export class DigilockerError extends Error {
    constructor(
        message: string,
        public code?: string,
        public httpStatus?: number,
        public details?: any
    ) {
        super(message);
        this.name = 'DigilockerError';
    }
}

/**
 * Type guard to check if environment variables are set
 */
export function hasDigilockerConfig(env: NodeJS.ProcessEnv): env is DigilockerEnvConfig {
    return !!(
        env.TENACIO_BASE_URL &&
        env.TENACIO_CLIENT_ID &&
        env.TENACIO_API_KEY &&
        env.TENACIO_WORKFLOW_ID &&
        env.DIGILOCKER_REDIRECT_URL
    );
}

export class TenacioResponse {
    resCode: number;
    resMessage: string;
    constructor(data: any) {
        this.resCode = data?.resCode || 400;
        this.resMessage = data?.resMessage || "Invalid request data";
    }
}

export class TenacioITRComplianceData {
    panNumber: string;
    maskedName: string;
    panAadhaarLinked: boolean;
    panStatus: string;
    validPan: boolean;
    compliant: boolean;
    specifiedPersonUnder206: string;
    panAllotmentDate: string;
    constructor(data: Partial<TenacioITRComplianceData>) {
        this.panNumber = data?.panNumber || ""
        this.maskedName = data?.maskedName || ""
        this.panAadhaarLinked = data?.panAadhaarLinked || false
        this.panStatus = data?.panStatus || ""
        this.validPan = data?.validPan || false
        this.compliant = data?.compliant || false
        this.specifiedPersonUnder206 = data?.specifiedPersonUnder206 || ""
        this.panAllotmentDate = data?.panAllotmentDate || ""
    }
}


export class TenacioITRComplianceRes extends TenacioResponse {
    resData: TenacioITRComplianceData | null;
    status: string
    requestId: string
    type: string
    serviceStatusCode: number | null;
    constructor(data: TenacioITRComplianceRes) {
        super(data);
        this.resData = data?.resData;
        this.status = data?.status;
        this.requestId = data?.requestId;
        this.type = data?.type;
        this.serviceStatusCode = data?.serviceStatusCode;
    }
}
