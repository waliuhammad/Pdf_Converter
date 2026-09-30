import Link from "next/link";
import {
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Star,
    FileText,
    Brain,
    Upload,
} from "lucide-react";

export function Hero() {
    // `isolate` on the section matters: the background layer below sits at
    // -z-10 and body has a solid background-color, so without a stacking
    // context here those blobs paint behind the page itself and never show.
    return (
        <section id="hero" className="relative isolate overflow-hidden py-8 sm:py-14 lg:py-20">

            {/* Background */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                {/* At /10 behind a 100px blur these were invisible on a light
                    background, so the drift had nothing to show. /25 is still
                    a wash rather than a shape, but the movement now reads. */}
                <div className="animate-drift-a absolute -left-16 -top-16 h-96 w-96 rounded-full bg-primary/25 blur-[100px]" />
                <div className="animate-drift-b absolute -right-16 bottom-0 h-96 w-96 rounded-full bg-primary/25 blur-[100px]" />
            </div>

            <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 sm:px-6 lg:gap-10 lg:grid-cols-2">

                {/* LEFT */}
                <div className="animate-hero-left">
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
                     <Sparkles size={14} />
                        AI Powered PDF Workspace
                    </div>

                    <h1 className="mt-4 sm:mt-5 text-3xl sm:text-4xl font-bold leading-tight text-fg lg:text-5xl">
                        Work smarter
                        <br />
                        with your
                        <span className="text-primary"> PDF files</span>
                    </h1>

                    <p className="mt-4 max-w-lg text-sm sm:text-base leading-6 sm:leading-7 text-muted">
                        Convert, edit, merge, compress and summarise PDFs
                        using intelligent AI tools. Fast, secure and built for modern
                        professionals.
                    </p>

                    {/* items-center: the two links carry different vertical
                        padding, so without it they sat on different baselines. */}
                    <div className="mt-5 sm:mt-7 flex flex-wrap items-center gap-3">
                        <Link
                            href="/login"
                            className="
                                flex
                                items-center
                                gap-2
                                px-6
                                py-3
                                text-sm
                                font-semibold
                                text-fg
                                transition
                                relative
                                after:absolute
                                after:bottom-1
                                after:left-6
                                after:right-6
                                after:h-0.5
                                after:bg-primary
                                after:scale-x-0
                                after:transition-transform
                                hover:after:scale-x-100
                            "
                        >
                            Start Free
                            <ArrowRight size={17} />
                        </Link>

                        <Link
                            href="#pricing"
                            className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold transition hover:bg-primary hover:text-primary-foreground hover:border-primary active:scale-95"
                        >
                            View Pricing
                        </Link>
                    </div>

                    {/* Trust */}
                    <div className="mt-6 sm:mt-8 flex flex-wrap gap-x-4 gap-y-2 sm:gap-5">
                        <div className="flex items-center gap-1.5">
                            <Star
                                className="text-yellow-500"
                                fill="currentColor"
                                size={16}
                            />
                            <span className="text-xs text-muted">
                                5.0 Rating
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <ShieldCheck
                                size={16}
                                className="text-green-500"
                            />
                            <span className="text-xs text-muted">
                                Secure Processing
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <FileText
                                size={16}
                                className="text-primary"
                            />
                            <span className="text-xs text-muted">
                                10M+ PDFs Processed
                            </span>
                        </div>
                    </div>
                </div>

                {/* RIGHT
                    The three cards are a deliberate overlapping composition, but
                    it only has room to work in the two-column layout. Below lg
                    the column is full width and the two absolutely positioned
                    cards (w-56 at left-2, w-48 at right-2) overlapped each other
                    and their text. They are static and stacked here, and only
                    become the floating arrangement at lg. */}
                <div className="relative pt-2 pb-0 lg:pb-16 animate-hero-right">

                    {/* Upload Card */}
                    <div
                        className="animate-float-a rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-xl w-full max-w-sm mx-auto lg:ml-auto lg:mr-4 transition-shadow duration-300 hover:shadow-2xl"
                    >
                        <div className="flex items-center gap-2.5">
                            <div className="rounded-xl bg-primary/10 p-2.5">
                                <Upload className="text-primary" size={20} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-sm">
                                    Upload PDF
                                </h3>
                                <p className="text-xs text-muted">
                                    Drag & Drop or Browse
                                </p>
                            </div>
                        </div>

                        <div className="mt-5 h-2.5 rounded-full bg-muted">
                            {/* overflow-hidden so the sweeping highlight is clipped
                                to the filled portion rather than crossing the track. */}
                            <div className="relative h-2.5 w-3/4 overflow-hidden rounded-full bg-primary">
                                <div className="animate-shimmer absolute inset-y-0 w-1/3 bg-white/30" />
                            </div>
                        </div>
                    </div>

                    {/* The two smaller cards sit side by side under the upload
                        card on a phone, which is about 100px of hero instead of
                        the 200px they took stacked. lg:contents dissolves this
                        wrapper on desktop so each card is a direct child of the
                        relative container again and its lg:absolute still
                        positions against it.

                        items-start because grid rows stretch by default: the
                        report.pdf card holds one line of text but was pulled to
                        the height of the three-line summary beside it, leaving
                        57px of empty card under its own content. Each card now
                        takes the height it needs. No effect on desktop, where
                        lg:contents means there is no grid to align against. */}
                    <div className="mt-3 grid grid-cols-2 items-start gap-3 max-w-sm mx-auto lg:contents">

                    {/* AI Summary */}
                    <div
                        className="animate-float-b w-full lg:absolute lg:left-2 lg:top-20 lg:w-56 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xl z-10 transition-shadow duration-300 hover:shadow-2xl"
                    >
                        <div className="flex items-center gap-2">
                            <Brain
                                className="text-primary"
                                size={18}
                            />
                            <h4 className="font-semibold text-sm">
                                AI Summary
                            </h4>
                        </div>
                        <p className="mt-3 text-xs leading-5 text-muted">
                            • 15 pages analysed
                            <br />
                            • Key insights extracted
                            <br />
                            • Ready in 4 seconds
                        </p>
                    </div>

                    {/* PDF Card */}
                    <div
                        className="animate-float-c w-full lg:absolute lg:right-2 lg:top-28 lg:w-48 rounded-2xl border border-border bg-card p-3 sm:p-4 shadow-xl z-10 transition-shadow duration-300 hover:shadow-2xl"
                    >
                        <div className="flex items-center gap-2 sm:gap-2.5">
                            <div className="rounded-xl bg-primary/10 p-2 sm:p-2.5 shrink-0">
                                <FileText
                                    className="text-primary"
                                    size={18}
                                />
                            </div>
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">
                                    report.pdf
                                </p>
                                <p className="text-[11px] text-muted">
                                    Ready to download
                                </p>
                            </div>
                        </div>
                    </div>

                    </div>

                </div>

            </div>

        </section>
    );
}