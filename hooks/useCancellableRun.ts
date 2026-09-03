"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cancels a tool's in-flight work when the file it was working on goes away.
 *
 * Removing a file only reset the page's state; the request carried on. It came
 * back a few seconds later against a document that was no longer on screen,
 * reported success, and downloaded the result of the file the user had just
 * deleted — while they were choosing a new one. Starting a second run before
 * the first returned was the same story with two results racing.
 *
 * begin() abandons any run already going and returns the signal for the new
 * one. cancel() abandons the current run and starts nothing. Both mean the
 * request is aborted rather than merely ignored, so the upload stops using the
 * connection as well.
 *
 * Callers must still check `signal.aborted` after each await before touching
 * state: an abort stops the fetch, not the code that was waiting on it.
 */
export function useCancellableRun() {
    const controller = useRef<AbortController | null>(null);

    const begin = useCallback((): AbortSignal => {
        controller.current?.abort();
        const next = new AbortController();
        controller.current = next;
        return next.signal;
    }, []);

    const cancel = useCallback((): void => {
        controller.current?.abort();
        controller.current = null;
    }, []);

    // Leaving the page is another way for the file to go away.
    useEffect(() => () => controller.current?.abort(), []);

    return { begin, cancel };
}

/**
 * True when the failure is this hook cancelling the request rather than
 * anything going wrong — so the tool stays quiet instead of showing an error
 * for something the user asked for.
 */
export function wasCancelled(error: unknown, signal?: AbortSignal): boolean {
    if (signal?.aborted) return true;
    return error instanceof DOMException && error.name === "AbortError";
}
