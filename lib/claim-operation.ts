"use client";

/**
 * Claim one operation from today's allowance before doing work in the browser.
 *
 * The tools that convert in the page never touched a metered route, so they
 * ran without limit while every other tool stopped at the plan's ceiling. They
 * call this first and stop if it refuses.
 *
 * Returns the server's own message on refusal — "Please sign in to use the
 * tools." or the daily-limit wording with the real counts — so these tools say
 * exactly what the metered ones say rather than inventing their own phrasing.
 */
export async function claimOperation(): Promise<{ ok: true } | { ok: false; message: string }> {
    let res: Response;
    try {
        res = await fetch("/api/usage", { method: "POST" });
    } catch {
        // Offline or the request never landed. Refusing here would break a
        // tool that runs perfectly well in the browser, so the work proceeds
        // and the operation goes uncounted — the same outcome as before this
        // check existed, and better than a working tool that will not run.
        return { ok: true };
    }

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null);
    return {
        ok: false,
        message:
            body?.message ??
            body?.error ??
            "Could not check your daily allowance. Please try again.",
    };
}

/**
 * Give back an operation whose work then failed.
 *
 * Claiming happens before the conversion starts, so a file the library cannot
 * read would otherwise still cost the user one of their daily operations. The
 * server-side tools refund themselves — only these browser-side ones have to
 * say so explicitly.
 *
 * Best effort: if the release does not land, the user has lost one operation,
 * which is not worth a second error message on top of the one they already saw.
 */
export async function releaseOperation(): Promise<void> {
    try {
        await fetch("/api/usage", { method: "DELETE" });
    } catch {
        // Nothing useful to do, and nothing worth telling the user about.
    }
}
