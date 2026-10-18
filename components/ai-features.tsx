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
        <section className="relative overflow-hidden py-12 sm:py-16 px-4 sm:px-6 lg:px-8 bg-background-secondary">
            <div className="relative mx-auto max-w-7xl">
                <Reveal>
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 px-3.5 py-1 text-xs font-semibold text-[#7C3AED] dark:text-purple-400">
                            <Sparkles size={14} />
                            AI Powered Features
                        </span>

                        <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-extrabold text-foreground md:text-4xl tracking-tight">
                            Supercharge your PDFs with AI
                        </h2>

                        <p className="mx-auto mt-2 max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                            Save hours with intelligent document analysis, summaries, translations, and AI-powered workflows.
                        </p>
                    </div>
                </Reveal>

                <div className="mt-8 sm:mt-10 grid gap-3.5 sm:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature, index) => {
                        return (
                            <Link key={feature.title} href={`/${feature.slug}`} className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl">
                                <Reveal delay={index * 50} className="h-full">
                                    <div className="group relative flex flex-col justify-between h-full overflow-hidden rounded-xl border border-border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-md">
                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="group/icon relative flex h-14 w-16 shrink-0 items-center justify-start transition-transform duration-300 group-hover:scale-105">
                                                    {feature.illustration}
                                                </div>

                                                <span className="rounded-md border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#7C3AED] dark:text-purple-300">
                                                    {feature.badge}
                                                </span>
                                            </div>

                                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {feature.title}
                                            </h3>

                                            <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                                {feature.description}
                                            </p>
                                        </div>

                                        <div className="flex mt-4 items-center gap-1 text-xs font-semibold text-[#7C3AED] dark:text-purple-400 transition-all group-hover:gap-1.5">
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
                                                from-purple-500/5
                                                via-transparent
                                                to-purple-500/5
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
                                px-6
                                py-2.5
                                text-sm
                                font-semibold
                                text-primary-foreground
                                shadow-xs
                                transition-all
                                hover:bg-primary/90
                                hover:shadow-sm
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