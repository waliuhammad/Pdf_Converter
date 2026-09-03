/** /tools is server-rendered on demand, so it is the one tool route with a wait worth filling. */
export default function Loading() {
    return (
        <div className="w-full animate-pulse">
            <div className="h-8 w-56 rounded-xl bg-[var(--background-secondary)] mb-3" />
            <div className="h-4 w-80 max-w-full rounded-lg bg-[var(--background-secondary)] mb-8" />

            <div className="h-11 w-full max-w-md rounded-xl bg-[var(--background-secondary)] mb-6" />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 9 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-32 rounded-2xl border border-card bg-[var(--background-secondary)]"
                    />
                ))}
            </div>
        </div>
    );
}
