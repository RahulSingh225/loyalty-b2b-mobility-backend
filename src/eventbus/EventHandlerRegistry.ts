/**
 * EventHandlerRegistry
 *
 * The central brain of the event-bus system.
 * On init(), it reads event_handler_config from the DB, groups handlers per event,
 * subscribes to each event on the MQ, and dispatches to the handler chain in priority order.
 */
import { db } from '../config/db';
import { eq, and, asc } from 'drizzle-orm';
import { eventHandlerConfig, eventMaster } from '../schema';
import { subscribe } from '../mq/mqService';
import { IEventHandler, EventPayload } from './IEventHandler';

/** In-memory handler config loaded from DB */
interface HandlerBinding {
  handlerName: string;
  priority: number;
  config: Record<string, any>;
}

export class EventHandlerRegistry {
  /** Map of handlerName → IEventHandler instance */
  private handlerMap = new Map<string, IEventHandler>();

  /** Map of eventKey → sorted handler bindings (loaded from DB) */
  private eventBindings = new Map<string, HandlerBinding[]>();

  /** Singleton */
  private static instance: EventHandlerRegistry;

  static getInstance(): EventHandlerRegistry {
    if (!EventHandlerRegistry.instance) {
      EventHandlerRegistry.instance = new EventHandlerRegistry();
    }
    return EventHandlerRegistry.instance;
  }

  /**
   * Register a handler class in the in-memory map.
   * This must be called before init() so the registry knows about available handlers.
   */
  registerHandler(handler: IEventHandler): void {
    if (this.handlerMap.has(handler.name)) {
      console.warn(`[EventBus] Handler "${handler.name}" already registered, overwriting.`);
    }
    this.handlerMap.set(handler.name, handler);
    console.log(`[EventBus] Handler registered: ${handler.name}`);
  }

  /**
   * Initialize the registry:
   * 1. Load all active handler configs from DB
   * 2. Subscribe to MQ for each event that has at least one handler
   */
  async init(): Promise<void> {
    console.log('[EventBus] Initializing EventHandlerRegistry...');

    const maxRetries = 5;
    const retryDelay = 5000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.loadBindings();
        await this.subscribeAll();
        console.log(`[EventBus] Initialization complete. ${this.eventBindings.size} events bound.`);
        return;
      } catch (error) {
        console.error(`[EventBus] Init attempt ${attempt} failed:`, error);
        if (attempt < maxRetries) {
          console.log(`[EventBus] Retrying in ${retryDelay / 1000}s...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('[EventBus] All initialization attempts failed.');
        }
      }
    }
  }

  /**
   * Load handler bindings from the event_handler_config table.
   */
  private async loadBindings(): Promise<void> {
    const rows = await db
      .select({
        eventKey: eventHandlerConfig.eventKey,
        handlerName: eventHandlerConfig.handlerName,
        priority: eventHandlerConfig.priority,
        config: eventHandlerConfig.config,
      })
      .from(eventHandlerConfig)
      .where(eq(eventHandlerConfig.isActive, true))
      .orderBy(asc(eventHandlerConfig.priority));

    this.eventBindings.clear();

    for (const row of rows) {
      // Warn if handler class not registered
      if (!this.handlerMap.has(row.handlerName)) {
        console.warn(`[EventBus] Handler "${row.handlerName}" in DB but not registered in code. Skipping.`);
        continue;
      }

      const bindings = this.eventBindings.get(row.eventKey) || [];
      bindings.push({
        handlerName: row.handlerName,
        priority: row.priority,
        config: (row.config as Record<string, any>) || {},
      });
      this.eventBindings.set(row.eventKey, bindings);
    }

    console.log(`[EventBus] Loaded bindings for events: [${Array.from(this.eventBindings.keys()).join(', ')}]`);
  }

  /**
   * Subscribe to each event on the MQ and wire up the handler chain.
   */
  private async subscribeAll(): Promise<void> {
    for (const [eventKey, bindings] of this.eventBindings.entries()) {
      console.log(`[EventBus] Subscribing: ${eventKey} → [${bindings.map(b => b.handlerName).join(', ')}]`);

      await subscribe(eventKey, async (rawPayload: any) => {
        // The raw payload from MQ is the EventPayload envelope
        const payload: EventPayload = {
          eventKey,
          userId: rawPayload?.userId,
          entityId: rawPayload?.entityId,
          metadata: rawPayload?.metadata || rawPayload,
          correlationId: rawPayload?.correlationId,
          timestamp: rawPayload?.timestamp || new Date().toISOString(),
        };

        await this.dispatch(eventKey, payload);
      });
    }
  }

  /**
   * Dispatch an event to all bound handlers in priority order.
   * Each handler runs in its own try/catch — a failing handler does NOT break the chain.
   */
  private async dispatch(eventKey: string, payload: EventPayload): Promise<void> {
    const bindings = this.eventBindings.get(eventKey);
    if (!bindings || bindings.length === 0) return;

    console.log(`[EventBus] Dispatching ${eventKey} to ${bindings.length} handler(s)`);

    for (const binding of bindings) {
      const handler = this.handlerMap.get(binding.handlerName);
      if (!handler) continue;

      try {
        // Check guard
        const should = await handler.shouldHandle(payload);
        if (!should) {
          console.log(`[EventBus] ${binding.handlerName} skipped for ${eventKey}`);
          continue;
        }

        await handler.handle(payload, binding.config);
        console.log(`[EventBus] ${binding.handlerName} completed for ${eventKey}`);
      } catch (err) {
        console.error(`[EventBus] ${binding.handlerName} FAILED for ${eventKey}:`, err);
        // Continue to next handler — do NOT break the chain
      }
    }
  }

  /**
   * Reload bindings from DB at runtime (e.g., after admin makes changes).
   * Re-subscribes to any new events.
   */
  async reload(): Promise<void> {
    console.log('[EventBus] Reloading handler bindings...');
    await this.loadBindings();
    await this.subscribeAll();
    console.log('[EventBus] Reload complete.');
  }
}
