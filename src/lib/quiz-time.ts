// Server-clock synchronization for the quiz.
//
// Every timer (countdown, question time bar) is computed from an absolute
// server timestamp (countdown_started_at / question_started_at). The API
// returns `server_now` with each response; we track the offset between the
// server clock and this device and expose syncedNow() so all timing runs
// against server time. The rtt parameter applies an NTP-style correction
// (half the round-trip) so the offset is accurate even on slow connections.

let offset = 0; // serverNow - clientNow, in ms

export function setServerNow(serverNow: number | string | null | undefined, rtt = 0) {
  if (serverNow == null) return;
  const server = typeof serverNow === "string" ? new Date(serverNow).getTime() : serverNow;
  if (!Number.isFinite(server)) return;
  // server_now was captured at the midpoint of the round trip; add rtt/2
  // so the offset reflects the server clock at the moment we read it.
  offset = server - Date.now() + rtt / 2;
}

// "Now", aligned to the server clock.
export function syncedNow(): number {
  return Date.now() + offset;
}

// Countdown duration (3, 2, 1, GO) in ms — shared by host + players.
export const COUNTDOWN_MS = 3800;

// Lead time added to countdown_started_at so every client (broadcast ~50ms,
// postgres_changes ~300ms, polling up to 1500ms) receives the schedule before
// the animation visually starts, ensuring all screens show "3" at the same time.
export const START_LEAD_MS = 1000;
