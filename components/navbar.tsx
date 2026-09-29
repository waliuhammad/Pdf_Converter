"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isToolPath } from "@/lib/tool-paths";
import { useState, useEffect } from "react";
import { Menu, X, FileText } from "lucide-react";

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
    <header className="sticky top-0 z-50 bg-background px-3 py-1.5 sm:px-5 sm:py-2">
      <div className="mx-auto flex h-14 w-full max-w-none items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card px-4 shadow-sm sm:h-16 sm:px-7 lg:px-9">
        {/* Logo */}
        {/* min-w-0 + truncate: the tagline is the one piece of the bar that can
            grow, so it shortens rather than pushing the actions off a 320px
            screen. */}
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-11 sm:w-11">
            <FileText size={21} strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-fg sm:text-xl">PDF AI</h2>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-1 rounded-full border border-border/70 bg-background-secondary p-1 lg:flex">
          {navLinks.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleNavClick(e, item.href)}
                className={`rounded-full px-6 py-2.5 text-[15px] font-medium transition ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:bg-primary/10 hover:text-primary"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-4 lg:flex">
          <Link
            href="/login"
            className="px-1 py-2 text-base font-semibold text-fg transition hover:text-primary"
          >
            Login
          </Link>

          <Link
            href="/register"
            className="rounded-xl bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Start free
          </Link>
        </div>

        {/* Mobile menu button */}
        <div className="flex items-center gap-1 lg:hidden">
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            // p-2.5 around a 24px icon gives a 44px target, the minimum
            // comfortable tap size.
            className="rounded-lg p-2.5"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {open && (
          <div
            className="border-t border-border bg-background lg:hidden animate-menu-in"
          >
            <div className="space-y-1 px-4 py-4 sm:space-y-2 sm:px-6 sm:py-6">
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
                    className={`block rounded-xl px-4 py-3 transition ${
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-primary/10 hover:text-primary"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-border py-3 text-center font-medium transition hover:border-primary hover:text-primary"
                >
                  Login
                </Link>

                <Link
                  href="/register"
                  onClick={() => setOpen(false)}
                  className="rounded-xl bg-primary py-3 text-center font-semibold text-primary-foreground transition hover:bg-primary/90"
                >
                  Start free
                </Link>
              </div>
            </div>
          </div>
        )}
    </header>
  );
}