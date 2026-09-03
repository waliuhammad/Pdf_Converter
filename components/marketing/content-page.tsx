import { Navbar } from "@/components/navbar";
import Footer from "@/components/footer";

/**
 * Shared shell for the standalone content pages (about, contact, blog, legal),
 * which sit outside the app sidebar and carry the marketing chrome instead.
 */
export function ContentPage({
    title,
    intro,
    children,
}: {
    title: string;
    intro?: string;
    children: React.ReactNode;
}) {
    return (
        <main className="min-h-screen bg-background text-fg flex flex-col">
            <Navbar />

            <section className="flex-1 w-full mx-auto max-w-3xl px-6 py-14 lg:py-20">
                <h1 className="text-3xl lg:text-4xl font-bold text-fg">{title}</h1>
                {intro && <p className="mt-4 text-muted leading-7">{intro}</p>}
                <div className="mt-10 space-y-8">{children}</div>
            </section>

            <Footer />
        </main>
    );
}

export function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-xl font-semibold text-fg mb-3">{heading}</h2>
            <div className="text-muted leading-7 space-y-3">{children}</div>
        </section>
    );
}
