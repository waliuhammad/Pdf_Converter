import { Navbar } from "@/components/navbar";
import { ToolsGrid } from "@/components/tools-grid";
import { AIFeatures } from "@/components/ai-features";
import { HowItWorks } from "@/components/how-it-works";
import Pricing from "@/components/pricing";
import FAQ from "@/components/faq";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-fg">
      <Navbar />

      <ToolsGrid />

      <AIFeatures />

      <HowItWorks />

      <Pricing />

      <FAQ />


      <Footer />
    </main>
  );
}