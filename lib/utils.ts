import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 1536000 -> "1.5 MB" */
export function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * A storage figure held in gigabytes, shown in a unit you can actually read.
 *
 * The allowance is quoted in GB, so the amount used was printed in GB too —
 * and a handful of PDFs is a few megabytes, which "0.00 GB" rounds away
 * entirely. Uploading seven files moved the number not at all. Below a
 * gigabyte it steps down to MB or KB, so the figure changes as soon as
 * anything is added.
 */
export function formatStorageUsed(gigabytes: number) {
  // One stored record without a sizeMb turns the whole sum into NaN, which
  // would otherwise be printed as "NaN GB".
  if (!Number.isFinite(gigabytes)) return "0 KB"

  const bytes = gigabytes * 1024 * 1024 * 1024

  if (bytes <= 0) return "0 KB"
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${gigabytes.toFixed(2)} GB`
}

/** Renders a timestamp as "Just now" / "3h ago" / "2d ago" rather than a fixed string. */
export function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  if (seconds < 60) return "Just now"
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return `${Math.floor(seconds / 604800)}w ago`
}
