import Link from "next/link";
import { FileText } from "lucide-react";
import {
    FaLinkedin,
    FaGithub,
    FaTwitter,
} from "react-icons/fa";


/** `href` is omitted where the destination page doesn't exist yet — those render
 *  as plain text rather than as links that would 404. */
interface FooterLink {
    label: string;
    href?: string;
}

const productLinks: FooterLink[] = [
    { label: "Merge PDF", href: "/merge-pdf" },
    { label: "Compress PDF", href: "/compress-pdf" },
    // Labels match the names in lib/tools.ts, so the footer and the tools grid
    // call the same tool the same thing.
    { label: "Edit PDF", href: "/edit-pdf" },
    { label: "OCR PDF", href: "/ocr-pdf" },
];


const companyLinks: FooterLink[] = [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Pricing", href: "/pricing" },
    { label: "Blog", href: "/blog" },
];


const legalLinks: FooterLink[] = [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Security", href: "/security" },
];


function FooterLinkList({ links }: { links: FooterLink[] }) {
    // inline-block with vertical padding, so each link is a 24px-tall tap
    // target on a phone rather than a 16px line of text.
    return (
        <ul className="space-y-1">
            {links.map((link) => (
                <li key={link.label} className="text-sm">
                    {link.href ? (
                        <Link
                            href={link.href}
                            className="inline-block py-1.5 text-muted hover:text-primary transition-colors"
                        >
                            {link.label}
                        </Link>
                    ) : (
                        <span className="inline-block py-1.5 text-muted">{link.label}</span>
                    )}
                </li>
            ))}
        </ul>
    );
}


export default function Footer() {

    return (
        <footer
            className="
                border-t
                border-border
                bg-[var(--background-secondary)]
                px-6
                py-16
            "
        >

            <div
                className="
                    max-w-6xl
                    mx-auto
                    grid
                    md:grid-cols-4
                    gap-10
                "
            >

                {/* Brand — centred on a phone to match the three link columns
                    below it, left-aligned from md as on desktop. */}

                <div className="text-center md:text-left">

                    <div
                        className="
                            flex
                            items-center
                            justify-center
                            md:justify-start
                            gap-2
                            mb-4
                        "
                    >

                        <div
                            className="
                                w-10
                                h-10
                                rounded-xl
                                bg-primary
                                flex
                                items-center
                                justify-center
                            "
                        >
                            <FileText className="text-primary-foreground" />
                        </div>


                        <h2 className="
                            text-xl
                            font-bold
                            text-fg
                        ">
                            PDF AI
                        </h2>

                    </div>


                    <p className="
                        text-muted
                        text-sm
                        leading-relaxed
                    ">
                        All-in-one PDF tools powered by modern technology and AI.
                    </p>


                    <div className="
                        flex
                        justify-center
                        md:justify-start
                        gap-4
                        mt-5
                    ">

                        <FaTwitter
                            className="
                                w-5
                                h-5
                                text-muted
                                hover:text-primary
                                cursor-pointer
                            "
                        />

                        <FaLinkedin
                            className="
                                w-5
                                h-5
                                text-muted
                                hover:text-primary
                                cursor-pointer
                            "
                        />

                        <FaGithub
                            className="
                                w-5
                                h-5
                                text-muted
                                hover:text-primary
                                cursor-pointer
                            "
                        />

                    </div>

                </div>



                {/* The three link groups. They stacked one under another on a
                    phone; this wrapper puts them in a single row there, and
                    md:contents dissolves it on desktop so each group is a direct
                    child of the outer grid again and the four-column layout is
                    unchanged. */}

                <div className="grid grid-cols-3 gap-2 sm:gap-6 md:contents">


                    {/* Product */}

                    <div className="text-center md:text-left">

                        <h3 className="
                            font-semibold
                            text-fg
                            mb-4
                        ">
                            Product
                        </h3>


                        <FooterLinkList links={productLinks} />

                    </div>




                    {/* Company */}

                    <div className="text-center md:text-left">

                        <h3 className="
                            font-semibold
                            text-fg
                            mb-4
                        ">
                            Company
                        </h3>


                        <FooterLinkList links={companyLinks} />

                    </div>




                    {/* Legal */}

                    <div className="text-center md:text-left">

                        <h3 className="
                            font-semibold
                            text-fg
                            mb-4
                        ">
                            Legal
                        </h3>


                        <FooterLinkList links={legalLinks} />

                    </div>

                </div>


            </div>



            <div
                className="
                    max-w-6xl
                    mx-auto
                    mt-12
                    pt-6
                    border-t
                    border-border
                    text-center
                    text-sm
                    text-muted
                "
            >
                © {new Date().getFullYear()} PDF AI. All rights reserved.
            </div>


        </footer>
    );
}