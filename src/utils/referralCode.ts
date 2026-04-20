import db from '../config/db';
import { AppError } from '../middlewares/errorHandler';
import { users } from '../schema';
import { eq } from 'drizzle-orm';


/**
 * Generates a unique alphanumeric referral code
 * Format: [PREFIX] + [Random characters]
 * Default Length: 8 random characters
 * 
 * This function generates codes and checks the database until it finds a unique one.
 */
export async function generateUniqueReferralCode(prefix: string = ''): Promise<string> {
    const CHARACTERS = 'ABCDEFGHJKMNOPQRSTUVWXYZ123456789';
    const RANDOM_LENGTH = 8;
    const MAX_ATTEMPTS = 10;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        // Generate random code
        let randomPart = '';
        for (let i = 0; i < RANDOM_LENGTH; i++) {
            const randomIndex = Math.floor(Math.random() * CHARACTERS.length);
            randomPart += CHARACTERS[randomIndex];
        }

        const code = (prefix ? prefix.toUpperCase() : '') + randomPart;

        // Check if code already exists in database
        const [existingUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.referralCode, code))
            .limit(1);

        // If code doesn't exist, return it
        if (!existingUser) {
            return code;
        }

        // If code exists, loop will continue and generate a new one
    }

    // If we couldn't generate a unique code after MAX_ATTEMPTS, throw an error
    throw new AppError(
        'Unable to generate referral code, please try again',
        500
    );
}

