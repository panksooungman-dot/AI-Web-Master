import { randomUUID } from "crypto";

/**
 * Every registry's record id, generated the same way. Replaces the old
 * `${prefix}-${Date.now()}` (collision-prone under concurrent/rapid calls in the same
 * millisecond) and `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
 * (still theoretically collidable) patterns with a single, actually-unique primitive.
 */
export function generateId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}
