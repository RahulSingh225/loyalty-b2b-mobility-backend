/**
 * EventPayload — the standard envelope every handler receives.
 * This is what gets published to the MQ and delivered to subscribers.
 */
export interface EventPayload {
  /** The event_master.event_key, e.g. 'USER_CREATED' */
  eventKey: string;

  /** The user who triggered the event (may be undefined for system events) */
  userId?: number;

  /** The primary entity affected (userId, qrId, redemptionId, etc.) */
  entityId?: string | number;

  /** Arbitrary metadata — procedures attach context here */
  metadata?: Record<string, any>;

  /** UUID linking all actions in a single procedure invocation */
  correlationId?: string;

  /** ISO timestamp of when the event was emitted */
  timestamp: string;
}

/**
 * IEventHandler — contract for every pluggable handler.
 *
 * Implement this interface to create a new handler, then register it
 * in the handler map (src/eventbus/index.ts) and add a row to
 * event_handler_config to bind it to one or more events.
 */
export interface IEventHandler {
  /** Unique name — must match event_handler_config.handler_name */
  readonly name: string;

  /**
   * Optional guard: return false to skip this handler for a given payload.
   * Default behavior (if not overridden) is to always handle.
   */
  shouldHandle(payload: EventPayload): boolean | Promise<boolean>;

  /**
   * Execute the handler's business logic.
   * @param payload - the event envelope
   * @param config - handler-specific config from event_handler_config.config JSONB
   */
  handle(payload: EventPayload, config: Record<string, any>): Promise<void>;
}
