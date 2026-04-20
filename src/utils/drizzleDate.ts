import { sql, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";
import { ColumnBaseConfig } from "drizzle-orm";
import { PgTimestampBuilder } from "drizzle-orm/pg-core/columns/timestamp";

/**
 * Type-safe date comparison utilities for Drizzle ORM
 */

// Correct way to define a timestamp column type
export type DateColumn = PgColumn<
  ColumnBaseConfig<"string", string> & {
    hasDefault: boolean;
    notNull: boolean;
    data: string;
    driverParam: string;
    enumValues: undefined;
    // You can adjust these based on your actual column configuration
  }
>;

// Or simpler: Use the built-in timestamp type helper
type TimestampColumn = ReturnType<typeof import("drizzle-orm/pg-core").timestamp>;

// Even simpler: Use AnyColumn or SQLWrapper for flexibility
export const drizzleDate = {
  /**
   * Type-safe greater than or equal to date comparison
   */
  gte(column: any, date: Date | string): SQL {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return sql`${column} >= ${dateStr}::timestamp`;
  },

  /**
   * Type-safe less than or equal to date comparison
   */
  lte(column: any, date: Date | string): SQL {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return sql`${column} <= ${dateStr}::timestamp`;
  },

  /**
   * Type-safe less than date comparison (exclusive)
   */
  lt(column: any, date: Date | string): SQL {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return sql`${column} < ${dateStr}::timestamp`;
  },

  /**
   * Type-safe greater than date comparison (exclusive)
   */
  gt(column: any, date: Date | string): SQL {
    const dateStr = typeof date === 'string' ? date : date.toISOString();
    return sql`${column} > ${dateStr}::timestamp`;
  },

  /**
   * Type-safe date between (inclusive start, exclusive end)
   */
  between(
    column: any, 
    startDate: Date | string, 
    endDate: Date | string
  ): SQL {
    const startStr = typeof startDate === 'string' ? startDate : startDate.toISOString();
    const endStr = typeof endDate === 'string' ? endDate : endDate.toISOString();
    
    return sql`${column} >= ${startStr}::timestamp AND ${column} < ${endStr}::timestamp`;
  },

  /**
   * Format date for PostgreSQL timestamp
   */
  format(date: Date): string {
    return date.toISOString();
  },

  /**
   * Format date for PostgreSQL date (without time)
   */
  formatDateOnly(date: Date): string {
    return date.toISOString().split('T')[0];
  },

  /**
   * Get start of day (00:00:00)
   */
  startOfDay(date: Date): string {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  },

  /**
   * Get end of day (23:59:59.999)
   */
  endOfDay(date: Date): string {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.toISOString();
  },

  /**
   * Get current timestamp
   */
  now(): SQL {
    return sql`CURRENT_TIMESTAMP`;
  },

  /**
   * Add days to a date
   */
  addDays(date: Date | string, days: number): string {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() + days);
    return d.toISOString();
  },

  /**
   * Subtract days from a date
   */
  subtractDays(date: Date | string, days: number): string {
    const d = typeof date === 'string' ? new Date(date) : new Date(date);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }
};