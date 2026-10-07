import {
  nextMedicationReminderOccurrence,
  recentMedicationReminderOccurrence,
} from './medication-reminder.util';

describe('medication reminder occurrence helpers', () => {
  const timezone = 'Africa/Johannesburg';
  const daysOfWeek = [1, 2, 3, 4, 5, 6, 7];

  it('converts a South African local reminder time to the correct UTC instant', () => {
    const now = new Date('2026-10-07T05:30:00.000Z');

    const occurrence = nextMedicationReminderOccurrence({
      now,
      time: '07:37',
      daysOfWeek,
      timezone,
    });

    expect(occurrence?.toISOString()).toBe('2026-10-07T05:37:00.000Z');
  });

  it('catches a reminder saved during its scheduled local minute', () => {
    const now = new Date('2026-10-07T05:37:20.000Z');

    const occurrence = recentMedicationReminderOccurrence({
      now,
      time: '07:37',
      daysOfWeek,
      timezone,
    });

    expect(occurrence?.toISOString()).toBe('2026-10-07T05:37:00.000Z');
  });

  it('does not treat a reminder more than the grace window late as current', () => {
    const now = new Date('2026-10-07T05:39:01.000Z');

    const occurrence = recentMedicationReminderOccurrence({
      now,
      time: '07:37',
      daysOfWeek,
      timezone,
    });

    expect(occurrence).toBeNull();
  });

  it('keeps UTC reminder behavior unchanged', () => {
    const now = new Date('2026-10-07T05:30:00.000Z');

    const occurrence = nextMedicationReminderOccurrence({
      now,
      time: '05:37',
      daysOfWeek,
      timezone: 'UTC',
    });

    expect(occurrence?.toISOString()).toBe('2026-10-07T05:37:00.000Z');
  });
});
