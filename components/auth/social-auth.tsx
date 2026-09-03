"use client";

import { FcGoogle } from "react-icons/fc";
import { FaFacebookF, FaGithub, FaXTwitter, FaApple } from "react-icons/fa6";
import type { SocialProviderId } from "@/lib/firebase/auth";

interface Provider {
    id: SocialProviderId;
    label: string;
    icon: React.ReactNode;
}

// Brand marks keep their own colour where they have one; the monochrome marks
// follow the theme so they stay visible in both light and dark.
const providers: Provider[] = [
    { id: "google", label: "Google", icon: <FcGoogle size={18} /> },
    { id: "facebook", label: "Facebook", icon: <FaFacebookF size={17} className="text-[#1877F2]" /> },
    { id: "github", label: "GitHub", icon: <FaGithub size={18} className="text-fg" /> },
    { id: "twitter", label: "X", icon: <FaXTwitter size={17} className="text-fg" /> },
    { id: "apple", label: "Apple", icon: <FaApple size={19} className="text-fg" /> },
];

export function SocialAuth({
    action,
    disabled,
    onSelect,
}: {
    /** Verb shown on each button, e.g. "Log in" -> "Log in with Google". */
    action: string;
    disabled?: boolean;
    onSelect: (id: SocialProviderId) => void;
}) {
    return (
        <>
            <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-[var(--card-border)]" />
                <span className="text-xs text-muted uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-[var(--card-border)]" />
            </div>

            {/* Bare brand marks in a row at every width — five stacked
                full-width buttons push the rest of the form off the fold.
                The provider name lives in the tooltip and the accessible name. */}
            <div className="flex justify-center gap-2.5 sm:gap-3">
                {providers.map((provider) => (
                    <button
                        key={provider.id}
                        type="button"
                        onClick={() => onSelect(provider.id)}
                        disabled={disabled}
                        aria-label={`${action} with ${provider.label}`}
                        title={`${action} with ${provider.label}`}
                        className="h-12 w-12 flex items-center justify-center rounded-xl border border-card text-fg hover:bg-[var(--background-secondary)] hover:border-[var(--primary)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        <span className="w-5 flex items-center justify-center shrink-0">{provider.icon}</span>
                    </button>
                ))}
            </div>
        </>
    );
}
