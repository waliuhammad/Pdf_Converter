/**
 * Animated backdrop behind the home hero: an aurora — a few large, heavily
 * blurred glows in the theme's primary colour, indigo and cyan, drifting slowly
 * over a faint grid.
 *
 * Pure CSS (keyframes in globals.css): each glow only animates transform, so it
 * runs on the compositor with no JavaScript, and it stops by itself for
 * visitors who prefer reduced motion. Decorative: behind the content, not
 * interactive, hidden from screen readers.
 */
export function HeroBackdrop() {
    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[520px] overflow-hidden">
            {/* The glows, faded out towards the bottom so they melt into the page */}
            <div
                className="absolute inset-0 opacity-70 dark:opacity-100"
                style={{
                    maskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 45%, transparent 100%)",
                }}
            >
                <div className="animate-aurora-a absolute left-[8%] top-[-140px] h-[380px] w-[520px] rounded-full bg-primary/35 blur-[100px] dark:bg-primary/50" />
                <div className="animate-aurora-b absolute right-[6%] top-[-80px] h-[340px] w-[480px] rounded-full bg-indigo-400/30 blur-[100px] dark:bg-indigo-500/45" />
                <div className="animate-aurora-c absolute left-[38%] top-[60px] h-[300px] w-[460px] rounded-full bg-cyan-300/30 blur-[110px] dark:bg-cyan-400/25" />
            </div>
            {/* Faint grid, faded towards the edges */}
            <div
                className="absolute inset-0 opacity-50 dark:opacity-30"
                style={{
                    backgroundImage:
                        "linear-gradient(color-mix(in srgb, var(--primary) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary) 9%, transparent) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(ellipse 70% 75% at 50% 30%, black 25%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse 70% 75% at 50% 30%, black 25%, transparent 75%)",
                }}
            />
        </div>
    );
}
