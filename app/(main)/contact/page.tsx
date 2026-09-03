import type { Metadata } from "next";
import { ContentPage } from "@/components/marketing/content-page";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
    title: "Contact",
    description: "Get in touch with the PDFAI team.",
};

export default function ContactPage() {
    return (
        <ContentPage
            title="Contact us"
            intro="Questions, bug reports or feedback — send them here and we'll get back to you."
        >
            <ContactForm />
        </ContentPage>
    );
}
