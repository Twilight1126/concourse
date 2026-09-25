import type { AppStatus, AppSource } from '@/types';

export const STATUS_CONFIG: Record<
  AppStatus,
  { label: string; color: string; dot: string }
> = {
  wishlist: {
    label: 'Wishlist',
    color: 'text-slate-600 bg-slate-100',
    dot: 'bg-slate-400',
  },
  applied: {
    label: 'Applied',
    color: 'text-blue-700 bg-blue-50',
    dot: 'bg-blue-500',
  },
  screening: {
    label: 'Screening',
    color: 'text-cyan-700 bg-cyan-50',
    dot: 'bg-cyan-500',
  },
  interview: {
    label: 'Interview',
    color: 'text-amber-700 bg-amber-50',
    dot: 'bg-amber-500',
  },
  offer: {
    label: 'Offer',
    color: 'text-emerald-700 bg-emerald-50',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rejected',
    color: 'text-rose-700 bg-rose-50',
    dot: 'bg-rose-500',
  },
  withdrawn: {
    label: 'Withdrawn',
    color: 'text-slate-500 bg-slate-100',
    dot: 'bg-slate-400',
  },
  ghosted: {
    label: 'Ghosted',
    color: 'text-stone-600 bg-stone-100',
    dot: 'bg-stone-500',
  },
};

export const STATUS_ORDER: AppStatus[] = [
  'wishlist',
  'applied',
  'screening',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'ghosted',
];

export const SOURCE_CONFIG: Record<AppSource, { label: string }> = {
  linkedin: { label: 'LinkedIn' },
  portal: { label: 'Job Portal' },
  referral: { label: 'Referral' },
  cold_email: { label: 'Cold Email' },
  other: { label: 'Other' },
};

export const SOURCE_OPTIONS: { value: AppSource; label: string }[] = [
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'portal', label: 'Job Portal' },
  { value: 'referral', label: 'Referral' },
  { value: 'cold_email', label: 'Cold Email' },
  { value: 'other', label: 'Other' },
];

export const STATUS_OPTIONS: { value: AppStatus; label: string }[] = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'screening', label: 'Screening' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'ghosted', label: 'Ghosted' },
];

export const ACCENT = '#0F6E56';
export const BG_OFFWHITE = '#F1EFE8';
