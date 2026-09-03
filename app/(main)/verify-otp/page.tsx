"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FileText, AlertCircle, Loader2 } from "lucide-react";

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function VerifyOtpPage() {
    const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        inputRefs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return;
        setError(null);

        const next = [...otp];
        next[index] = value.slice(-1);
        setOtp(next);

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
        if (e.key === "Backspace" && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        }
        if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };

    // Let a pasted code fill the whole row rather than a single box.
    const handlePaste = (e: React.ClipboardEvent) => {
        const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (!digits) return;

        e.preventDefault();
        setError(null);

        const next = Array(OTP_LENGTH).fill("");
        digits.split("").forEach((digit, i) => (next[i] = digit));
        setOtp(next);
        inputRefs.current[Math.min(digits.length, OTP_LENGTH - 1)]?.focus();
    };

    const isComplete = otp.every((digit) => digit !== "");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isComplete) return;

        setSubmitting(true);
        setError(null);

        // No verification endpoint exists yet — say so instead of failing silently.
        setError("Code verification isn't connected yet. This screen is ready for the backend.");
        setSubmitting(false);
    };

    const handleResend = () => {
        if (cooldown > 0) return;
        setCooldown(RESEND_COOLDOWN_SECONDS);
        setError(null);
    };

    return (
        <main className="min-h-screen flex items-center justify-center px-6 bg-[var(--background-secondary)]">
            <div className="w-full max-w-md p-8 rounded-2xl bg-card border border-card shadow-sm text-center">
                <Link href="/" className="flex items-center justify-center gap-2 text-xl font-bold text-fg mb-8">
                    <FileText className="text-[var(--primary)]" size={22} />
                    PDF<span className="text-[var(--primary)]">AI</span>
                </Link>

                <h1 className="text-2xl font-bold text-fg mb-2">Verify your email</h1>
                <p className="text-muted text-sm mb-8">
                    Enter the {OTP_LENGTH}-digit code we sent to your email address
                </p>

                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-center gap-2 mb-4">
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={(el) => { inputRefs.current[index] = el; }}
                                type="text"
                                inputMode="numeric"
                                autoComplete={index === 0 ? "one-time-code" : "off"}
                                aria-label={`Digit ${index + 1}`}
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                onPaste={handlePaste}
                                className={`w-12 h-14 text-center text-xl font-semibold rounded-xl border text-fg bg-card focus:outline-none transition-colors ${error ? "border-red-500" : "border-card focus:border-[var(--primary)]"
                                    }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="flex items-start gap-1.5 text-sm text-red-600 text-left mb-4">
                            <AlertCircle size={15} className="shrink-0 mt-0.5" />
                            <span>{error}</span>
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!isComplete || submitting}
                        className="w-full py-3 rounded-xl bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                    >
                        {submitting && <Loader2 size={16} className="animate-spin" />}
                        {submitting ? "Verifying..." : "Verify Code"}
                    </button>
                </form>

                <p className="text-sm text-muted mt-6">
                    Didn&apos;t receive a code?{" "}
                    <button
                        onClick={handleResend}
                        disabled={cooldown > 0}
                        className="text-[var(--primary)] hover:underline disabled:text-muted disabled:no-underline disabled:cursor-not-allowed"
                    >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend"}
                    </button>
                </p>
            </div>
        </main>
    );
}
