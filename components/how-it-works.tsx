import { Reveal } from "@/components/reveal";
import {
    Upload,
    MousePointerClick,
    Download
} from "lucide-react";


const steps = [
    {
        icon: Upload,
        number: "01",
        title: "Choose a PDF tool",
        description:
            "Select from powerful tools to convert, edit, secure, or analyze your document.",
    },

    {
        icon: MousePointerClick,
        number: "02",
        title: "Upload your file",
        description:
            "Drag and drop your PDF or choose a file directly from your device.",
    },

    {
        icon: Download,
        number: "03",
        title: "Download result",
        description:
            "Get your processed file instantly with quality and security maintained.",
    },
];



export function HowItWorks() {

    return (

        <section
            id="how-it-works"
            className="
                px-4
                sm:px-6
                py-12
                sm:py-20
                bg-[var(--background-secondary)]
            "
        >

            <div className="max-w-7xl mx-auto">


                {/* Heading */}

                <div className="
                    text-center
                    mb-12
                ">


                    <Reveal>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-fg">
                            Complete your PDF task in minutes
                        </h2>
                    </Reveal>



                    <Reveal delay={100}>
                        <p className="mt-3 text-sm md:text-base text-muted max-w-xl mx-auto">
                            Simple workflow designed for everyone.
                            Upload, process, and download your document.
                        </p>
                    </Reveal>


                </div>




                {/* Steps */}

                <div className="
                    grid
                    grid-cols-1
                    md:grid-cols-3
                    gap-6
                ">


                    {steps.map((step, index) => (


                        <Reveal key={step.title} delay={index * 150} className="h-full">
<div className="relative h-full
                                rounded-2xl
                                border
                                border-[var(--card-border)]
                                bg-[var(--card)]
                                p-5
                                sm:p-7
                                text-center
                                transition duration-200 hover:-translate-y-1.5 hover:scale-[1.01]">



                            {/* Number */}

                            <div className="
                                text-5xl
                                font-bold
                                text-[var(--primary)]/10
                            ">
                                {step.number}
                            </div>




                            {/* Icon */}

                            <div className="
                                mx-auto
                                -mt-7
                                mb-4
                                flex
                                h-14
                                w-14
                                items-center
                                justify-center
                                rounded-xl
                                bg-[var(--primary)]/10
                            ">

                                <step.icon
                                    size={26}
                                    className="
                                        text-[var(--primary)]
                                    "
                                />

                            </div>




                            {/* Content */}

                            <h3 className="
                                text-lg
                                font-semibold
                                text-fg
                                mb-2
                            ">

                                {step.title}

                            </h3>



                            <p className="
                                text-sm
                                leading-relaxed
                                text-muted
                            ">

                                {step.description}

                            </p>




                            {/* Connector */}

                            {
                                index < steps.length - 1 && (

                                    <>
                                        {/* Vertical on a phone, where the steps
                                            stack, so the sequence still reads as
                                            one flow. It sits in the grid's gap-6.
                                            Mobile had no connector at all before. */}
                                        <div
                                            className="
                                                md:hidden
                                                absolute
                                                -bottom-6
                                                left-1/2
                                                h-6
                                                w-px
                                                -translate-x-1/2
                                                bg-[var(--card-border)]
                                            "
                                        />

                                        <div
                                            className="
                                                hidden
                                                md:block
                                                absolute
                                                top-1/2
                                                -right-1/2
                                                w-full
                                                h-px
                                                bg-[var(--card-border)]
                                            "
                                        />
                                    </>

                                )
                            }


                        </div>
</Reveal>


                    ))}


                </div>


            </div>


        </section>

    );
}
