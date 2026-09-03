"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fade-and-rise as a section scrolls into view.
 *
 * Every marketing section did this with framer-motion's initial/whileInView.
 * That is a small amount of code but a large amount of work: profiling the
 * landing page put framer among the most expensive scripts on it, and eleven
 * of the twelve sections mounted it. This does the same thing with one
 * IntersectionObserver and a CSS transition, which runs on the compositor.
 *
 * Honours prefers-reduced-motion in globals.css rather than here. Checking
 * matchMedia in the effect meant setting state during mount, and it read the
 * setting once — someone turning it on mid-session kept the animation. The CSS
 * rule just wins over these classes, and re-evaluates on its own.
 */
export function Reveal({
    children,
    delay = 0,
    className = "",
}: {
    children: React.ReactNode;
    /** Milliseconds, for staggering siblings. */
    delay?: number;
    className?: string;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [shown, setShown] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (!entry.isIntersecting) return;
                setShown(true);
                observer.disconnect(); // once, like viewport={{ once: true }}
            },
            { rootMargin: "0px 0px -10% 0px" }
        );

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={`reveal transition-[opacity,transform] duration-500 ease-out ${shown ? "opacity-100 translate-y-0" : "opacity-0 translate-y-5"
                } ${className}`}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    );
}
