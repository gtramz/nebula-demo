/** Navigation metadata only. No credentials, form values or media are stored here. */
export const returnKey = '__nebulaOrigin';
export type OriginEntry = { href: string; index: number };
export type ReturnHistory = { version: 1; identity: string; scope: string; trail: OriginEntry[] };
const scopeKey = 'nebula-return-scope-v1';
let memoryScope: { identity: string; scope: string } | undefined;
export function navigationScope(identity: string) {
  let saved = memoryScope;
  try { saved = JSON.parse(sessionStorage.getItem(scopeKey) || 'null') ?? saved; } catch { /* Memory fallback. */ }
  if (!saved || saved.identity !== identity || typeof saved.scope !== 'string') saved = { identity, scope: crypto.randomUUID() };
  memoryScope = saved;
  try { sessionStorage.setItem(scopeKey, JSON.stringify(saved)); } catch { /* Navigation remains available. */ }
  return saved.scope;
}
export function localPage(href: unknown): href is string {
  return typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') && !/[\\\u0000-\u0020]/.test(href) && !/^\/api(?:\/|$)/.test(href);
}
export function readReturnHistory(state: Record<string, unknown> | null, identity: string, scope: string): ReturnHistory {
  const value = state?.[returnKey] as ReturnHistory | undefined;
  return value?.version === 1 && value.identity === identity && value.scope === scope && Array.isArray(value.trail)
    ? { ...value, trail: value.trail.filter(e => e && localPage(e.href) && Number.isSafeInteger(e.index)) }
    : { version: 1, identity, scope, trail: [] };
}
export function previousEntry(state: Record<string, unknown> | null, identity: string, scope: string, href: string) {
  const index = state?.__nebulaNavigationIndex;
  if (typeof index !== 'number') return undefined;
  return readReturnHistory(state, identity, scope).trail.slice().reverse().find(e => e.index < index && e.href !== href);
}
