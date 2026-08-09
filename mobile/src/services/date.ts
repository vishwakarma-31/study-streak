export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

export function parseTimeToMinutes(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(time.trim());
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3].toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export type BlockState = 'completed' | 'active' | 'upcoming' | 'missed';

export function getBlockState(checked: boolean, time: string, now: Date = new Date()): BlockState {
  if (checked) return 'completed';
  const start = parseTimeToMinutes(time);
  if (start === null) return 'upcoming';
  const current = now.getHours() * 60 + now.getMinutes();
  if (current < start) return 'upcoming';
  if (current < start + 60) return 'active';
  return 'missed';
}
