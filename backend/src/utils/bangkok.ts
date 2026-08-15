/**
 * Bangkok timezone (UTC+7) helpers.
 * SQLite's datetime('now') returns UTC — we need '+7 hours' for Bangkok.
 */

export function bangkokNow(): Date {
  const now = new Date();
  // Convert to Bangkok timezone
  return new Date(now.getTime() + 7 * 60 * 60 * 1000);
}

export function bangkokToday(): string {
  return bangkokNow().toISOString().split("T")[0];
}

export function bangkokISO(): string {
  return bangkokNow().toISOString();
}