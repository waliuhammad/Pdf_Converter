import { MaintenanceBanner } from "@/components/maintenance-banner";
import DevPlanSwitcher from "@/components/dev/DevPlanSwitcher";
import { TestPlanProvider } from "@/components/dev/TestPlanProvider";
import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { getAdsensePublisherId } from "@/lib/adsense";
import { Inter, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "../components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();
const adsensePublisherId = getAdsensePublisherId();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Each tool sets only its own title; this frames it.
  title: {
    default: "PDF AI — Every PDF tool you need, in one place",
    template: "%s | PDF AI",
  },
  description: "Every PDF tool you need, in one place.",
  openGraph: {
    siteName: "PDF AI",
    // No url here: set at the root, every page inherited it and told social
    // sites it was the homepage. The canonical link carries the real address.
    type: "website",
  },
  // AdSense's site-ownership tag. Verification only: no ad script is loaded.
  ...(adsensePublisherId && {
    other: { "google-adsense-account": `ca-${adsensePublisherId}` },
  }),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* No theme picker any more: the site follows the visitor's device.
            A new storageKey, so a Light/Dark choice saved by the old Settings
            tab no longer sticks with no way to change it. */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          storageKey="pdfai-theme"
          disableTransitionOnChange
        >
          {/* Wraps everything, so the language chosen in Settings applies to
              the marketing pages and the tools as well as the signed-in area. */}
          <LocaleProvider>
            <TestPlanProvider>
              <MaintenanceBanner />
              {children}
              <DevPlanSwitcher />
            </TestPlanProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}