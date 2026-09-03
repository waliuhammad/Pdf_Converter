import "server-only"
import { FieldValue, getFirestore, type Firestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase/admin"

/**
 * Where the Payoneer account details live.
 *
 * These were read straight from PAYONEER_PAYMENT_URL, which meant the account
 * could only be changed by editing an env file and redeploying. Payment details
 * are business data, not build configuration — whoever runs billing should be
 * able to change them without a developer, and a wrong link should be fixable
 * in the minute you notice it rather than at the next deploy.
 *
 * The env var still works as a fallback so nothing that was configured stops
 * working, but the stored settings win once they exist.
 */

const DOC_PATH = { collection: "config", doc: "payoneer" } as const

/** Opened per call so importing this module cannot initialise Firebase. */
function database(): Firestore {
    return getFirestore(getAdminApp())
}

export interface PayoneerSettings {
    /** The Payoneer payment-request link the customer opens. */
    payUrl: string
    /** Who the money is going to, shown so the customer can check before paying. */
    payeeName: string
    /** The Payoneer account email, for customers paying by transfer rather than link. */
    payeeEmail: string
    /** Shown above the reference code on the checkout screen. */
    instructions: string
    /** Lets billing switch payments off without losing the account details. */
    enabled: boolean
    updatedAt: number | null
    updatedBy: string | null
}

export interface PayoneerStatus extends PayoneerSettings {
    /** Whether a customer can actually pay right now. */
    ready: boolean
    /** Why not, in words an admin can act on. Null when ready. */
    problem: string | null
}

export const DEFAULT_INSTRUCTIONS =
    "Pay the amount below from your Payoneer account, and put the reference code in the payment note. " +
    "We match payments by that code, so a payment without it can take much longer to activate."

const EMPTY: PayoneerSettings = {
    payUrl: "",
    payeeName: "",
    payeeEmail: "",
    instructions: DEFAULT_INSTRUCTIONS,
    enabled: true,
    updatedAt: null,
    updatedBy: null,
}

/**
 * Whether a link is a real destination rather than a stand-in.
 *
 * .env.local ships `https://payoneer.com/...` as a placeholder, and a
 * placeholder passes every truthiness check while sending a paying customer to
 * a page that cannot take their money. The two cases worth catching are the
 * literal ellipsis and a bare origin with nothing after it; anything else is
 * left alone, because a real payment link can be short and guessing harder
 * would start rejecting valid ones.
 */
export function isUsablePayUrl(value: string | undefined | null): boolean {
    if (!value) return false
    if (value.includes("...")) return false

    let url: URL
    try {
        url = new URL(value)
    } catch {
        return false
    }

    if (url.protocol !== "https:" && url.protocol !== "http:") return false

    // A bare origin — no path, no query — is the shape a placeholder takes.
    return url.pathname.replace(/\/+$/, "") !== "" || url.search !== ""
}

/**
 * Settings are read on every checkout, so this holds them briefly. Short enough
 * that fixing a wrong link takes effect while the admin is still looking at the
 * screen, and any save clears it outright.
 */
const CACHE_MS = 30_000
let cache: { value: PayoneerSettings; at: number } | null = null

export function invalidatePayoneerSettings(): void {
    cache = null
}

async function readSettings(): Promise<PayoneerSettings> {
    if (cache && Date.now() - cache.at < CACHE_MS) return cache.value

    let stored: Partial<PayoneerSettings> = {}
    try {
        const snap = await database().collection(DOC_PATH.collection).doc(DOC_PATH.doc).get()
        if (snap.exists) stored = snap.data() as Partial<PayoneerSettings>
    } catch (err) {
        // A read failure must not take checkout down with it: fall through to
        // the env var, which is what this deployment used before there were
        // settings at all.
        console.error("[payoneer] could not read settings", err)
    }

    const value: PayoneerSettings = {
        ...EMPTY,
        ...stored,
        // Stored value wins, env is the fallback, and an empty string in the
        // document still falls back rather than blanking a working link.
        payUrl: stored.payUrl || process.env.PAYONEER_PAYMENT_URL || "",
        instructions: stored.instructions || DEFAULT_INSTRUCTIONS,
        enabled: stored.enabled ?? true,
        updatedAt: (stored.updatedAt as number | null) ?? null,
        updatedBy: (stored.updatedBy as string | null) ?? null,
    }

    cache = { value, at: Date.now() }
    return value
}

/** Settings plus whether they are good enough to take a payment. */
export async function getPayoneerSettings(): Promise<PayoneerStatus> {
    const settings = await readSettings()

    let problem: string | null = null
    if (!isUsablePayUrl(settings.payUrl)) {
        problem = settings.payUrl
            ? "The Payoneer payment link is a placeholder, not a real link."
            : "No Payoneer payment link has been set."
    } else if (!settings.enabled) {
        problem = "Payments are switched off in the Payoneer settings."
    }

    return { ...settings, ready: problem === null, problem }
}

const MAX_INSTRUCTIONS = 2000

/** Admin-only. Returns the saved state so the form can show what stuck. */
export async function savePayoneerSettings(
    patch: Partial<Pick<PayoneerSettings, "payUrl" | "payeeName" | "payeeEmail" | "instructions" | "enabled">>,
    adminUid: string
): Promise<PayoneerStatus> {
    const next: Record<string, unknown> = { updatedBy: adminUid, updatedAt: Date.now() }

    if (patch.payUrl !== undefined) {
        const trimmed = patch.payUrl.trim()
        // Refused at the boundary rather than warned about later: a saved
        // placeholder looks configured on the settings screen while every
        // customer who clicks through lands on a dead page.
        if (trimmed && !isUsablePayUrl(trimmed)) {
            throw new Error("That does not look like a payment link. Paste the full https:// link from Payoneer.")
        }
        next.payUrl = trimmed
    }

    if (patch.payeeName !== undefined) next.payeeName = patch.payeeName.trim()
    if (patch.payeeEmail !== undefined) next.payeeEmail = patch.payeeEmail.trim()
    if (patch.instructions !== undefined) next.instructions = patch.instructions.trim().slice(0, MAX_INSTRUCTIONS)
    if (patch.enabled !== undefined) next.enabled = patch.enabled

    await database()
        .collection(DOC_PATH.collection)
        .doc(DOC_PATH.doc)
        .set({ ...next, savedAt: FieldValue.serverTimestamp() }, { merge: true })

    invalidatePayoneerSettings()
    return getPayoneerSettings()
}
