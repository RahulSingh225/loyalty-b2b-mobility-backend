import { sql, SQL } from "drizzle-orm";
import { PgColumn } from "drizzle-orm/pg-core";

/**
 * Helper functions for date comparisons with Drizzle ORM
 */

export const dateHelpers = {
  /**
   * Create a SQL condition for date >= fromDate
   */
  gteDate(column: PgColumn, dateString: string): SQL {
    return sql`${column} >= ${dateString}::timestamp`;
  },

  /**
   * Create a SQL condition for date <= toDate
   */
  lteDate(column: PgColumn, dateString: string): SQL {
    return sql`${column} <= ${dateString}::timestamp`;
  },

  /**
   * Create a SQL condition for date between fromDate and toDate (inclusive)
   */
  betweenDate(column: PgColumn, fromDate: string, toDate: string): SQL {
    const nextDay = new Date(toDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const nextDayString = nextDay.toISOString().split('T')[0];
    
    return sql`${column} >= ${fromDate}::timestamp AND ${column} < ${nextDayString}::timestamp`;
  },

  /**
   * Format date for SQL queries
   */
  formatForSQL(date: Date | string): string {
    if (typeof date === 'string') {
      return date;
    }
    return date.toISOString().split('T')[0];
  }
};