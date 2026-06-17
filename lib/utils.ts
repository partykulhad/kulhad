import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The kiosk calls /api/getMachineData every 60s as a heartbeat. 150s (2.5x)
// gives buffer for network jitter while still catching a dead kiosk quickly.
export const MACHINE_STALE_THRESHOLD_MS = 150_000

// True when a machine claims "online" but hasn't checked in recently — distinct
// from a deliberately-toggled offline, since this means it stopped responding.
export function isMachineUnreachable(
  status: string | undefined,
  lastSeenAt: number | undefined
) {
  if (status !== "online") return false
  if (!lastSeenAt) return false
  return Date.now() - lastSeenAt > MACHINE_STALE_THRESHOLD_MS
}
