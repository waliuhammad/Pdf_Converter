"use client";

import Link from "next/link";

/** Consent checkbox linking to the Terms and Privacy pages. */
export function TermsAgreement({
    checked,
    onChange,
    id = "terms",
}: {
    checked: boolean;
    onChange: (checked: boolean) => void;
    id?: string;
}) {
    return (
        <div className="flex items-start gap-2.5">
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                // 24px is the smallest a control should be to tap reliably;
                // the box still draws at 16px, the extra is padding.
                className="mt-0.5 h-6 w-6 shrink-0 rounded border-[var(--card-border)] accent-[var(--primary)] cursor-pointer p-1"
            />
            <label htmlFor={id} className="text-xs text-muted leading-5 cursor-pointer">
                I agree to the{" "}
                <Link href="/terms" className="text-[var(--primary)] hover:underline">
                    Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                    Privacy Policy
                </Link>
                .
            </label>
        </div>
    );
}

/**
 * The same links without a checkbox, for signing in.
 *
 * Login used the consent checkbox and disabled its submit until it was ticked,
 * so every returning user had to agree to the terms again on every single
 * sign-in. They agreed when they created the account; this only reminds them.
 */
export function TermsNotice() {
    return (
        <p className="text-xs text-muted leading-5">
            By logging in you agree to our{" "}
            <Link href="/terms" className="text-[var(--primary)] hover:underline">
                Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-[var(--primary)] hover:underline">
                Privacy Policy
            </Link>
            .
        </p>
    );
}
