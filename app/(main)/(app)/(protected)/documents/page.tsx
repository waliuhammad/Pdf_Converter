"use client";

import { useState, useMemo } from "react";
import {
    Upload,
    Search,
    Grid3x3,
    List,
    ChevronDown,
} from "lucide-react";
import { DocumentCard } from "@/components/documents/document-card";
import { DocumentRow } from "@/components/documents/document-row";
import { UploadModal } from "@/components/documents/upload-modal";
import { useLibrary } from "@/lib/store";
import { usePlanUsage } from "@/hooks/usePlanUsage";
import { useT } from "@/components/locale-provider";
import { formatRelativeTime, formatStorageUsed } from "@/lib/utils";

type SortOption = "newest" | "oldest" | "name" | "size";
type FilterOption = "all" | "favorites";

export default function DocumentsPage() {
    const { t } = useT();
    const documents = useLibrary((s) => s.documents);
    const addDocuments = useLibrary((s) => s.addDocuments);
    const removeDocument = useLibrary((s) => s.removeDocument);
    const renameDocument = useLibrary((s) => s.renameDocument);
    const toggleFavorite = useLibrary((s) => s.toggleFavorite);

    const [view, setView] = useState<"grid" | "list">("grid");
    const [search, setSearch] = useState("");
    const [sort, setSort] = useState<SortOption>("newest");
    const [filter, setFilter] = useState<FilterOption>("all");
    const [sortOpen, setSortOpen] = useState(false);
    const [showUpload, setShowUpload] = useState(false);
    const [storageError, setStorageError] = useState<string | null>(null);

    // Allowance and plan name come from /api/usage, which resolves the plan the
    // same way the tool routes do — so the tester changes this too.
    const { usage } = usePlanUsage();
    const storageLimitGb =
        usage && Number.isFinite(usage.storageLimitGb) ? usage.storageLimitGb : null;
    const planName = usage?.plan ?? "current";
    const storageUsedGb =
        documents.reduce((total, doc) => total + doc.sizeMb, 0) / 1024;

    const filteredDocs = useMemo(() => {
        let result = [...documents];

        if (search.trim()) {
            result = result.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()));
        }

        if (filter === "favorites") {
            result = result.filter((d) => d.favorite);
        }

        switch (sort) {
            case "newest":
                result.sort((a, b) => b.timestamp - a.timestamp);
                break;
            case "oldest":
                result.sort((a, b) => a.timestamp - b.timestamp);
                break;
            case "name":
                result.sort((a, b) => a.name.localeCompare(b.name));
                break;
            case "size":
                result.sort((a, b) => b.sizeMb - a.sizeMb);
                break;
        }

        return result;
    }, [documents, search, sort, filter]);

    const handleRename = (id: string, currentName: string) => {
        const newName = prompt("Enter new name:", currentName);
        if (!newName?.trim()) return;
        renameDocument(id, newName.trim());
    };

    const sortLabels: Record<SortOption, string> = {
        newest: "Newest first",
        oldest: "Oldest first",
        name: "Name (A-Z)",
        size: "Largest first",
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-fg">{t("documents.title")}</h1>
                    <p className="text-muted text-sm mt-1">
                        {filteredDocs.length === 1 ? t("documents.countOne") : t("documents.count", { count: filteredDocs.length })}
                        {storageLimitGb !== null && (
                            <>
                                {" · "}
                                {formatStorageUsed(storageUsedGb)} of {storageLimitGb} GB used
                            </>
                        )}
                    </p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--primary)] text-white text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
                >
                    <Upload size={16} />
                    {t("documents.upload")}
                </button>
            </div>

            {storageError && (
                <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400">
                    {storageError}
                </div>
            )}

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={t("documents.searchPlaceholder")}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-card text-fg placeholder:text-muted text-sm focus:outline-none focus:border-[var(--primary)] transition-colors bg-card"
                    />
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-card bg-card">
                    <button
                        onClick={() => setFilter("all")}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === "all" ? "bg-[var(--primary)] text-white" : "text-muted"
                            }`}
                    >
                        {t("documents.all")}
                    </button>
                    <button
                        onClick={() => setFilter("favorites")}
                        className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${filter === "favorites" ? "bg-[var(--primary)] text-white" : "text-muted"
                            }`}
                    >
                        {t("documents.favorites")}
                    </button>
                </div>

                {/* Sort dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setSortOpen(!sortOpen)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-card text-sm text-fg bg-card whitespace-nowrap"
                    >
                        {sortLabels[sort]}
                        <ChevronDown size={14} className={`transition-transform ${sortOpen ? "rotate-180" : ""}`} />
                    </button>
                    {sortOpen && (
                        <div className="absolute right-0 top-12 z-10 w-40 bg-card border border-card rounded-xl shadow-lg py-1">
                            {(Object.keys(sortLabels) as SortOption[]).map((option) => (
                                <button
                                    key={option}
                                    onClick={() => { setSort(option); setSortOpen(false); }}
                                    className="w-full text-left px-3 py-2 text-sm text-fg hover:bg-[var(--background-secondary)]"
                                >
                                    {sortLabels[option]}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* View toggle */}
                <div className="flex items-center gap-1 p-1 rounded-xl border border-card bg-card">
                    <button
                        onClick={() => setView("grid")}
                        className={`p-2 rounded-lg transition-colors ${view === "grid" ? "bg-[var(--primary)] text-white" : "text-muted"}`}
                    >
                        <Grid3x3 size={16} />
                    </button>
                    <button
                        onClick={() => setView("list")}
                        className={`p-2 rounded-lg transition-colors ${view === "list" ? "bg-[var(--primary)] text-white" : "text-muted"}`}
                    >
                        <List size={16} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {filteredDocs.length === 0 ? (
                <div className="text-center py-16">
                    <p className="text-muted text-sm">
                        {documents.length === 0
                            ? "No documents yet — upload your first PDF to get started."
                            : "No documents match your search."}
                    </p>
                </div>
            ) : view === "grid" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {filteredDocs.map((doc) => (
                        <DocumentCard
                            key={doc.id}
                            name={doc.name}
                            size={doc.size}
                            date={formatRelativeTime(doc.timestamp)}
                            favorite={doc.favorite}
                            onToggleFavorite={() => toggleFavorite(doc.id)}
                            onDelete={() => removeDocument(doc.id)}
                            onRename={() => handleRename(doc.id, doc.name)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-card border border-card rounded-2xl p-2">
                    {filteredDocs.map((doc) => (
                        <DocumentRow
                            key={doc.id}
                            name={doc.name}
                            size={doc.size}
                            date={formatRelativeTime(doc.timestamp)}
                            favorite={doc.favorite}
                            onToggleFavorite={() => toggleFavorite(doc.id)}
                            onDelete={() => removeDocument(doc.id)}
                            onRename={() => handleRename(doc.id, doc.name)}
                        />
                    ))}
                </div>
            )}

            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploadComplete={(files) => {
                        // The plan's storage allowance is a real limit, not a
                        // label: an upload that would take the library past it
                        // is refused rather than silently accepted.
                        const incomingGb =
                            files.reduce((total, f) => total + f.bytes, 0) / (1024 * 1024 * 1024);

                        if (
                            storageLimitGb !== null &&
                            storageUsedGb + incomingGb > storageLimitGb
                        ) {
                            setStorageError(
                                `That upload needs ${(storageUsedGb + incomingGb).toFixed(2)} GB, ` +
                                `over your ${storageLimitGb} GB ${planName} storage. ` +
                                `Remove some documents or upgrade for more space.`
                            );
                            return;
                        }

                        setStorageError(null);
                        addDocuments(files.map((f) => ({ name: f.name, bytes: f.bytes })));
                    }}
                />
            )}
        </div>
    );
}
