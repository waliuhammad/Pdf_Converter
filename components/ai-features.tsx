import Link from "next/link";
import { Reveal } from "@/components/reveal";
import {
    Sparkles,
    ArrowRight,
} from "lucide-react";
import {
    AiSummaryIcon,
    OcrPdfIcon,
    TranslatePdfIcon,
    GrammarIcon,
} from "@/components/tools/tool-icons";

const features = [
    {
        title: "AI Summary",
        description: "Generate concise summaries from lengthy reports, books and documents.",
        illustration: <AiSummaryIcon size={64} />,
        badge: "Popular",
        slug: "aisummary-info",
    },
    {
        title: "OCR PDF",
        description: "Convert scanned PDFs and images into fully editable searchable text.",
        illustration: <OcrPdfIcon size={64} />,
        badge: "OCR",
        slug: "ocrscanner-info",
    },
    {
        title: "Translate PDF",
        description: "Translate documents into multiple languages while preserving formatting.",
        illustration: <TranslatePdfIcon size={64} />,
        badge: "New",
        slug: "aitranslate-info",
    },
    {
        title: "Grammar Checker",
        description: "Check grammar and spelling of your document.",
        illustration: <GrammarIcon size={64} />,
        badge: "Smart",
        slug: "aigrammar-info",
    },
];

export function AIFeatures() {
    return (
        <section className="dark relative overflow-hidden py-14 sm:py-20 px-4 sm:px-6 lg:px-8 bg-[#070d18] text-slate-100">
            {/* Ambient Background Glows */}
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-[700px] rounded-full bg-blue-600/15 blur-[120px]" />
            <div className="pointer-events-none absolute -bottom-40 right-10 h-72 w-72 rounded-full bg-sky-500/10 blur-[100px]" />

            <div className="relative mx-auto max-w-7xl">
                <Reveal>
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-950/60 px-3.5 py-1 text-xs font-semibold text-blue-400 shadow-xs">
                            <Sparkles size={14} className="text-blue-400" />
                            AI Powered Features
                        </span>

                        <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-extrabold text-white md:text-4xl tracking-tight">
                            Supercharge your PDFs with AI
                        </h2>

                        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-slate-400 leading-relaxed">
                            Save hours with intelligent document analysis, summaries, translations, and AI-powered workflows.
                        </p>
                    </div>
                </Reveal>

                <div className="mt-8 sm:mt-10 grid gap-3.5 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature, index) => {
                        return (
                            <Link key={feature.title} href={`/${feature.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-2xl">
                                <Reveal delay={index * 50} className="h-full">
                                    <div className="group relative flex flex-col justify-between h-full overflow-hidden rounded-2xl border border-[#1a253c] bg-[#0d1527] p-5.5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-950/40">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="group/icon relative flex h-14 w-16 shrink-0 items-center justify-start transition-transform duration-300 group-hover:scale-105">
                                                    {feature.illustration}
                                                </div>

                                                <span className="rounded-md border border-blue-500/30 bg-blue-950/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-400 shadow-xs">
                                                    {feature.badge}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                {feature.title}
                                            </h3>

                                            <p className="mt-1.5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>

                                        <div className="flex mt-5 items-center gap-1 text-xs font-semibold text-blue-400 transition-all group-hover:gap-1.5 group-hover:text-blue-300">
                                            <span>Learn More</span>
                                            <ArrowRight size={14} />
                                        </div>

                                        {/* Hover Glow */}
                                        <div
                                            className="
                                                pointer-events-none
                                                absolute
                                                inset-0
                                                bg-gradient-to-br
                                                from-blue-500/10
                                                via-transparent
                                                to-blue-500/5
                                                opacity-0
                                                transition-opacity
                                                duration-300
                                                group-hover:opacity-100
                                            "
                                        />
                                    </div>
                                </Reveal>
                            </Link>
                        );
                    })}
                </div>

                <Reveal>
                    <div className="mt-8 sm:mt-10 text-center">
                        <Link
                            href="/tools?category=AI%20Tools"
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-primary
                                hover:bg-primary-hover
                                px-6
                                py-2.5
                                text-sm
                                font-semibold
                                text-white
                                shadow-lg
                                shadow-blue-600/25
                                transition-all
                                hover:shadow-blue-600/40
                                active:scale-98
                            "
                        >
                            Explore AI Tools
                            <ArrowRight size={16} />
                        </Link>
                    </div>
                </Reveal>
            </div>
        </section>
    );
}