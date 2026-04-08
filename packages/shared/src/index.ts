export const ROLES = {
  USER: "USER",
  BUSINESS_OWNER: "BUSINESS_OWNER",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "SUPER_ADMIN",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  COMPLETED: "COMPLETED",
  NO_SHOW: "NO_SHOW",
} as const;

export const GIFT_STATUS = {
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export function formatCredits(credits: number): string {
  return `${(credits / 100).toFixed(0)} credits`;
}

export function formatPrice(usd: number): string {
  return `$${usd.toFixed(0)}`;
}
