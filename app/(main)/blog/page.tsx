import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { ContentPage } from "@/components/marketing/content-page";

export const metadata: Metadata = {
    title: "Blog",
    description: "Product updates and writing from the PDFAI team.",
};

/** No posts exist yet, so this renders an empty state rather than sample articles. */
const posts: { slug: string; title: string; excerpt: string; date: string }[] = [];

export default function BlogPage() {
    return (
        <ContentPage title="Blog" intro="Product updates, release notes and writing from the team.">
            {posts.length === 0 ? (
                <div className="text-center py-14 rounded-2xl border border-card bg-card">
                    <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--background-secondary)] flex items-center justify-center mb-3">
                        <PenLine size={20} className="text-muted" />
                    </div>
                    <p className="text-fg font-medium mb-1">No posts yet</p>
                    <p className="text-sm text-muted">
                        Nothing published so far — check back soon.
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                    {posts.map((post) => (
                        <article key={post.slug} className="border-b border-card pb-6 last:border-0">
                            <p className="text-xs text-muted mb-1">{post.date}</p>
                            <h2 className="text-lg font-semibold text-fg">
                                <Link href={`/blog/${post.slug}`} className="hover:text-[var(--primary)]">
                                    {post.title}
                                </Link>
                            </h2>
                            <p className="text-muted text-sm mt-2 leading-6">{post.excerpt}</p>
                        </article>
                    ))}
                </div>
            )}
        </ContentPage>
    );
}
