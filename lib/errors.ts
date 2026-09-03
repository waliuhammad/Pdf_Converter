/**
 * The message from a caught value, or a fallback.
 *
 * Catch bindings were typed `any` so that `err.message` would compile, which
 * hid two things. Anything can be thrown — a string, undefined, a rejected
 * fetch — and `err.message` on a thrown null throws a second error from inside
 * the catch block, replacing the real failure with "Cannot read properties of
 * null". It also meant the browser showed whatever text the exception carried,
 * which for a network failure is "Failed to fetch" rather than anything a
 * visitor can act on.
 *
 * Taking `unknown` is what the type system does by default; this narrows it in
 * one place instead of at every call site.
 */
export function errorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message;
    if (typeof error === "string" && error) return error;
    return fallback;
}

/**
 * The name of a caught Error, or "" for anything else.
 *
 * A few places branch on this — pdfjs signals a password-protected file with
 * name "PasswordException" and a superseded render with
 * "RenderingCancelledException". Returning "" rather than throwing means those
 * comparisons simply come out false for a non-Error, which is the right answer.
 */
export function errorName(error: unknown): string {
    return error instanceof Error ? error.name : "";
}
