import { FileText, FileImage, FileSpreadsheet, Sparkles, ScanText, Lock } from "lucide-react";

/**
 * Animated backdrop behind the home hero (badge, heading, search, filters).
 *
 * Drifting colour glows, a faint dot grid that fades towards the edges, and a
 * few document icons floating at the sides. Built from the keyframes already
 * in globals.css (drift-a/b, float-a/b/c), which run on the compositor and
 * stop entirely under prefers-reduced-motion. Purely decorative: behind the
 * content, not focusable, hidden from screen readers. The floating icons are
 * left out on small screens, where they would sit on top of the text.
 */
const FLOATERS = [
    { Icon: FileText, className: "left-[6%] top-[18%] animate-float-a text-red-500" },
    { Icon: FileImage, className: "left-[11%] top-[44%] animate-float-b text-amber-500" },
    { Icon: Sparkles, className: "left-[22%] top-[6%] animate-float-c text-violet-500" },
    { Icon: FileSpreadsheet, className: "right-[7%] top-[22%] animate-float-b text-emerald-500" },
    { Icon: ScanText, className: "right-[12%] top-[46%] animate-float-a text-sky-500" },
    { Icon: Lock, className: "right-[23%] top-[8%] animate-float-c text-primary" },
];

export function HeroBackdrop() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[440px] overflow-hidden">
            {/* Drifting glows */}
            <div className="animate-drift-a absolute -top-24 left-[12%] h-72 w-72 rounded-full bg-primary/20 blur-[90px] dark:bg-primary/25" />
            <div className="animate-drift-b absolute -top-10 right-[10%] h-80 w-80 rounded-full bg-sky-400/20 blur-[100px] dark:bg-sky-500/15" />
            <div className="animate-drift-a absolute top-40 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-violet-400/10 blur-[110px] [animation-delay:-9s]" />

            {/* Dot grid, faded out towards the edges */}
            <div
                className="absolute inset-0 opacity-50 dark:opacity-30"
                style={{
                    backgroundImage: "radial-gradient(color-mix(in srgb, var(--primary) 30%, transparent) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                    maskImage: "radial-gradient(ellipse 60% 70% at 50% 35%, black 30%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse 60% 70% at 50% 35%, black 30%, transparent 75%)",
                }}
            />

            {/* Floating document icons at the sides */}
            {FLOATERS.map(({ Icon, className }, i) => (
                <div
                    key={i}
                    className={`absolute hidden lg:flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-card/80 shadow-lg shadow-primary/10 backdrop-blur-sm ${className}`}
                >
                    <Icon size={22} strokeWidth={2} />
                </div>
            ))}
        </div>
    );
}
