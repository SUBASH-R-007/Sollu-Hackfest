import { getKV, setKV } from "../../db";

/**
 * I-7: a local record of withdrawn recorded-phrase consents, so restoring an
 * older backup cannot bring back a withdrawn consent or its recordings.
 * Only consent IDs and the withdrawal time are kept; no names or audio.
 */
export const CONSENT_WITHDRAWALS_KEY = "voice-consent-withdrawals:v1";
const MAX_IDS = 2000;

export interface ConsentWithdrawals {
  ids: Set<string>;
  /** Latest withdrawal time. Consents given at or before it stay withdrawn. */
  latestAt: number | null;
}
interface StoredWithdrawals {
  ids: string[];
  latestAt: number | null;
}

export function parseWithdrawals(value: unknown): ConsentWithdrawals {
  const stored =
    value && typeof value === "object"
      ? (value as Partial<StoredWithdrawals>)
      : {};
  const ids = Array.isArray(stored.ids)
    ? stored.ids.filter(
        (id): id is string =>
          typeof id === "string" && id.length > 0 && id.length <= 2048,
      )
    : [];
  const latestAt =
    typeof stored.latestAt === "number" &&
    Number.isFinite(stored.latestAt) &&
    stored.latestAt > 0
      ? stored.latestAt
      : null;
  return { ids: new Set(ids), latestAt };
}

/** Adds withdrawn IDs. The oldest IDs are dropped beyond the cap; the
 * withdrawal time still covers them because they were given before it. */
export function addWithdrawals(
  current: ConsentWithdrawals,
  ids: string[],
  at: number,
): StoredWithdrawals {
  const merged = [...current.ids];
  for (const id of ids)
    if (typeof id === "string" && id && !current.ids.has(id)) merged.push(id);
  const time = Number.isFinite(at) && at > 0 ? at : null;
  return {
    ids: [...new Set(merged)].slice(-MAX_IDS),
    latestAt:
      time === null ? current.latestAt : Math.max(current.latestAt ?? 0, time),
  };
}

/** True when a consent was withdrawn on this device and must not be restored. */
export function isConsentWithdrawn(
  consent: { id: string; at?: unknown },
  withdrawals: ConsentWithdrawals,
): boolean {
  if (withdrawals.ids.has(consent.id)) return true;
  return (
    withdrawals.latestAt !== null &&
    (typeof consent.at !== "number" ||
      !Number.isFinite(consent.at) ||
      consent.at <= withdrawals.latestAt)
  );
}

export async function readConsentWithdrawals(): Promise<ConsentWithdrawals> {
  return parseWithdrawals(await getKV<unknown>(CONSENT_WITHDRAWALS_KEY));
}

/**
 * Call when consent is withdrawn, with the withdrawn consent IDs, before or in
 * the same Dexie transaction (including db.kv) that removes those consents.
 */
export async function recordWithdrawnConsents(
  ids: string[],
  at = Date.now(),
): Promise<void> {
  const current = await readConsentWithdrawals();
  await setKV(CONSENT_WITHDRAWALS_KEY, addWithdrawals(current, ids, at));
}

export async function withdrawnConsentIds(): Promise<Set<string>> {
  return (await readConsentWithdrawals()).ids;
}
