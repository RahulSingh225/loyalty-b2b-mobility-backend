// mqService.ts — Unified Event Bus MQ Layer
import { BaseMQConnector } from './baseMQConnector';
import { RabbitMQConnector } from './rabbitmqConnector';
import { BullMQConnector } from './bullmqConnector';
import { v4 as uuidv4 } from 'uuid';

/**
 * All known event keys.
 * These match event_master.event_key exactly — no more dot-notation mapping.
 */
export const EVENT_KEYS = {
  // User lifecycle
  USER_SIGNUP_OTP: 'USER_SIGNUP_OTP',
  USER_REGISTRATION: 'USER_REGISTRATION',
  USER_REGISTERED: 'USER_REGISTERED',
  USER_CREATED: 'USER_CREATED',
  USER_APPROVED: 'USER_APPROVED',
  USER_BLOCK: 'USER_BLOCK',
  USER_SCAN_BLOCK: 'USER_SCAN_BLOCK',
  USER_REDEMPTION_BLOCK: 'USER_REDEMPTION_BLOCK',
  USER_LOGIN_OTP: 'USER_LOGIN_OTP',
  USER_PASSWORD_RESET_OTP: 'USER_PASSWORD_RESET_OTP',

  // KYC
  USER_KYC_OTP: 'USER_KYC_OTP',
  USER_KYC_SUBMITTED: 'USER_KYC_SUBMITTED',
  USER_KYC_APPROVED: 'USER_KYC_APPROVED',
  USER_KYC_REJECT: 'USER_KYC_REJECT',

  // Profile
  PROFILE_UPDATE: 'PROFILE_UPDATE',

  // Account
  ACCOUNT_DELETION_REQUESTED: 'ACCOUNT_DELETION_REQUESTED',

  // Scanning & Earning
  SCAN_ATTEMPT: 'SCAN_ATTEMPT',
  SCAN_SUCCESS: 'SCAN_SUCCESS',
  SCAN_FAILED: 'SCAN_FAILED',
  EARNING_SCAN: 'EARNING_SCAN',
  EARNING_OTHER: 'EARNING_OTHER',
  REGISTRATION_BONUS: 'REGISTRATION_BONUS',
  REFERRAL_EARNING: 'REFERRAL_EARNING',

  // Ticketing
  TICKET_CREATE: 'TICKET_CREATE',
  TICKET_ASSIGNED: 'TICKET_ASSIGNED',
  TICKET_CLOSED: 'TICKET_CLOSED',

  // Redemption
  REDEMPTION_REQUEST: 'REDEMPTION_REQUEST',
  REDEMPTION_APPROVE: 'REDEMPTION_APPROVE',
  REDEMPTION_REJECT: 'REDEMPTION_REJECT',
  REDEMPTION_REJECTED: 'REDEMPTION_REJECTED',

  // Payout
  PAYOUT_INITIATED: 'PAYOUT_INITIATED',
  PAYOUT_FAILED: 'PAYOUT_FAILED',

  // QR Batch
  QR_BATCH_CREATED: 'QR_BATCH_CREATED',
  QR_BATCH_PROCESSED: 'QR_BATCH_PROCESSED',
  QR_BATCH_FAILED: 'QR_BATCH_FAILED',

  // Admin
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  ADMIN_HIEARCHY_CREATED: 'ADMIN_HIEARCHY_CREATED',
  ADMIN_MANUAL_TRANSACTION_ENTRY: 'ADMIN_MANUAL_TRANSACTION_ENTRY',

  // SKU
  SKU_POINT_CHANGE: 'SKU_POINT_CHANGE',
  SKU_RULE_MODIFY: 'SKU_RULE_MODIFY',

  // Config
  MEMBER_MASTER_CONFIG_UPDATE: 'MEMBER_MASTER_CONFIG_UPDATE',
  LOCATION_LEVEL_CHANGED: 'LOCATION_LEVEL_CHANGED',
  KYC_APPROVE: 'KYC_APPROVE',
  TDS_CONSENT: 'TDS_CONSENT',
} as const;

export type EventKey = typeof EVENT_KEYS[keyof typeof EVENT_KEYS];

/**
 * Standard event payload that flows through the MQ.
 */
export interface EventEnvelope {
  eventKey: string;
  userId?: number;
  entityId?: string | number;
  metadata?: Record<string, any>;
  correlationId: string;
  timestamp: string;
}

// ─── MQ Connector Singleton ─────────────────────────────────────────────

let connector: BaseMQConnector | null = null;

export const initMQ = () => {
  if (!connector) {
    const driver = process.env.MQ_DRIVER || 'rabbit';
    connector = driver === 'bullmq' ? new BullMQConnector() : new RabbitMQConnector();
  }
  return connector;
};

/**
 * Low-level publish to the MQ.
 */
export const publish = (topic: string, payload: any) =>
  initMQ().publish(topic, payload).catch(e => console.error(e));

/**
 * Low-level subscribe on the MQ.
 */
export const subscribe = (topic: string, handler: (payload: any) => Promise<void>) =>
  initMQ().subscribe(topic, handler).catch(e => console.error(e));

/**
 * emit() — High-level event emitter for procedures.
 *
 * Constructs the standard EventEnvelope and publishes to the MQ.
 * This is the ONLY function procedures should call to fire events.
 */
export function emit(
  eventKey: string,
  opts: {
    userId?: number;
    entityId?: string | number;
    metadata?: Record<string, any>;
    correlationId?: string;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Promise<void> {
  const envelope: EventEnvelope = {
    eventKey,
    userId: opts.userId,
    entityId: opts.entityId,
    metadata: {
      ...opts.metadata,
      ipAddress: opts.ipAddress,
      userAgent: opts.userAgent,
    },
    correlationId: opts.correlationId || uuidv4(),
    timestamp: new Date().toISOString(),
  };

  console.log(`[MQ] emit: ${eventKey} (user=${opts.userId}, entity=${opts.entityId})`);
  return publish(eventKey, envelope);
}

// ─── Backward Compatibility ─────────────────────────────────────────────
// Keep BUS_EVENTS as an alias so existing code doesn't break during migration
/** @deprecated Use EVENT_KEYS instead */
export const BUS_EVENTS = EVENT_KEYS;