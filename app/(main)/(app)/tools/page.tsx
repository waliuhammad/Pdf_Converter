import type { Metadata } from "next";
import { ToolsHub } from "@/components/tools/tools-hub";

export const metadata: Metadata = {
    title: "All Tools",
    description: "Every PDF tool in one place — convert, edit, organise and secure your documents.",
};

/**
 * Static. This used to await searchParams to seed the category filter, which
 * made the whole page server-render on every request — the browse page that
 * gets hit most, rebuilt each time for a value that never changes the tool
 * list, only which of it is shown. ToolsHub reads ?category from the URL after
 * mount instead, so the full grid is prerendered and served from the CDN.
 */
export default function ToolsPage() {
    return <ToolsHub />;
}
