"use client";



import { useToolText } from "@/hooks/useToolText";

interface CategoryFilterProps {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
}


const categories = [
    "All Tools",
    "Convert",
    "Edit",
    "AI Tools",
    "Security",
    "Organize",
];



export default function CategoryFilter({
    activeCategory,
    setActiveCategory,
}: CategoryFilterProps) {
    const { categoryLabel } = useToolText();


    return (

        // On a phone six pills wrapped to three rows. They scroll in one row
        // instead, bleeding to the screen edges via the negative margin so the
        // row reads as scrollable rather than clipped. From sm up it is the
        // original centred wrap. The bottom margin lived here *and* on the
        // wrapper in tools-grid, which is where the doubled gap came from.
        <div className="flex flex-wrap gap-2">

            {categories.map((category) => (


                <button

                    key={category}

                    onClick={() =>
                        setActiveCategory(category)
                    }

                    className={`
                        relative
                        shrink-0
                        rounded-full
                        px-3.5
                        sm:px-5
                        py-2
                        sm:py-2.5
                        text-xs
                        sm:text-sm
                        font-medium
                        whitespace-nowrap
                        transition-all
                        duration-300
                        hover:-translate-y-0.5
                        active:scale-95
                        border

                        ${activeCategory === category

                            ? "border-primary bg-primary text-primary-foreground shadow-lg"

                            : `
                                border-border
                                bg-card
                                text-foreground/80
                                hover:border-foreground/30
                                hover:bg-muted
                            `
                        }
                    `}
                >

                    {categoryLabel(category)}


                    {/* Was a layoutId span that slid between pills. Toggling opacity keeps
                        the highlight without framer's shared layout engine. */}
                </button>


            ))}


        </div>

    );
}
