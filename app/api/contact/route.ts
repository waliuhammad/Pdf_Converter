import { NextRequest, NextResponse } from "next/server";
import { getFirestore } from "firebase-admin/firestore";
import { getAdminApp, isAdminConfigured, adminConfigProblem } from "@/lib/firebase/admin";

/**
 * Receives contact-form messages and stores them in the `contactMessages`
 * collection in Firestore, where they can be read in the Firebase Console.
 *
 * Stored rather than emailed: it needs no extra service or credentials, and
 * nothing is lost if an inbox is misconfigured. An email notification can be
 * added later without touching the form.
 *
 * The admin SDK writes with full privileges, so client security rules don't
 * need to open this collection up — visitors can submit without being able
 * to read anyone else's messages.
 */

const MAX_LENGTHS = {
    name: 200,
    email: 320,
    subject: 300,
    message: 5000,
} as const;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json().catch(() => null);

        const name = typeof body?.name === "string" ? body.name.trim() : "";
        const email = typeof body?.email === "string" ? body.email.trim() : "";
        const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
        const message = typeof body?.message === "string" ? body.message.trim() : "";

        if (!name || !message || !/^\S+@\S+\.\S+$/.test(email)) {
            return NextResponse.json(
                { success: false, message: "Name, a valid email, and a message are required." },
                { status: 400 }
            );
        }

        if (
            name.length > MAX_LENGTHS.name ||
            email.length > MAX_LENGTHS.email ||
            subject.length > MAX_LENGTHS.subject ||
            message.length > MAX_LENGTHS.message
        ) {
            return NextResponse.json(
                { success: false, message: "One of the fields is too long." },
                { status: 400 }
            );
        }

        if (!isAdminConfigured()) {
            // Configuration problems are a server-side concern; log the detail,
            // tell the visitor something they can act on.
            console.error("Contact form unavailable:", adminConfigProblem());
            return NextResponse.json(
                { success: false, message: "Messaging is temporarily unavailable. Please email us directly." },
                { status: 503 }
            );
        }

        const db = getFirestore(getAdminApp());

        await db.collection("contactMessages").add({
            name,
            email,
            subject: subject || null,
            message,
            createdAt: new Date().toISOString(),
            read: false,
        });

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Contact form error:", err);
        return NextResponse.json(
            { success: false, message: "Could not send your message. Please try again." },
            { status: 500 }
        );
    }
}