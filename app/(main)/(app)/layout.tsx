import { AppChrome } from "@/components/app-chrome";
import { LibraryLoader } from "@/components/library-loader";

/**
 * Chrome for the signed-in app area. The PDF tools live here and stay usable
 * without an account — only the routes under (protected) require sign-in,
 * which is why AppChrome picks the frame from the session rather than this
 * layout assuming everyone here is signed in.
 *
 * LibraryLoader keeps the library store in sync with the signed-in user:
 * mounted here (rather than in (protected)) so a signed-in user's history
 * is already loaded even while they're on an open tool page.
 */
export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <>
            <LibraryLoader />
            <AppChrome>{children}</AppChrome>
        </>
    );
}
