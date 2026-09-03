"use client";

/**
 * Turns a Firebase auth failure into something safe to show.
 *
 * The pages used to render `err.message` directly, which put Firebase's own
 * text on screen — "Firebase: Error (auth/email-already-in-use)." That leaks
 * the implementation and reads like a crash, and on sign-up it confirms which
 * email addresses have accounts, so anyone can test a list of addresses against
 * the form.
 *
 * Sign-in stays deliberately vague: one message whether the address is unknown
 * or the password is wrong, so a failed attempt says nothing about whether the
 * account exists.
 */

type Firebaseish = { code?: string; message?: string };

function codeOf(error: unknown): string {
    const code = (error as Firebaseish)?.code;
    return typeof code === "string" ? code : "";
}

/** True when the user closed the popup themselves — not worth an error at all. */
export function isUserCancelled(error: unknown): boolean {
    const code = codeOf(error);
    return (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/user-cancelled"
    );
}

/** One message for every sign-in failure, so none of them identify an account. */
export function signInErrorMessage(error: unknown): string {
    const code = codeOf(error);

    if (code === "auth/too-many-requests") {
        return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (code === "auth/user-disabled") {
        return "This account has been disabled. Contact support if you think that is wrong.";
    }
    if (code === "auth/network-request-failed") {
        return "Could not reach the server. Check your connection and try again.";
    }
    if (code === "auth/operation-not-allowed") {
        return "That sign-in method isn't enabled for this app yet.";
    }

    // auth/user-not-found, auth/wrong-password and auth/invalid-credential all
    // land here on purpose: telling them apart is what enumerates accounts.
    return "Invalid email or password. Please try again.";
}

/**
 * Sign-up failures.
 *
 * "This email is already registered" does confirm the address exists, and that
 * is a deliberate trade: a sign-up form that refuses without saying why sends
 * people round in circles, and the same fact is obtainable from any password
 * reset flow. What it no longer does is hand over Firebase's internal message.
 */
export function signUpErrorMessage(error: unknown): string {
    const code = codeOf(error);

    if (code === "auth/email-already-in-use") {
        return "An account with this email already exists. Try signing in instead.";
    }
    if (code === "auth/weak-password") {
        return "That password is too easy to guess. Use at least six characters.";
    }
    if (code === "auth/invalid-email") {
        return "That email address does not look right.";
    }
    if (code === "auth/too-many-requests") {
        return "Too many attempts. Please wait a few minutes and try again.";
    }
    if (code === "auth/network-request-failed") {
        return "Could not reach the server. Check your connection and try again.";
    }
    if (code === "auth/operation-not-allowed") {
        return "That sign-up method isn't enabled for this app yet.";
    }

    return "Could not create your account. Please check your details and try again.";
}
