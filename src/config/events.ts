export const EVENT_TYPES = {
    // Ticketing
    TICKET_CREATE: 'TICKET_CREATE',
    TICKET_UPDATE: 'TICKET_UPDATE',

    // Earning
    SCAN_ATTEMPT: 'SCAN_ATTEMPT',
    SCAN_SUCCESS: 'SCAN_SUCCESS',
    SCAN_FAILED: 'SCAN_FAILED',

    // Onboarding
    USER_REGISTER: 'USER_REGISTER',
    KYC_VERIFY: 'KYC_VERIFY',
} as const;

export type EventType = keyof typeof EVENT_TYPES;
