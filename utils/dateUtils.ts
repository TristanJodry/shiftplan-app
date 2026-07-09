export const getStartOfWeek = (date: Date): Date => {
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const newDate = new Date(date);
  newDate.setDate(diff);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export const getStartOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export const getEndOfMonth = (date: Date): Date => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

export const formatDateISO = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset*60*1000));
  return adjustedDate.toISOString().split('T')[0];
};

export const formatDateFr = (date: Date): string => {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short'
  }).format(date);
};

export const getFrenchHolidayName = (date: Date): string | null => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  const day = date.getDate();

  // Fixed date holidays
  if (month === 0 && day === 1) return "Nouvel An";
  if (month === 4 && day === 1) return "Fête du Travail";
  if (month === 4 && day === 8) return "Victoire 1945";
  if (month === 6 && day === 14) return "Fête Nationale";
  if (month === 7 && day === 15) return "Assomption";
  if (month === 10 && day === 1) return "Toussaint";
  if (month === 10 && day === 11) return "Armistice 1918";
  if (month === 11 && day === 25) return "Noël";

  // Sainte-Barbe (Dec 4) for this specific user's enterprise
  if (month === 11 && day === 4) return "Sainte-Barbe";

  // Dynamic Easter-based holidays calculation (Meeus/Jones/Butcher algorithm)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const easterMonth = Math.floor((h + l - 7 * m + 114) / 31) - 1; // 0-indexed for JS Date
  const easterDay = ((h + l - 7 * m + 114) % 31) + 1;

  const easterDate = new Date(year, easterMonth, easterDay);
  
  // Easter Monday (+1 day)
  const easterMonday = new Date(easterDate);
  easterMonday.setDate(easterDate.getDate() + 1);
  if (month === easterMonday.getMonth() && day === easterMonday.getDate()) return "Lundi de Pâques";

  // Ascension Thursday (+39 days after Easter Sunday)
  const ascension = new Date(easterDate);
  ascension.setDate(easterDate.getDate() + 39);
  if (month === ascension.getMonth() && day === ascension.getDate()) return "Ascension";

  // Whit Monday / Lundi de Pentecôte (+50 days after Easter Sunday)
  const pentecote = new Date(easterDate);
  pentecote.setDate(easterDate.getDate() + 50);
  if (month === pentecote.getMonth() && day === pentecote.getDate()) return "Lundi de Pentecôte";

  return null;
};

export const getWeekRangeString = (date: Date): string => {
  const start = getStartOfWeek(date);
  const end = addDays(start, 6);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  return `${new Intl.DateTimeFormat('fr-FR', options).format(start)} - ${new Intl.DateTimeFormat('fr-FR', options).format(end)}`;
};