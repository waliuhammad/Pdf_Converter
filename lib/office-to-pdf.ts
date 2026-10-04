import "server-only";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Word / Excel / PowerPoint -> PDF with LibreOffice, so the PDF looks like the
 * original: fonts, images, tables, colours, page layout.
 *
 * The previous converters read the document's text out of its XML and drew it
 * onto blank pages, which threw the design away. LibreOffice renders the real
 * document. It is free, and is installed by the Dockerfile and by
 * nixpacks.toml (Railway); locally it has to be installed once
 * (https://www.libreoffice.org/download/) or pointed at with LIBREOFFICE_PATH.
 */

const CANDIDATES = [
    process.env.LIBREOFFICE_PATH,
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "/Applications/LibreOffice.app/Contents/MacOS/soffice",
    "/usr/bin/soffice",
    "/usr/bin/libreoffice",
    "/usr/local/bin/soffice",
    "/opt/libreoffice/program/soffice",
].filter((p): p is string => Boolean(p));

/**
 * Only a hit is remembered. Caching "not found" meant installing LibreOffice
 * while the server was running changed nothing until a restart.
 */
let resolved: string | null = null;

/** Where soffice is, or null when LibreOffice is not installed. */
export function findLibreOffice(): string | null {
    if (resolved && fs.existsSync(resolved)) return resolved;

    resolved = CANDIDATES.find((p) => fs.existsSync(p)) ?? null;

    // Nixpacks installs into the Nix store, which is on PATH but not at a
    // fixed location, so search PATH as well.
    if (!resolved) {
        const names = process.platform === "win32" ? ["soffice.exe"] : ["soffice", "libreoffice"];
        for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
            const hit = names.map((n) => path.join(dir, n)).find((p) => fs.existsSync(p));
            if (hit) {
                resolved = hit;
                break;
            }
        }
    }
    return resolved;
}

export class LibreOfficeMissingError extends Error {
    constructor() {
        super(
            "LibreOffice is not installed on this server, so Office files cannot be converted with their layout. " +
                "Install it from https://www.libreoffice.org/download/ (or set LIBREOFFICE_PATH) and restart the server."
        );
    }
}

/** 2 minutes: large decks take a while, a hung conversion must not hold a request forever. */
const TIMEOUT_MS = 120_000;

/**
 * Convert one Office document to PDF.
 *
 * Every call gets its own temporary LibreOffice profile: two conversions
 * sharing the default profile lock each other out, and the second silently
 * produces nothing.
 */
export async function officeToPdf(bytes: Uint8Array, extension: string): Promise<Uint8Array> {
    const soffice = findLibreOffice();
    if (!soffice) throw new LibreOfficeMissingError();

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "office-pdf-"));
    const input = path.join(dir, `input.${extension.replace(/[^a-z0-9]/gi, "")}`);
    const profile = pathToFileURL(path.join(dir, "profile")).href;

    try {
        fs.writeFileSync(input, bytes);

        await new Promise<void>((resolve, reject) => {
            execFile(
                soffice,
                [
                    `-env:UserInstallation=${profile}`,
                    "--headless",
                    "--norestore",
                    "--nologo",
                    "--convert-to",
                    "pdf",
                    "--outdir",
                    dir,
                    input,
                ],
                { timeout: TIMEOUT_MS, windowsHide: true },
                (error, _stdout, stderr) => {
                    if (error) reject(new Error(`LibreOffice failed: ${stderr || error.message}`));
                    else resolve();
                }
            );
        });

        const output = path.join(dir, "input.pdf");
        if (!fs.existsSync(output)) {
            throw new Error("LibreOffice produced no PDF — the file may be damaged or password-protected.");
        }
        return new Uint8Array(fs.readFileSync(output));
    } finally {
        fs.rmSync(dir, { recursive: true, force: true });
    }
}
