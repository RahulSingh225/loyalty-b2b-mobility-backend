// Razorpay Configuration
// Loads environment variables for Razorpay API integration

export const razorpayConfig = {
    // API Credentials
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',

    // Account Configuration
    accountNumber: process.env.RAZORPAY_ACCOUNT_NUMBER || '',

    // Webhook Configuration
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',

    // Payout Defaults
    defaults: {
        currency: 'INR',
        purpose: process.env.RAZORPAY_DEFAULT_PURPOSE || 'refund',
        bankTransferMode: process.env.RAZORPAY_DEFAULT_BANK_MODE || 'NEFT',
        queueIfLowBalance: false,
    },

    // API Configuration
    api: {
        baseUrl: 'https://api.razorpay.com/v1',
        timeout: 30000, // 30 seconds
    },

    // Feature Flags
    enableWebhookVerification: process.env.RAZORPAY_VERIFY_WEBHOOK !== 'false',
    enableIdempotency: process.env.RAZORPAY_ENABLE_IDEMPOTENCY !== 'false',
};

// Validate required configuration
export const validateRazorpayConfig = (): void => {
    const required = ['keyId', 'keySecret', 'accountNumber'];
    const missing = required.filter(key => !razorpayConfig[key as keyof typeof razorpayConfig]);

    if (missing.length > 0) {
        console.warn(`[Razorpay] Missing configuration: ${missing.join(', ')}`);
        console.warn('[Razorpay] Some features may not work correctly');
    }

    if (!razorpayConfig.webhookSecret && razorpayConfig.enableWebhookVerification) {
        console.warn('[Razorpay] Webhook secret not configured. Webhook signature verification will fail.');
    }
};

// Auto-validate on import
validateRazorpayConfig();
