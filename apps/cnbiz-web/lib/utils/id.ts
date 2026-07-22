/**
 * `Date.now()` alone is millisecond-resolution, so two records created within the same
 * millisecond (easily happens under concurrent requests, or in tests that don't await between
 * calls) get identical ids — `lib/design/*.ts` and `lib/events/eventBus.ts` already avoid this
 * by appending a random suffix. This extracts that same pattern for the registries that were
 * still using `Date.now()` alone (REPORT.md C-3).
 */
export function createRecordId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
