/** Local calendar day keys (YYYY-MM-DD) for beer tab dates — shared by customer and manager UIs. */

export function getDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getTodayKey(): string {
  return getDateKey(new Date());
}

export function formatDayLabel(key: string): string {
  const today = getTodayKey();
  if (key === today) return 'Today';
  const d = new Date(key + 'T12:00:00');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (getDateKey(yesterday) === key) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/** Start/end of local calendar day as ISO strings (for manager “mark all paid” in a day). */
export function getDayBoundsISO(dayKey: string): { startISO: string; endISO: string } {
  const [yearStr, monthStr, dayStr] = dayKey.split('-');
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const day = Number(dayStr);
  const startLocal = new Date(year, monthIndex, day, 0, 0, 0, 0);
  const endLocal = new Date(year, monthIndex, day + 1, 0, 0, 0, 0);
  return { startISO: startLocal.toISOString(), endISO: endLocal.toISOString() };
}
