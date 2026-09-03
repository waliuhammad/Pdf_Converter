import type { Metadata } from "next";
import { Navbar } from "@/components/navbar";
import Pricing from "@/components/pricing";
import FAQ from "@/components/faq";
import Footer from "@/components/footer";

export const metadata: Metadata = {
    title: "Pricing",
    description: "Simple plans for every workflow — start free and upgrade when you need more.",
};

export default function PricingPage() {
    return (
        <main className="min-h-screen bg-background text-fg">
            <Navbar />
            <Pricing heading="h1" />
            <FAQ />
            <Footer />
        </main>
    );
}
