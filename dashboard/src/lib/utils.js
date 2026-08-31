import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/** Animated-friendly number formatting: $690K / 30.7x / 1,234 */
export function fmtMoney(n, { compact = false } = {}) {
  const v = Number(n) || 0;
  if (compact && Math.abs(v) >= 1000) {
    return '$' + (v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 }) + 'K';
  }
  return '$' + v.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function fmtNum(n) {
  return (Number(n) || 0).toLocaleString('en-US');
}

export function fmtRoas(n) {
  return n === null || n === undefined ? 'N/A' : `${Number(n)}x`;
}

export function fmtPct(n) {
  return `${Number(n) || 0}%`;
}
