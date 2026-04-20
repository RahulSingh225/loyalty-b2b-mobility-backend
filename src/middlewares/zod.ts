import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { otpType } from '../schema';

/**
 * Generic middleware to validate request body against a Zod schema
 * @param schema - The Zod schema to validate against
 * @returns Express middleware function
 */
export const validateBody = (schema: z.ZodSchema) => {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: error.errors.map(err => ({
                        path: err.path.join('.'),
                        message: err.message
                    }))
                });
            }
            next(error);
        }
    };
};

export const LoginWithPasswordSchema = z.object({
    phone: z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(10, 'Phone number is too long'),

    password: z
        .string()
        .optional()
        .refine(v => !v || v.length >= 8, 'Password must be at least 8 characters long')
        .refine(v => !v || /[A-Z]/.test(v), 'Password must contain at least one uppercase letter')
        .refine(v => !v || /[a-z]/.test(v), 'Password must contain at least one lowercase letter')
        .refine(v => !v || /\d/.test(v), 'Password must contain at least one number')
        .refine(v => !v || /[@$!%*?&]/.test(v), 'Password must contain at least one special character'),

    fcmToken: z.string().optional(),
});

// RegisterSchema removed in favor of OnboardingInputSchema

export const VerifyOtpSchema = z.object({
    phone: z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(20, 'Phone number is too long'),

    otp: z
        .string()
        .length(6, 'OTP must be exactly 6 digits')
        .regex(/^\d+$/, 'OTP must contain only digits'),

    purpose: z.enum(['login', 'password_reset', 'registration', 'kyc']),
}).strict();

export const SetPinSchema = z.object({
    pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'PIN must contain only digits'),
});

export const LoginWithPinSchema = z.object({
    phone: z.string().min(10, 'Phone number must be at least 10 digits').max(10, 'Phone number is too long'),
    pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'PIN must contain only digits'),
    fcmToken: z.string().optional(),
});

export const ScanQrSchema = z.object({
    qrCode: z.string().min(1, 'QR code is required'),
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
    metadata: z.record(z.any()).optional()
});

// Ticket Schemas
export const TicketInputSchema = z.object({
    typeId: z.number(),
    subject: z.string().optional(),
    description: z.string().min(1, 'Description is required'),
    priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
    imageUrl: z.string().optional(),
    videoUrl: z.string().optional(),
    metadata: z.record(z.any()).optional(),
});

export const TicketUpdateSchema = z.object({
    statusId: z.number().optional(),
    priority: z.enum(['Low', 'Medium', 'High']).optional(),
    resolutionNotes: z.string().optional(),
    assigneeId: z.number().optional(),
    metadata: z.record(z.any()).optional(),
});

// User Association Schemas
export const CreateAssociationSchema = z.object({
    retailerUserId: z.number().int().positive({
        message: 'Retailer user ID must be a positive integer'
    })
});

export const UpdateAssociationStatusSchema = z.object({
    status: z.enum(['active', 'inactive', 'deactive', 'rejected', 'CSB_PENDING_APPROVAL', 'CSB_APPROVED', 'CSB_REJECTED', 'CSB_ACTIVE', 'CSB_INACTIVE'], {
        errorMap: () => ({ message: 'Status must be one of: active, inactive, deactive, rejected, CSB_PENDING_APPROVAL, CSB_APPROVED, CSB_REJECTED, CSB_ACTIVE, CSB_INACTIVE' })
    })
});

const PhoneSchema = z
    .string()
    .min(10, 'Phone number must be at least 10 digits')
    .max(10, 'Phone number must be at most 10 digits');

export const LoginSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('password'),
        phone: PhoneSchema,
        password: z.string().min(1, 'Password is required'),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        fcmToken: z.string().optional(),
    }),
    z.object({
        type: z.literal('otp'),
        phone: PhoneSchema,
        otp: z.string().min(4, 'OTP must be at least 4 digits'),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        fcmToken: z.string().optional(),
    }),
    z.object({
        type: z.literal('pin'),
        phone: PhoneSchema,
        pin: z.string().length(6, 'PIN must be exactly 6 digits').regex(/^\d+$/, 'PIN must contain only digits'),
        ip: z.string().optional(),
        userAgent: z.string().optional(),
        fcmToken: z.string().optional(),
    }),
]);

