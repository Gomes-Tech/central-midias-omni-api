import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a random UUID.
 *
 * @returns {string} A randomly generated UUID.
 * @example
 * const id = generateId(); // Generates a random UUID
 */
export function generateId(): string {
  return uuidv4();
}
