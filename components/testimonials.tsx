import { Reveal } from "@/components/reveal";
import { Star, Quote } from "lucide-react";

const testimonials = [
    {
        name: "Sarah Ahmed",
        role: "Product Designer",
        company: "Adobe",
        review:
            "PDF AI completely transformed the way I work with documents. The AI summary saves me hours every week.",
    },
    {
        name: "James Walker",
        role: "Project Manager",
        company: "Microsoft",
        review:
            "Fast, reliable and incredibly easy to use. OCR and PDF conversion are the best I've tried.",
    },
    {
        name: "Emily Carter",
        role: "Marketing Lead",
        company: "Spotify",
        review:
            "Our team processes hundreds of PDFs every month. PDF AI made the workflow effortless.",
    },
];

export default function Testimonials() {
    return (
        <section id="testimonials" className="relative overflow-hidden px-4 sm:px-6 py-10 sm:py-16 bg-[var(--background-secondary)]">

            {/* Background Glow */}
            <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />

            <div className="relative z-10 max-w-6xl mx-auto">

                {/* Header */}

                <div className="text-center">

                    <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-primary text-xs font-medium">

                        ⭐ Trusted Worldwide

                    </div>

                    <h2 className="mt-3 text-2xl sm:text-3xl font-bold text-fg">

                        Loved by thousands of professionals

                    </h2>

                    <p className="mt-2 text-sm text-muted max-w-xl mx-auto">

                        Join over 50,000 users who rely on PDF AI every day.

                    </p>

                </div>

                {/* Trust Stats */}

                <div className="mt-6 sm:mt-8 grid grid-cols-3 gap-3 sm:gap-6 text-center max-w-3xl mx-auto">

                    <div>

                        <h3 className="text-2xl font-bold text-primary">50K+</h3>

                        <p className="text-xs text-muted mt-1">Active Users</p>

                    </div>

                    <div>

                        <h3 className="text-2xl font-bold text-primary">5.0★</h3>

                        <p className="text-xs text-muted mt-1">Average Rating</p>

                    </div>

                    <div>

                        <h3 className="text-2xl font-bold text-primary">150+</h3>

                        <p className="text-xs text-muted mt-1">Countries</p>

                    </div>

                </div>

                {/* Cards */}

                <div className="mt-8 sm:mt-10 grid gap-4 sm:gap-6 md:grid-cols-3">

                    {testimonials.map((item, index) => (

                        <Reveal key={item.name} delay={index * 100} className="h-full">
                            <div className="relative rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-lg hover:border-primary/40 transition-all h-full duration-200 hover:-translate-y-1.5 hover:scale-[1.01]">

                            <Quote
                                className="absolute right-4 top-4 sm:right-5 sm:top-5 size-6 sm:size-8 text-primary/20"
                            />

                            {/* pr-8 keeps a long name or company from running under
                                the quote mark in the corner. */}
                            <div className="flex items-center gap-3 sm:gap-3.5 pr-8">

                                {/* Was an <img> from i.pravatar.cc, a random-avatar
                                    service: three third-party requests on every visit,
                                    and photographs of strangers presented as customers.
                                    Initials say as much and cost nothing. */}
                                <div
                                    aria-hidden="true"
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
                                >
                                    {item.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}
                                </div>

                                <div>

                                    <h4 className="font-semibold text-sm text-fg">
                                        {item.name}
                                    </h4>

                                    <p className="text-xs text-muted">
                                        {item.role}
                                    </p>

                                    <p className="text-[11px] text-primary font-medium">
                                        {item.company}
                                    </p>

                                </div>

                            </div>

                            <div className="mt-4 flex text-yellow-500">

                                {[1, 2, 3, 4, 5].map((star) => (

                                    <Star
                                        key={star}
                                        size={15}
                                        fill="currentColor"
                                    />

                                ))}

                            </div>

                            <p className="mt-4 text-xs leading-relaxed text-muted">

                                &ldquo;{item.review}&rdquo;

                            </p>

                        </div>
                        </Reveal>

                    ))}

                </div>

            </div>

        </section>
    );
}