export const LoginResponseSchema = z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
});

export const ResetPasswordRequestSchema = z.object({
    phone: PhoneSchema,
    channel: z.enum(['sms', 'email']),
});

export const ResetPasswordConfirmSchema = z.object({
    phone: PhoneSchema,
    otp: z.string().min(4, 'OTP must be at least 4 digits'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/\d/, 'Password must contain at least one number')
        .regex(/[@$!%*?&]/, 'Password must contain at least one special character'),
});

export const SendOtpSchema = z.object({
    phone: z
        .string()
        .min(10, 'Phone number must be at least 10 digits')
        .max(10, 'Phone number is too long'),

    channel: z.enum(['sms', 'email']),
    purpose: z.enum(['login', 'password_reset', 'registration', 'kyc']).default('password_reset'),
});

export const OnboardingInputSchema = z.object({
    name: z.string().min(1).optional(),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    userType: z.enum(['retailer', 'electrician', 'counter_staff']),
    onboardingType: z.enum(['self', 'admin', 'api']).default('self'),

    // Common optional fields
    aadhaar: z.string().optional(),
    pan: z.string().optional(),
    gst: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    dob: z.string().optional(), // ISO date string
    referralCode: z.string().optional(),

    // Specific fields
    shopName: z.string().optional(), // For Retailer/Counter
    electricianCertificate: z.string().optional(), // For Electrician
    attachedRetailerId: z.number().optional(), // For Counter Staff

    // External
    sapCustomerCode: z.string().optional(),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/\d/, 'Password must contain at least one number')
        .regex(/[@$!%*?&]/, 'Password must contain at least one special character'),
});

export const VerifyPanSchema = z.object({
    panNumber: z
        .string()
        .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format. Expected format: ABCDE1234F'),
});

export const VerifyGstSchema = z.object({
    gstNumber: z
        .string()
        .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GST format. Expected format: 27AAACR5055K1Z7'),
});

export const VerifyBankAccountSchema = z.object({
    accountNumber: z.string().min(9, 'Account number must be at least 9 digits').max(18, 'Account number must be at most 18 digits'),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, 'Invalid IFSC code format. Expected format: KKBK0008073'),
});

export type OnboardingInput = z.infer<typeof OnboardingInputSchema>;
export type SendOtpInput = z.infer<typeof SendOtpSchema>;
export type LoginResult = z.infer<typeof LoginResponseSchema>;
export type LoginWithPasswordDTO = z.infer<typeof LoginWithPasswordSchema>;
export type SetPinInput = z.infer<typeof SetPinSchema>;
export type LoginWithPinInput = z.infer<typeof LoginWithPinSchema>;
export type CreateAssociationInput = z.infer<typeof CreateAssociationSchema>;
export type UpdateAssociationStatusInput = z.infer<typeof UpdateAssociationStatusSchema>;
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;
export type LoginWithPasswordInput = z.infer<typeof LoginWithPasswordSchema>;
export type ScanQrInput = z.infer<typeof ScanQrSchema>;
export type TicketInput = z.infer<typeof TicketInputSchema>;
export type TicketUpdate = z.infer<typeof TicketUpdateSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type ResetPasswordRequestInput = z.infer<typeof ResetPasswordRequestSchema>;
export type ResetPasswordConfirmInput = z.infer<typeof ResetPasswordConfirmSchema>;
export type VerifyPanInput = z.infer<typeof VerifyPanSchema>;
export type VerifyGstInput = z.infer<typeof VerifyGstSchema>;
export type VerifyBankAccountInput = z.infer<typeof VerifyBankAccountSchema>;

export const VerifyUpiSchema = z.object({
    upiId: z.string().min(3, 'UPI ID is too short').regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI ID format'),
});

export type VerifyUpiInput = z.infer<typeof VerifyUpiSchema>;
