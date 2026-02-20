"use client";

const GUEST_SESSION_KEY = "dothaus_guest_session_stats";

export interface GuestSessionStats {
  wins: number;
  losses: number;
  totalEarnings: number;
}

const EMPTY_STATS: GuestSessionStats = {
  wins: 0,
  losses: 0,
  totalEarnings: 0,
};

export function getGuestSessionStats(): GuestSessionStats {
  if (typeof window === "undefined") return EMPTY_STATS;

  const raw = window.localStorage.getItem(GUEST_SESSION_KEY);
  if (!raw) return EMPTY_STATS;

  try {
    const parsed = JSON.parse(raw) as Partial<GuestSessionStats>;
    return {
      wins: Number.isFinite(parsed.wins) ? Number(parsed.wins) : 0,
      losses: Number.isFinite(parsed.losses) ? Number(parsed.losses) : 0,
      totalEarnings: Number.isFinite(parsed.totalEarnings) ? Number(parsed.totalEarnings) : 0,
    };
  } catch {
    return EMPTY_STATS;
  }
}

export function updateGuestSessionStats(delta: Partial<GuestSessionStats>) {
  const current = getGuestSessionStats();
  const next: GuestSessionStats = {
    wins: current.wins + (delta.wins || 0),
    losses: current.losses + (delta.losses || 0),
    totalEarnings: current.totalEarnings + (delta.totalEarnings || 0),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearGuestSessionStats() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(GUEST_SESSION_KEY);
  }
}
