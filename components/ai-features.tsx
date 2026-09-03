import Link from "next/link";
import { Reveal } from "@/components/reveal";
import {
    BrainCircuit,
    ScanLine,
    Sparkles,
    Languages,
    SpellCheck2,
    ArrowRight,
} from "lucide-react";

const features = [
    {
        title: "AI Summary",
        description: "Generate concise summaries from lengthy reports, books and documents.",
        icon: BrainCircuit,
        badge: "Popular",
        slug: "aisummary-info",
    },
    {
        title: "OCR PDF",
        description: "Convert scanned PDFs and images into fully editable searchable text.",
        icon: ScanLine,
        badge: "OCR",
        slug: "ocrscanner-info",
    },
    {
        title: "Translate PDF",
        description: "Translate documents into multiple languages while preserving formatting.",
        icon: Languages,
        badge: "New",
        slug: "aitranslate-info",
    },
    {
        title: "Grammar Checker",
        description: "Check grammar and spelling of your document.",
        icon: SpellCheck2,
        badge: "Smart",
        slug: "aigrammar-info",
    },
];

export function AIFeatures() {
    return (
        <section className="relative overflow-hidden py-10 sm:py-16 px-4 sm:px-6">
            <div className="absolute inset-0 bg-background" />
            <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

            <div className="relative mx-auto max-w-7xl">
                <Reveal>
                    <div className="text-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
                            <Sparkles size={14} />
                            AI Powered Features
                        </span>

                        <h2 className="mt-3 sm:mt-4 text-2xl sm:text-3xl font-bold text-foreground md:text-4xl">
                            Supercharge your PDFs with AI
                        </h2>

                        <p className="mx-auto mt-3 max-w-xl text-base text-muted-foreground">
                            Save hours with intelligent document analysis, summaries, translations and AI-powered conversations.
                        </p>
                    </div>
                </Reveal>

                {/* Mobile tags removed, arrow symbol added on mobile, original badges kept on desktop */}
                <div className="mt-6 sm:mt-10 grid gap-2 sm:gap-5 md:grid-cols-2 lg:grid-cols-4">
                    {features.map((feature, index) => {
                        const Icon = feature.icon;

                        return (
                            <Link key={feature.title} href={`/${feature.slug}`} className="block h-full">
                                <Reveal delay={index * 50} className="h-full">
                                    <div className="group
                                        relative
                                        overflow-hidden
                                        rounded-xl sm:rounded-2xl
                                        border
                                        border-border
                                        bg-card
                                        p-2.5 sm:p-5
                                        shadow-sm
                                        transition-all
                                        hover:border-primary/40
                                        hover:shadow-xl
                                        flex flex-row sm:flex-col items-center sm:items-stretch h-full duration-200 hover:-translate-y-1.5 hover:scale-[1.01]">
                                        <div className="absolute right-0 top-0 h-24 w-24 sm:h-32 sm:w-32 rounded-full bg-primary/5 blur-2xl transition-all group-hover:bg-primary/10" />

                                        <div className="flex sm:flex-row items-center justify-between sm:w-full">
                                            <div className="group/icon relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 via-primary/5 to-primary/15 ring-1 ring-primary/20 shadow-[0_0_0_4px_color-mix(in_srgb,var(--primary)_4%,transparent),0_8px_20px_color-mix(in_srgb,var(--primary)_12%,transparent)] motion-safe:animate-icon-pulse transition-all duration-300 group-hover/icon:ring-primary/40 group-hover/icon:shadow-[0_0_0_5px_color-mix(in_srgb,var(--primary)_8%,transparent),0_10px_26px_color-mix(in_srgb,var(--primary)_24%,transparent)] sm:h-11 sm:w-11 sm:rounded-2xl">
                                                <span className="pointer-events-none absolute inset-0 -translate-x-full rotate-12 bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 transition-opacity duration-300 group-hover/icon:animate-shimmer group-hover/icon:opacity-100 dark:via-white/25" />
                                                <Icon className="relative z-10 h-4 w-4 text-primary transition-transform duration-300 group-hover/icon:rotate-3 group-hover/icon:scale-110 sm:h-5 sm:w-5" />
                                            </div>

                                            {/* Badge hidden on mobile, visible on desktop */}
                                            <span className="hidden sm:inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                                                {feature.badge}
                                            </span>
                                        </div>

                                        <div className="ml-3 sm:ml-0 flex-1 sm:flex-none flex items-center justify-between sm:block">
                                            <h3 className="text-xs sm:text-lg font-bold sm:font-semibold text-foreground sm:mt-4">
                                                {feature.title}
                                            </h3>

                                            {/* Arrow icon shown only on mobile to go to next page */}
                                            <div className="sm:hidden text-primary shrink-0 p-1">
                                                <ArrowRight size={16} />
                                            </div>

                                            {/* Description hidden on mobile */}
                                            <p className="hidden sm:block mt-2 text-sm font-normal leading-relaxed text-muted-foreground line-clamp-2">
                                                {feature.description}
                                            </p>
                                        </div>

                                        <div className="hidden sm:flex mt-auto items-center gap-1 pt-4 text-sm font-medium text-primary transition group-hover:gap-2">
                                            <span>Learn More</span>
                                            <ArrowRight size={16} />
                                        </div>
                                    </div>
                                </Reveal>
                            </Link>
                        );
                    })}
                </div>

                <Reveal>
                    <div className="mt-6 sm:mt-10 text-center">
                        <Link
                            href="/tools?category=AI%20Tools"
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-xl
                                bg-primary
                                px-6
                                py-3
                                text-sm
                                font-semibold
                                text-primary-foreground
                                transition
                                hover:opacity-90
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