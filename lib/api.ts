/**
 * req.formData() throws on a request with no multipart body, not just on a
 * missing field. Called bare inside a route's outer try/catch, that surfaced as
 * a 500 — the server reporting its own fault for a request the client sent
 * wrong. Nineteen routes did this.
 *
 * Returns null instead, so the route can answer 400.
 */
export async function readFormData(req: Request): Promise<FormData | null> {
    try {
        return await req.formData();
    } catch {
        return null;
    }
}
