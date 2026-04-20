/**
 * Seed: event_handler_config
 *
 * Run with: npx tsx src/seed/seedEventHandlerConfig.ts
 *
 * This seeds the event_handler_config table with the default handler bindings.
 * Each row maps an event_key to a handler class with a priority and optional config.
 *
 * Priority: lower = runs first. Convention:
 *   0  = AuditLogHandler (always first — log before anything else)
 *   10 = Business logic handlers (bonuses, referrals, etc.)
 *   20 = NotificationHandler (send comms after logic is done)
 */
import 'dotenv/config';
import { db } from '../config/db';
import { eventHandlerConfig } from '../schema';
import { sql } from 'drizzle-orm';

const SEED_DATA = [
  // ─── USER LIFECYCLE ──────────────────────────────────────────
  // USER_REGISTRATION (intent — just audit)
  { eventKey: 'USER_REGISTRATION', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // USER_CREATED — audit + welcome bonus + notification
  { eventKey: 'USER_CREATED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_CREATED', handlerName: 'WelcomeBonusHandler', priority: 10, config: { bonusPoints: 100 } },
  { eventKey: 'USER_CREATED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // USER_APPROVED
  { eventKey: 'USER_APPROVED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_APPROVED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // USER_BLOCK
  { eventKey: 'USER_BLOCK', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_BLOCK', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // ─── KYC ─────────────────────────────────────────────────────
  { eventKey: 'USER_KYC_SUBMITTED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_KYC_SUBMITTED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // USER_KYC_APPROVED — audit + welcome bonus + referral bonus + notification
  { eventKey: 'USER_KYC_APPROVED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_KYC_APPROVED', handlerName: 'WelcomeBonusHandler', priority: 10, config: { bonusPoints: 100 } },
  { eventKey: 'USER_KYC_APPROVED', handlerName: 'ReferralBonusHandler', priority: 15, config: { bonusPoints: 500 } },
  { eventKey: 'USER_KYC_APPROVED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'USER_KYC_REJECT', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_KYC_REJECT', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // ─── OTP ─────────────────────────────────────────────────────
  { eventKey: 'USER_SIGNUP_OTP', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_SIGNUP_OTP', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'USER_LOGIN_OTP', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_LOGIN_OTP', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'USER_PASSWORD_RESET_OTP', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_PASSWORD_RESET_OTP', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'USER_KYC_OTP', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'USER_KYC_OTP', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // ─── SCANNING & EARNING ──────────────────────────────────────
  { eventKey: 'SCAN_ATTEMPT', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  { eventKey: 'SCAN_SUCCESS', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'SCAN_SUCCESS', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'SCAN_FAILED', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  { eventKey: 'EARNING_SCAN', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'EARNING_SCAN', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'REGISTRATION_BONUS', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'REFERRAL_EARNING', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // ─── TICKETS ─────────────────────────────────────────────────
  { eventKey: 'TICKET_CREATE', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'TICKET_CREATE', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'TICKET_ASSIGNED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'TICKET_ASSIGNED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'TICKET_CLOSED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'TICKET_CLOSED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // ─── REDEMPTION ──────────────────────────────────────────────
  { eventKey: 'REDEMPTION_REQUEST', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'REDEMPTION_REQUEST', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'REDEMPTION_APPROVE', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'REDEMPTION_APPROVE', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'REDEMPTION_REJECT', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'REDEMPTION_REJECT', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'REDEMPTION_REJECTED', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // ─── PAYOUT ──────────────────────────────────────────────────
  { eventKey: 'PAYOUT_INITIATED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'PAYOUT_INITIATED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  { eventKey: 'PAYOUT_FAILED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'PAYOUT_FAILED', handlerName: 'NotificationHandler', priority: 20, config: {} },

  // ─── QR BATCH ────────────────────────────────────────────────
  { eventKey: 'QR_BATCH_CREATED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'QR_BATCH_PROCESSED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'QR_BATCH_FAILED', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // ─── ADMIN ───────────────────────────────────────────────────
  { eventKey: 'ADMIN_LOGIN', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'ADMIN_HIEARCHY_CREATED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'ADMIN_MANUAL_TRANSACTION_ENTRY', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // ─── CONFIG CHANGES ──────────────────────────────────────────
  { eventKey: 'SKU_POINT_CHANGE', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'SKU_RULE_MODIFY', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'MEMBER_MASTER_CONFIG_UPDATE', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'LOCATION_LEVEL_CHANGED', handlerName: 'AuditLogHandler', priority: 0, config: {} },

  // ─── PROFILE & MISC ─────────────────────────────────────────
  { eventKey: 'PROFILE_UPDATE', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'TDS_CONSENT', handlerName: 'AuditLogHandler', priority: 0, config: {} },
  { eventKey: 'ACCOUNT_DELETION_REQUESTED', handlerName: 'AuditLogHandler', priority: 0, config: {} },
];

async function seed() {
  console.log('Seeding event_handler_config...');

  for (const row of SEED_DATA) {
    try {
      await db.insert(eventHandlerConfig).values({
        eventKey: row.eventKey,
        handlerName: row.handlerName,
        priority: row.priority,
        config: row.config,
        isActive: true,
      }).onConflictDoNothing();
    } catch (err: any) {
      // Skip duplicates silently
      if (err?.code === '23505') continue;
      console.error(`Failed to seed ${row.eventKey}/${row.handlerName}:`, err);
    }
  }

  console.log(`Seeded ${SEED_DATA.length} event_handler_config rows.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
