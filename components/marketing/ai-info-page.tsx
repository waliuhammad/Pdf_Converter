import Link from "next/link";
import { ContentPage, Section } from "@/components/marketing/content-page";
import { toolGuides } from "@/lib/tool-guides";

/**
 * The landing page for one AI feature: what it is for, then the same steps and
 * caveats shown under the tool itself (lib/tool-guides.ts), so the two can't
 * drift apart.
 */
export function AiInfoPage({
    title,
    intro,
    href,
    toolLabel,
    children,
}: {
    title: string;
    intro: string;
    href: string;
    toolLabel: string;
    children: React.ReactNode;
}) {
    const guide = toolGuides[href];

    return (
        <ContentPage title={title} intro={intro}>
            <Section heading="What it does">{children}</Section>

            {guide && (
                <>
                    <Section heading="How to use it">
                        <ol className="list-decimal space-y-2 pl-5">
                            {guide.steps.map((step) => (
                                <li key={step}>{step}</li>
                            ))}
                        </ol>
                    </Section>
                    <Section heading="Good to know">
                        <ul className="list-disc space-y-2 pl-5">
                            {guide.notes.map((note) => (
                                <li key={note}>{note}</li>
                            ))}
                        </ul>
                    </Section>
                </>
            )}

            <div>
                <Link
                    href={href}
                    className="inline-flex items-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-[var(--primary-hover)] transition-colors"
                >
                    Open {toolLabel}
                </Link>
            </div>
        </ContentPage>
    );
}
