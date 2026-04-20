/**
 * Event Bus — Main Entry Point
 *
 * This module exports the singleton EventHandlerRegistry and provides
 * the initEventBus() function that should be called once at server startup.
 *
 * To add a new handler:
 * 1. Create a class implementing IEventHandler in ./handlers/
 * 2. Import and register it in the HANDLER_CLASSES array below
 * 3. Insert rows in event_handler_config to bind it to events
 */
import { EventHandlerRegistry } from './EventHandlerRegistry';

// --- Import all handler classes ---
import { AuditLogHandler } from './handlers/AuditLogHandler';
import { NotificationHandler } from './handlers/NotificationHandler';
import { WelcomeBonusHandler } from './handlers/WelcomeBonusHandler';
import { ReferralBonusHandler } from './handlers/ReferralBonusHandler';

// --- Export types ---
export { EventPayload, IEventHandler } from './IEventHandler';
export { EventHandlerRegistry } from './EventHandlerRegistry';

/**
 * All available handler classes.
 * Add new handler classes here to make them available for DB binding.
 */
const HANDLER_CLASSES = [
  new AuditLogHandler(),
  new NotificationHandler(),
  new WelcomeBonusHandler(),
  new ReferralBonusHandler(),
];

/**
 * Initialize the event bus system.
 * Call this once at server startup after MQ is initialized.
 */
export async function initEventBus(): Promise<EventHandlerRegistry> {
  const registry = EventHandlerRegistry.getInstance();

  // Register all handler instances
  for (const handler of HANDLER_CLASSES) {
    registry.registerHandler(handler);
  }

  // Load bindings from DB and subscribe to MQ
  await registry.init();

  return registry;
}
