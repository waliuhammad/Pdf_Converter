"use client";

import { useEffect, useRef } from "react";

/**
 * Animated backdrop behind the home hero: a slow "data network" — points
 * drifting across a fine grid, linked by thin lines when they come close, with
 * links reaching towards the pointer — and a soft light sweeping over the grid.
 *
 * Drawn on one canvas in the theme's primary colour (re-read when the theme
 * changes). It pauses while off screen or in a hidden tab, scales with the
 * device pixel ratio, and draws a single still frame for visitors who prefer
 * reduced motion. Decorative: behind the content, not interactive, hidden from
 * screen readers.
 */
export function HeroBackdrop() {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;

        const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let width = 0;
        let height = 0;
        let color = "37, 99, 235";
        let points: { x: number; y: number; vx: number; vy: number; r: number }[] = [];
        const pointer = { x: -9999, y: -9999 };
        let frame = 0;
        let visible = true;

        const readColor = () => {
            // --primary is a hex colour; canvas wants its RGB parts.
            const hex = getComputedStyle(document.documentElement).getPropertyValue("--primary").trim().replace("#", "");
            if (/^[0-9a-f]{6}$/i.test(hex)) {
                color = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
            }
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            width = rect.width;
            height = rect.height;
            canvas.width = Math.round(width * dpr);
            canvas.height = Math.round(height * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            // About one point per 11 000 px², capped so wide screens stay light.
            const count = Math.min(70, Math.max(24, Math.round((width * height) / 11000)));
            points = Array.from({ length: count }, () => ({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: (Math.random() - 0.5) * 0.28,
                vy: (Math.random() - 0.5) * 0.28,
                r: Math.random() * 1.4 + 0.8,
            }));
        };

        const LINK = 140;
        const draw = (time: number) => {
            ctx.clearRect(0, 0, width, height);

            // Light sweeping slowly left to right across the grid.
            const sweepX = ((time / 9000) % 1) * (width + 600) - 300;
            const sweep = ctx.createLinearGradient(sweepX - 300, 0, sweepX + 300, 0);
            sweep.addColorStop(0, `rgba(${color}, 0)`);
            sweep.addColorStop(0.5, `rgba(${color}, 0.07)`);
            sweep.addColorStop(1, `rgba(${color}, 0)`);
            ctx.fillStyle = sweep;
            ctx.fillRect(0, 0, width, height);

            for (const p of points) {
                if (!reduceMotion) {
                    p.x += p.vx;
                    p.y += p.vy;
                    if (p.x < -20) p.x = width + 20;
                    if (p.x > width + 20) p.x = -20;
                    if (p.y < -20) p.y = height + 20;
                    if (p.y > height + 20) p.y = -20;
                }
            }

            ctx.lineWidth = 1;
            for (let i = 0; i < points.length; i++) {
                const a = points[i];
                for (let j = i + 1; j < points.length; j++) {
                    const b = points[j];
                    const d = Math.hypot(a.x - b.x, a.y - b.y);
                    if (d < LINK) {
                        ctx.strokeStyle = `rgba(${color}, ${0.22 * (1 - d / LINK)})`;
                        ctx.beginPath();
                        ctx.moveTo(a.x, a.y);
                        ctx.lineTo(b.x, b.y);
                        ctx.stroke();
                    }
                }
                const dp = Math.hypot(a.x - pointer.x, a.y - pointer.y);
                if (dp < LINK * 1.3) {
                    ctx.strokeStyle = `rgba(${color}, ${0.35 * (1 - dp / (LINK * 1.3))})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(pointer.x, pointer.y);
                    ctx.stroke();
                }
            }

            for (const p of points) {
                ctx.fillStyle = `rgba(${color}, 0.55)`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fill();
            }

            if (!reduceMotion && visible && !document.hidden) frame = requestAnimationFrame(draw);
        };

        const start = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(draw);
        };

        readColor();
        resize();
        start();

        const onResize = () => {
            resize();
            if (reduceMotion) start();
        };
        const onMove = (e: PointerEvent) => {
            const rect = canvas.getBoundingClientRect();
            pointer.x = e.clientX - rect.left;
            pointer.y = e.clientY - rect.top;
        };
        const onLeave = () => {
            pointer.x = -9999;
            pointer.y = -9999;
        };
        const onVisibility = () => {
            if (!document.hidden && visible && !reduceMotion) start();
        };

        const io = new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && !reduceMotion) start();
        });
        io.observe(canvas);

        // Theme switches change --primary; follow them.
        const mo = new MutationObserver(() => {
            readColor();
            if (reduceMotion) start();
        });
        mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

        window.addEventListener("resize", onResize);
        window.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerleave", onLeave);
        document.addEventListener("visibilitychange", onVisibility);
        return () => {
            cancelAnimationFrame(frame);
            io.disconnect();
            mo.disconnect();
            window.removeEventListener("resize", onResize);
            window.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerleave", onLeave);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return (
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[460px] overflow-hidden">
            {/* Fine tech grid, faded towards the edges */}
            <div
                className="absolute inset-0 opacity-60 dark:opacity-40"
                style={{
                    backgroundImage:
                        "linear-gradient(color-mix(in srgb, var(--primary) 9%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--primary) 9%, transparent) 1px, transparent 1px)",
                    backgroundSize: "44px 44px",
                    maskImage: "radial-gradient(ellipse 70% 75% at 50% 30%, black 25%, transparent 75%)",
                    WebkitMaskImage: "radial-gradient(ellipse 70% 75% at 50% 30%, black 25%, transparent 75%)",
                }}
            />
            {/* A soft glow so the heading sits in light */}
            <div className="absolute left-1/2 top-[-120px] h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-primary/10 blur-[110px] dark:bg-primary/15" />
            <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full"
                style={{
                    maskImage: "radial-gradient(ellipse 80% 80% at 50% 35%, black 40%, transparent 85%)",
                    WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 35%, black 40%, transparent 85%)",
                }}
            />
        </div>
    );
}
