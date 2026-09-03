/**
 * Recognises the Gemini errors that mean "come back in a moment".
 *
 * 503 is the model being saturated and 429 is the key being over quota. Neither
 * is a fault in the request, and both clear on their own — but every route was
 * flattening them into a 500 with a message like "OCR failed.", which reads as
 * a broken file or a broken feature. Someone seeing that will change their PDF
 * or give up, when retrying the same request would have worked.
 */
export interface BusyResponse {
    status: number;
    body: { success: false; retryable: true; message: string };
}

export function upstreamBusy(error: unknown): BusyResponse | null {
    const status = (error as { status?: number })?.status;

    if (status !== 503 && status !== 429) return null;

    return {
        status,
        body: {
            success: false,
            retryable: true,
            message:
                status === 429
                    ? "The AI service has reached its rate limit. Please wait a moment and try again."
                    : "The AI model is busy right now. Please try again in a moment.",
        },
    };
}
