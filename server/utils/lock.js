/**
 * Tiny per-key async mutex. Booking writes for the same date run one at a time,
 * so "check availability, then insert" can't interleave between two requests.
 *
 * Only protects a single Node process. If you ever run several API instances,
 * the unique indexes on Appointment still stop exact-start collisions, but
 * overlapping different-start bookings would need a DB transaction or a
 * shared lock (e.g. Redis).
 */
const tails = new Map();

export async function withLock(key, fn) {
  const prev = tails.get(key) || Promise.resolve();
  let release;
  const current = new Promise((r) => (release = r));
  const tail = prev.then(() => current);
  tails.set(key, tail);
  await prev;
  try {
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}
