"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isToolPath } from "@/lib/tool-paths";
import { useState, useEffect } from "react";
import { Menu, X, FileText, LayoutDashboard } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/useAuth";

/** Root-relative, not bare hashes. This navbar renders on the content pages
 *  (/terms, /privacy, /about, …) as well as the landing page, and a bare
 *  "#tools" there points at a section that does not exist — the link did
 *  nothing at all. "/#tools" navigates home and lands on the section. */
const navLinks = [
  // `page` is the real route this link also stands for. The active state was
  // decided purely by the landing page's hash, so on /tools — a page of its
  // own, with no #tools section in it — nothing matched and no link was
  // underlined at all. Same on /pricing.
  { name: "Tools", href: "/#tools", page: "/tools" },
  { name: "How it Works", href: "/#how-it-works" },
  { name: "Pricing", href: "/#pricing", page: "/pricing" },
  { name: "FAQ", href: "/#faq" },
];

/** "/#tools" -> "#tools". The hash alone is what the DOM and the URL bar use. */
const hashOf = (href: string) => href.slice(href.indexOf("#"));

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("");
  const pathname = usePathname();
  // Signed-in visitors get a way back to their dashboard instead of being
  // offered "Login" and "Start free" for an account they already have.
  const { user, loading } = useAuth();

  /**
   * Which link to underline.
   *
   * On the landing page the sections are what the visitor is looking at, so
   * the hash decides. Anywhere else there are no sections to observe and the
   * route is the only thing that says where they are.
   */
  const isActive = (item: (typeof navLinks)[number]) => {
    if (pathname === "/") return activeHash === hashOf(item.href);

    // A tool's own page is still "Tools" as far as the bar is concerned —
    // /merge-pdf is not a section anywhere, so without this nothing lights up
    // on any of the twenty-one tool pages.
    if (item.page === "/tools") return isToolPath(pathname);

    return item.page === pathname;
  };

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    const hash = hashOf(href);
    const element = document.getElementById(hash.slice(1));

    // Not on this page — leave the click to the Link, which navigates home and
    // lets the browser scroll to the section. /pricing renders #pricing and
    // #faq itself, so those two still scroll in place there.
    if (!element) return;

    e.preventDefault();

    if (hash === "#hero") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      element.scrollIntoView({ behavior: "smooth" });
    }

    // The hash alone, so the current path is preserved rather than rewritten.
    window.history.pushState(null, "", hash);
    setActiveHash(hash);
  };

  useEffect(() => {
    // The hash never reaches the server — browsers do not send it — so this
    // cannot be the initial state without the server rendering "#" and the
    // client rendering something else, which is a hydration mismatch. Reading
    // it once on mount is the correct shape here, and the extra render is one
    // class change on a nav link.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveHash(window.location.hash || "#");

    const handleHashChange = () => {
      setActiveHash(window.location.hash || "#");
    };

    window.addEventListener("hashchange", handleHashChange);

    // getElementById, not querySelector — "/#tools" is not a valid selector.
    // On the content pages this finds nothing and the observer simply idles.
    const ids = navLinks.map((link) => hashOf(link.href).slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    /**
     * The section filling most of the screen is the one being read.
     *
     * This replaced an IntersectionObserver with a 0.4 threshold, which could
     * not work here for two reasons. A threshold is a fraction of the section,
     * and the tools section is nearly twice the viewport — 40% of it is never
     * on screen at once, so it could never qualify. And the callback let every
     * intersecting section set the hash, so the last one in the array won and
     * nothing happened when a section left. Scrolling from the hero into the
     * tools section left the underline on Home, which is what this fixes.
     *
     * Comparing visible height needs no threshold and no tuned band: it gives
     * the same answer at every scroll position, including part-way between two
     * sections.
     */
    const pickActive = () => {
      const viewportHeight = window.innerHeight;
      let winner = "";
      let mostVisible = 0;

      for (const section of sections) {
        const box = section.getBoundingClientRect();
        const visible =
          Math.min(box.bottom, viewportHeight) - Math.max(box.top, 0);

        if (visible > mostVisible) {
          mostVisible = visible;
          winner = section.id;
        }
      }

      if (winner) setActiveHash(`#${winner}`);
    };

    // One measurement per frame at most: five rects is cheap, but not once per
    // scroll event.
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pickActive();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    // Through rAF rather than straight away, so the first paint is not a
    // second render triggered from inside this effect.
    const initial = requestAnimationFrame(pickActive);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(initial);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/90 dark:bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 sm:h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400">
            <FileText size={20} strokeWidth={2.4} />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-foreground">PDF AI</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 rounded-full border border-border/80 bg-background/80 p-1 lg:flex">
          {navLinks.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`rounded-full px-4.5 py-1.5 text-sm font-medium transition-all ${
                  active
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 lg:flex">
          <ThemeToggle />

          {loading ? (
            // Holds the space while sign-in is checked, so neither state
            // flashes and the bar does not jump when the answer arrives.
            <div className="h-9 w-[168px]" aria-hidden="true" />
          ) : user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4.5 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-sm active:scale-98"
            >
              <LayoutDashboard size={16} />
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
              >
                Login
              </Link>

              <Link
                href="/register"
                className="rounded-xl bg-primary px-4.5 py-2 text-sm font-semibold text-primary-foreground shadow-xs transition-all hover:bg-primary/90 hover:shadow-sm active:scale-98"
              >
                Start free
              </Link>
            </>
          )}
        </div>

        {/* Mobile controls */}
        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />

          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-foreground"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="border-t border-border bg-card lg:hidden animate-menu-in">
          <div className="space-y-1 px-4 py-4 sm:px-6">
            {navLinks.map((item) => {
              const active = isActive(item);

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={(e) => {
                    setOpen(false);
                    handleNavClick(e, item.href);
                  }}
                  className={`block rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-400 font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}

            <div className="mt-4 flex flex-col gap-2 pt-2 border-t border-border">
              {loading ? null : user ? (
                <Link
                  href="/dashboard"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  <LayoutDashboard size={16} />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-border py-2.5 text-center text-sm font-medium text-foreground transition hover:border-primary hover:text-primary"
                  >
                    Login
                  </Link>

                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
                  >
                    Start free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}