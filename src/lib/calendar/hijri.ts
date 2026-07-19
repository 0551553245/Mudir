/** Gregorian + Hijri (Umm al-Qura) helpers via Intl — no extra deps. */

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

export function startOfWeek(d: Date, weekStartsOn: 0 | 1 = 1): Date {
  const date = new Date(d);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const diff = weekStartsOn === 1 ? (day + 6) % 7 : day;
  date.setDate(date.getDate() - diff);
  return date;
}

export function addDays(d: Date, n: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + n);
  return next;
}

export function sameDay(a: Date, b: Date): boolean {
  return toDateKey(a) === toDateKey(b);
}

export function formatGregorianDay(d: Date, locale: string): string {
  return d.toLocaleDateString(locale === "ar" ? "ar-SA" : "en-GB", {
    weekday: "short",
    day: "numeric",
  });
}

export function formatGregorianWeekday(d: Date, locale: string): string {
  return d
    .toLocaleDateString(locale === "ar" ? "ar-SA" : "en-US", { weekday: "short" })
    .toUpperCase();
}

export function formatGregorianDayNum(d: Date): string {
  return String(d.getDate());
}

/** Hijri day number (Umm al-Qura). */
export function formatHijriDay(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-SA-u-ca-islamic-umalqura",
      { day: "numeric" }
    ).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric" }).format(d);
  }
}

export function formatHijriMonthDay(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-SA-u-ca-islamic-umalqura",
      { day: "numeric", month: "short" }
    ).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "short",
    }).format(d);
  }
}

export function formatHijriFull(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(
      locale === "ar" ? "ar-SA-u-ca-islamic-umalqura" : "en-SA-u-ca-islamic-umalqura",
      { day: "numeric", month: "long", year: "numeric" }
    ).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-u-ca-islamic", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  }
}

/** Parse optional `[HH:MM-HH:MM]` prefix from event description. */
export function parseEventTimes(description: string | null | undefined): {
  start: string | null;
  end: string | null;
  note: string;
} {
  if (!description) return { start: null, end: null, note: "" };
  const m = description.match(/^\[(\d{1,2}:\d{2})-(\d{1,2}:\d{2})\]\s*\n?([\s\S]*)$/);
  if (!m) return { start: null, end: null, note: description };
  return { start: m[1], end: m[2], note: m[3] ?? "" };
}

export function encodeEventTimes(
  start: string | null | undefined,
  end: string | null | undefined,
  note: string | null | undefined
): string | null {
  const n = (note ?? "").trim();
  if (start && end) {
    return n ? `[${start}-${end}]\n${n}` : `[${start}-${end}]`;
  }
  return n || null;
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatHourLabel(hour: number, locale: string): string {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.toLocaleTimeString(locale === "ar" ? "ar-SA" : "en-US", {
    hour: "numeric",
    hour12: true,
  });
}

export const EVENT_TYPE_STYLES: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  training: { bg: "#E8F5F0", border: "#5BA88E", text: "#013F32" },
  inspection: { bg: "#F8EFE3", border: "#D4A06A", text: "#8A5A28" },
  audit: { bg: "#F8E8EA", border: "#D48A94", text: "#8B3A45" },
  other: { bg: "#EEEEEC", border: "#9A9A96", text: "#444440" },
};
