import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCents(cents: number | null | undefined) {
  if (cents == null) return "—";
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function relativeTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now  = Date.now();
  const diff = Math.round((then - now) / 1000);
  const abs  = Math.abs(diff);
  if (abs < 60)     return diff < 0 ? `${abs}s ago` : `in ${abs}s`;
  if (abs < 3600)   return diff < 0 ? `${Math.round(abs/60)}m ago` : `in ${Math.round(abs/60)}m`;
  if (abs < 86400)  return diff < 0 ? `${Math.round(abs/3600)}h ago` : `in ${Math.round(abs/3600)}h`;
  return new Date(iso).toLocaleDateString();
}
