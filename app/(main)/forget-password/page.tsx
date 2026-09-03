"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";
import { sendResetEmail } from "@/lib/firebase/auth";

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await sendResetEmail(email);
            setSent(true);
        } catch {
            setError("Something went wrong. Please check the email and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[var(--background-secondary)]">
            <div className="w-full max-w-md bg-card border border-card rounded-2xl p-6 sm:p-8 animate-tool-in">
                {/* py-1 takes this from 20px to 28px. WCAG 2.5.8 AA wants 24,
                    and the inline-in-a-sentence exemption does not apply — this
                    is a standalone navigation link. mb drops by the 4px the
                    padding adds so the spacing below is unchanged. */}
                <Link href="/login" className="inline-flex items-center gap-1.5 py-1 text-sm text-muted hover:text-fg mb-5 transition-colors">
                    <ArrowLeft size={16} /> Back to login
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-fg">Forgot password?</h1>
                    <p className="text-muted text-sm mt-1">Enter your email and we&apos;ll send you a reset link</p>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
                )}

                {sent ? (
                    <div className="text-center py-4">
                        <p className="text-fg font-medium">Check your inbox!</p>
                        <p className="text-muted text-sm mt-1">
                            We&apos;ve sent a password reset link to <span className="text-fg">{email}</span>. Click it to set a new password.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-fg mb-1.5">Email</label>
                            <div className="relative">
                                <Mail size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-card text-fg placeholder:text-muted focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-full bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60"
                        >
                            {loading ? "Sending..." : "Send Reset Link"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}