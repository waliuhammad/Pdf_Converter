import Link from "next/link";
import { toolGuides } from "@/lib/tool-guides";
import { tools } from "@/lib/tools";

/**
 * How-to text under a tool, rendered on the server so it is part of the page
 * people and search engines receive, not something that appears after the
 * tool's client code has loaded.
 */
export function ToolGuide({ href }: { href: string }) {
    const guide = toolGuides[href];
    const tool = tools.find((t) => t.href === href);
    if (!guide || !tool) return null;

    return (
        <section
            aria-labelledby="tool-guide-heading"
            className="max-w-3xl mx-auto w-full px-4 sm:px-6 mt-12 mb-6 border-t border-border pt-10 text-foreground"
        >
            <h2 id="tool-guide-heading" className="text-xl font-semibold">
                How to use {tool.name}
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                {guide.steps.map((step) => (
                    <li key={step}>{step}</li>
                ))}
            </ol>

            {guide.notes.length > 0 && (
                <>
                    <h3 className="mt-8 text-base font-semibold">Good to know</h3>
                    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                        {guide.notes.map((note) => (
                            <li key={note}>{note}</li>
                        ))}
                    </ul>
                </>
            )}

            <p className="mt-8 text-sm text-muted-foreground">
                Using the tools needs a free account, with a daily allowance on each plan — see{" "}
                <Link href="/pricing" className="text-primary hover:underline">pricing</Link>. How
                files are handled is set out in our{" "}
                <Link href="/privacy" className="text-primary hover:underline">privacy policy</Link>.
            </p>
        </section>
    );
}
