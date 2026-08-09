import { getBlockState, parseTimeToMinutes } from '../date';

describe('parseTimeToMinutes', () => {
  it('parses a morning time', () => {
    expect(parseTimeToMinutes('4:15 am')).toBe(255);
  });

  it('parses an afternoon time', () => {
    expect(parseTimeToMinutes('8:00 pm')).toBe(1200);
  });

  it('parses noon and midnight correctly', () => {
    expect(parseTimeToMinutes('12:00 pm')).toBe(720);
    expect(parseTimeToMinutes('12:00 am')).toBe(0);
  });

  it('accepts missing zero-padding and case variations', () => {
    expect(parseTimeToMinutes('7:05 AM')).toBe(425);
  });

  it('rejects invalid formats and times', () => {
    expect(parseTimeToMinutes('not a time')).toBeNull();
    expect(parseTimeToMinutes('25:00 pm')).toBeNull();
    expect(parseTimeToMinutes('4:70 pm')).toBeNull();
  });
});

describe('getBlockState', () => {
  const at = (hours: number, minutes: number) =>
    new Date(2026, 7, 10, hours, minutes, 0, 0);

  it('reports completed once checked regardless of time', () => {
    expect(getBlockState(true, '8:00 pm', at(23, 0))).toBe('completed');
    expect(getBlockState(true, '8:00 pm', at(7, 0))).toBe('completed');
  });

  it('reports upcoming before the block starts', () => {
    expect(getBlockState(false, '8:00 pm', at(7, 0))).toBe('upcoming');
  });

  it('reports active while a block is in progress', () => {
    expect(getBlockState(false, '8:00 pm', at(20, 15))).toBe('active');
  });

  it('reports missed after a block has passed unchecked', () => {
    expect(getBlockState(false, '8:00 pm', at(21, 30))).toBe('missed');
  });

  it('falls back to upcoming when the time cannot be parsed', () => {
    expect(getBlockState(false, 'whenever', at(9, 0))).toBe('upcoming');
  });
});
