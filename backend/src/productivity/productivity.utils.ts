export const TZ = 'America/Sao_Paulo';
export const UTC_OFFSET_HOURS = 3; // BRT = UTC-3 (Brazil abolished DST in 2019)

export function dayRangeUTC(date: string): { start: Date; end: Date } {
  // 00:00 BRT = 03:00 UTC, 23:59:59 BRT = next day 02:59:59 UTC
  const start = new Date(date + 'T03:00:00Z');
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

export function todayBRT(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - UTC_OFFSET_HOURS * 60 * 60 * 1000);
  return brt.toISOString().split('T')[0];
}
