import Link from "next/link";
import { Reveal } from "@/components/reveal";
import {
    ArrowRight,
    Sparkles,
    ShieldCheck,
    Zap,
    FileText
} from "lucide-react";


export function CTA() {

    const benefits = [
        {
            icon: Zap,
            text: "AI powered PDF processing"
        },
        {
            icon: ShieldCheck,
            text: "Secure & private files"
        },
        {
            icon: FileText,
            text: "50+ PDF tools available"
        }
    ];


    return (

        <section className="px-4 sm:px-6 py-12 sm:py-20">

            <Reveal>
<div className="relative
                    overflow-hidden
                    max-w-5xl
                    mx-auto
                    rounded-3xl
                    border
                    border-border
                    bg-card
                    p-8
                    md:p-12
                    shadow-xl">


                {/* Glow */}

                <div
                    className="
                        absolute
                        -right-20
                        -top-20
                        h-72
                        w-72
                        rounded-full
                        bg-primary/20
                        blur-3xl
                    "
                />



                <div
                    className="
                        relative
                        z-10
                        grid
                        lg:grid-cols-2
                        gap-10
                        items-center
                    "
                >



                    {/* Left Content */}

                    <div>


                        <div
                            className="
                                inline-flex
                                items-center
                                gap-2
                                rounded-full
                                bg-primary/10
                                px-3.5
                                py-1.5
                                text-xs
                                font-medium
                                text-primary
                            "
                        >

                            <Sparkles size={15} />

                            Trusted AI PDF Workspace

                        </div>



                        <h2
                            className="
                                mt-4
                                text-2xl
                                sm:text-3xl
                                md:text-4xl
                                font-bold
                                leading-tight
                                text-fg
                            "
                        >

                            Transform your PDFs
                            <br />

                            with powerful AI

                        </h2>



                        <p
                            className="
                                mt-3.5
                                max-w-lg
                                text-sm
                                md:text-base
                                leading-relaxed
                                text-muted
                            "
                        >

                            Convert, summarize, edit and analyze
                            documents instantly with intelligent AI tools
                            built for modern workflows.

                        </p>



                        {/* Rating */}

                        <div
                            className="
                                mt-5
                                flex
                                items-center
                                gap-3
                                text-xs
                                md:text-sm
                                text-muted
                            "
                        >

                            <div className="flex text-yellow-400">

                                ★★★★★

                            </div>


                            <span>
                                4.9/5 from 50,000+ users
                            </span>


                        </div>




                        {/* Buttons */}

                        <div
                            className="
                                mt-7
                                flex
                                flex-wrap
                                gap-3.5
                            "
                        >

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
                                href="/pricing"
                                className="
                                    rounded-xl
                                    border
                                    border-border
                                    px-6
                                    py-3
                                    text-sm
                                    font-semibold
                                    text-fg
                                    transition
                                    hover:bg-primary
                                    hover:!text-primary-foreground
                                    hover:border-primary
                                "
                            >

                                View Pricing

                            </Link>


                        </div>


                    </div>





                    {/* Right Card */}

                    <div
                        className="
                            rounded-2xl
                            bg-[var(--background-secondary)]
                            border
                            border-border
                            p-4
                            sm:p-6
                        "
                    >

                        <h3
                            className="
                                text-base
                                md:text-lg
                                font-semibold
                                text-fg
                                mb-5
                            "
                        >

                            Everything you need

                        </h3>




                        <div className="space-y-4">


                            {
                                benefits.map((item) => {

                                    const Icon = item.icon;

                                    return (

                                        <div
                                            key={item.text}
                                            className="
                                                flex
                                                items-center
                                                gap-3.5
                                            "
                                        >

                                            <div
                                                className="
                                                    h-10
                                                    w-10
                                                    rounded-xl
                                                    bg-primary/10
                                                    flex
                                                    items-center
                                                    justify-center
                                                "
                                            >

                                                <Icon
                                                    size={19}
                                                    className="text-primary"
                                                />

                                            </div>


                                            <span
                                                className="
                                                    text-xs
                                                    md:text-sm
                                                    text-fg
                                                    font-medium
                                                "
                                            >
                                                {item.text}
                                            </span>


                                        </div>

                                    )

                                })
                            }


                        </div>



                        <div
                            className="
                                mt-6
                                rounded-xl
                                bg-card
                                border
                                border-border
                                p-4
                            "
                        >

                            <p className="text-xs text-muted">
                                Start using PDF AI today.
                            </p>

                            <p className="
                                mt-0.5
                                text-xs
                                md:text-sm
                                font-semibold
                                text-fg
                            ">
                                No credit card required 🚀
                            </p>


                        </div>


                    </div>


                </div>


            </div>
</Reveal>


        </section>

    );
}
