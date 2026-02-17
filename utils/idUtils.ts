/**
 * Generates a unique ID compatible with non-secure contexts (HTTP).
 * crypto.randomUUID() requires HTTPS or localhost.
 */
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};