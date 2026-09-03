export type DiffKind = "same" | "added" | "removed";

export interface DiffPart {
    kind: DiffKind;
    text: string;
}

/**
 * A word-level diff between two pieces of text.
 *
 * The grammar tool only ever showed the corrected result, which left no way to
 * see what it had actually changed — you had to read both versions side by
 * side and spot the differences yourself. This produces the runs that stayed,
 * were removed and were added, so the corrections can be marked up.
 *
 * Word-level rather than character-level: a corrected word reads as one
 * replacement instead of a scatter of single-letter edits.
 */
export function diffWords(before: string, after: string): DiffPart[] {
    // Splitting on the gaps keeps whitespace attached, so rebuilding the text
    // from the parts reproduces the original spacing and line breaks.
    const a = before.match(/\S+\s*/g) ?? [];
    const b = after.match(/\S+\s*/g) ?? [];

    // Longest common subsequence over the token lists. The documents here are
    // a few thousand words at most, which this handles comfortably.
    const rows = a.length;
    const cols = b.length;
    const table: number[][] = Array.from({ length: rows + 1 }, () =>
        new Array<number>(cols + 1).fill(0)
    );

    for (let i = rows - 1; i >= 0; i--) {
        for (let j = cols - 1; j >= 0; j--) {
            table[i][j] =
                a[i].trim() === b[j].trim()
                    ? table[i + 1][j + 1] + 1
                    : Math.max(table[i + 1][j], table[i][j + 1]);
        }
    }

    const parts: DiffPart[] = [];

    /** Appends to the previous run when it matches, so marks are not fragmented. */
    const push = (kind: DiffKind, text: string) => {
        const last = parts[parts.length - 1];
        if (last && last.kind === kind) last.text += text;
        else parts.push({ kind, text });
    };

    let i = 0;
    let j = 0;

    while (i < rows && j < cols) {
        if (a[i].trim() === b[j].trim()) {
            push("same", b[j]);
            i++;
            j++;
        } else if (table[i + 1][j] >= table[i][j + 1]) {
            push("removed", a[i]);
            i++;
        } else {
            push("added", b[j]);
            j++;
        }
    }

    while (i < rows) push("removed", a[i++]);
    while (j < cols) push("added", b[j++]);

    return parts;
}

/** How many separate edits the diff contains, for a "N corrections" count. */
export function countEdits(parts: DiffPart[]): number {
    let edits = 0;

    for (let i = 0; i < parts.length; i++) {
        if (parts[i].kind === "same") continue;

        // A removal immediately followed by an addition is one replacement,
        // not two changes.
        if (
            parts[i].kind === "removed" &&
            parts[i + 1]?.kind === "added"
        ) {
            i++;
        }
        edits++;
    }

    return edits;
}
