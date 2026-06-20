import { useEffect, useState } from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// The kiosk calls /api/getMachineData every 60s as a heartbeat. 240s (4x)
// gives more buffer for network jitter on flaky kiosk Wi-Fi — a single slow
// or missed heartbeat shouldn't flip a genuinely-online machine to "offline"
// on the dashboard. Still catches a truly dead kiosk within a few minutes.
export const MACHINE_STALE_THRESHOLD_MS = 240_000

// True when a machine claims "online" but hasn't checked in recently — distinct
// from a deliberately-toggled offline, since this means it stopped responding.
// `now` defaults to Date.now() for one-off calls, but pass the value from
// useNow() in any component that renders this live — otherwise a machine
// going silent won't flip to unreachable on screen until something else
// happens to cause a re-render (Convex reactivity only fires on real writes,
// and "going silent" is the absence of a write).
export function isMachineUnreachable(
  status: string | undefined,
  lastSeenAt: number | undefined,
  now: number = Date.now()
) {
  if (status !== "online") return false
  // No heartbeat ever recorded is not evidence of life — don't trust "online"
  // with zero data behind it (this previously showed "Online" + "Last checked
  // in: never" at the same time, which is a contradiction).
  if (!lastSeenAt) return true
  return now - lastSeenAt > MACHINE_STALE_THRESHOLD_MS
}

// One combined check for "should this show as offline anywhere in the UI" —
// covers both a deliberate/confirmed offline status AND a machine that claims
// online but has gone stale. Use this instead of checking `status` alone for
// any offline count/alert, or different parts of the dashboard will disagree
// with each other about whether a given machine is offline.
export function isMachineOffline(
  status: string | undefined,
  lastSeenAt: number | undefined,
  now: number = Date.now()
) {
  return status === "offline" || isMachineUnreachable(status, lastSeenAt, now)
}

// Ticks every `intervalMs` so components using isMachineUnreachable/
// isMachineOffline re-evaluate as wall-clock time passes, not just when
// Convex data actually changes. Call once per component (not inside a loop).
export function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
