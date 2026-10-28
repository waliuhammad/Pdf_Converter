/**
 * The public contact address, from NEXT_PUBLIC_CONTACT_EMAIL. Pages show it
 * only when it is set, so the site never advertises an inbox nobody reads.
 */
export function getContactEmail(): string | null {
    const email = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim();
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
