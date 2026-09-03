"use client";

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    MESSAGES,
    RTL_LOCALES,
    TRANSLATED_LOCALES,
    type Locale,
    type MessageKey,
} from "@/lib/i18n/messages";

/** Where the settings page keeps the preference this reads. */
export const PREFS_STORAGE_KEY = "pdfai:preferences";

/** Fired by the settings page so a change applies without a reload. */
export const LOCALE_CHANGED_EVENT = "pdfai:locale-changed";

interface LocaleValue {
    /** The language the visitor chose, whether or not it has a catalogue. */
    language: string;
    /** The catalogue actually in use — English when the choice has none. */
    locale: Locale;
    t: (key: MessageKey, values?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleValue | null>(null);

function readStoredLanguage(): string {
    try {
        const raw = localStorage.getItem(PREFS_STORAGE_KEY);
        if (!raw) return "en";
        const parsed = JSON.parse(raw) as { language?: unknown };
        return typeof parsed.language === "string" ? parsed.language : "en";
    } catch {
        return "en";
    }
}

/**
 * Applies the interface language chosen in Settings.
 *
 * The setting used to be stored and never read: picking Arabic changed a value
 * in localStorage and nothing else. This reads the same key, so the choice
 * already made takes effect, and it updates the document's lang and dir, which
 * is what makes right-to-left languages lay out correctly rather than merely
 * being translated.
 *
 * A language with no catalogue yet keeps English copy but still gets the
 * correct lang and direction, so adding a catalogue later needs no other
 * change.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState("en");

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLanguage(readStoredLanguage());

        const sync = () => setLanguage(readStoredLanguage());

        // "storage" covers other tabs; the custom event covers this one, where
        // writing to localStorage does not fire it.
        window.addEventListener("storage", sync);
        window.addEventListener(LOCALE_CHANGED_EVENT, sync);
        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener(LOCALE_CHANGED_EVENT, sync);
        };
    }, []);

    const locale: Locale = TRANSLATED_LOCALES.includes(language as Locale)
        ? (language as Locale)
        : "en";

    useEffect(() => {
        const root = document.documentElement;
        root.lang = language || "en";
        root.dir = RTL_LOCALES.has(language) ? "rtl" : "ltr";
    }, [language]);

    const t = useCallback(
        (key: MessageKey, values?: Record<string, string | number>) => {
            const table = MESSAGES[locale] as Record<string, string>;
            // Per key, not per locale: a partly translated catalogue shows what
            // it has and English for the rest, instead of blanks.
            const template = table[key] ?? MESSAGES.en[key] ?? key;

            if (!values) return template;

            return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
                name in values ? String(values[name]) : whole
            );
        },
        [locale]
    );

    const value = useMemo<LocaleValue>(
        () => ({ language, locale, t }),
        [language, locale, t]
    );

    return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Translation for the current locale.
 *
 * Falls back to English when used outside the provider, so a component can call
 * it without depending on where it is mounted.
 */
export function useT() {
    const ctx = useContext(LocaleContext);

    const fallback = useCallback(
        (key: MessageKey, values?: Record<string, string | number>) => {
            const template = MESSAGES.en[key] ?? key;
            if (!values) return template;
            return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
                name in values ? String(values[name]) : whole
            );
        },
        []
    );

    return ctx ?? { language: "en", locale: "en" as Locale, t: fallback };
}
