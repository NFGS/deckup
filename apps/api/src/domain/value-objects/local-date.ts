const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

/**
 * Local calendar day (`YYYY-MM-DD`) of an instant in the given IANA timezone.
 * Falls back to UTC when the timezone is not recognized.
 */
export function localDateKey(instant: Date, timezone: string): string {
  return formatter(timezone).format(instant);
}

/**
 * Shifts a `YYYY-MM-DD` key by a number of days (negative for the past).
 */
export function shiftDateKey(key: string, offsetDays: number): string {
  const [year = 1970, month = 1, day = 1] = key.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + offsetDays));
  return shifted.toISOString().slice(0, 10);
}

function formatter(timezone: string): Intl.DateTimeFormat {
  const cached = DATE_FORMATTER_CACHE.get(timezone);

  if (cached) {
    return cached;
  }

  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  };

  let created: Intl.DateTimeFormat;

  try {
    created = new Intl.DateTimeFormat('en-CA', options);
  } catch {
    created = new Intl.DateTimeFormat('en-CA', { ...options, timeZone: 'UTC' });
  }

  DATE_FORMATTER_CACHE.set(timezone, created);
  return created;
}
