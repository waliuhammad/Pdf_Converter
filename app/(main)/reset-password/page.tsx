"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, ArrowLeft } from "lucide-react";
import { verifyResetCode, confirmReset } from "@/lib/firebase/auth";

type VerifyState = "checking" | "valid" | "invalid";

function ResetPasswordForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const oobCode = searchParams.get("oobCode") || "";

    // A missing code is knowable at render, so it is the starting value rather
    // than something the effect corrects a moment later. That also stops the
    // "Checking your link" state flashing up for a link that has no code at all.
    const [verifyState, setVerifyState] = useState<VerifyState>(oobCode ? "checking" : "invalid");
    const [email, setEmail] = useState("");

    const [showPassword, setShowPassword] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [done, setDone] = useState(false);

    useEffect(() => {
        if (!oobCode) return;

        verifyResetCode(oobCode)
            .then((verifiedEmail) => {
                setEmail(verifiedEmail);
                setVerifyState("valid");
            })
            .catch(() => setVerifyState("invalid"));
    }, [oobCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            await confirmReset(oobCode, password);
            setDone(true);
            setTimeout(() => router.push("/login"), 1500);
        } catch {
            setError("This link may have expired. Please request a new one.");
        } finally {
            setLoading(false);
        }
    };

    if (verifyState === "checking") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[var(--background-secondary)]">
                <p className="text-sm text-muted">Verifying your link...</p>
            </div>
        );
    }

    if (verifyState === "invalid") {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[var(--background-secondary)]">
                <div className="w-full max-w-md bg-card border border-card rounded-2xl p-6 sm:p-8 text-center animate-tool-in">
                    <h1 className="text-xl sm:text-2xl font-bold text-fg mb-2">Link expired or invalid</h1>
                    <p className="text-muted text-sm mb-6">This password reset link is no longer valid. Please request a new one.</p>
                    <Link
                        href="/forget-password"
                        className="inline-block px-6 py-3 rounded-full bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors"
                    >
                        Request New Link
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 bg-[var(--background-secondary)]">
            <div className="w-full max-w-md bg-card border border-card rounded-2xl p-6 sm:p-8 animate-tool-in">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg mb-6 transition-colors">
                    <ArrowLeft size={16} /> Back to login
                </Link>

                <div className="text-center mb-8">
                    <h1 className="text-xl sm:text-2xl font-bold text-fg">Set a new password</h1>
                    <p className="text-muted text-sm mt-1">
                        Choose a strong password for <span className="text-fg">{email}</span>
                    </p>
                </div>

                {error && (
                    <div className="mb-4 px-4 py-2 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
                )}

                {done ? (
                    <div className="text-center py-4">
                        <p className="text-fg font-medium">Password updated!</p>
                        <p className="text-muted text-sm mt-1">Redirecting you to login...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-fg mb-1.5">New password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="At least 8 characters"
                                    className="w-full pl-11 pr-11 py-3 rounded-xl border border-card text-fg placeholder:text-muted focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-fg mb-1.5">Confirm password</label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Re-enter password"
                                    className="w-full pl-11 pr-4 py-3 rounded-xl border border-card text-fg placeholder:text-muted focus:outline-none focus:border-[var(--primary)] transition-colors"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 rounded-full bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-60"
                        >
                            {loading ? "Updating..." : "Reset Password"}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}