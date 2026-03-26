/**
 * Logger utility - suppresses debug/info logs in production builds.
 * Keeps warn and error logs always available.
 */

const isDev = process.env.NODE_ENV === "development";

export const logger = {
  /** Debug-level log, only shown in development */
  debug: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },

  /** Info-level log, only shown in development */
  info: (...args: unknown[]) => {
    if (isDev) console.info(...args);
  },

  /** Warning-level log, always shown */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },

  /** Error-level log, always shown */
  error: (...args: unknown[]) => {
    console.error(...args);
  },
};
