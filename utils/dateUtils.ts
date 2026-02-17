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

export const getWeekRangeString = (date: Date): string => {
  const start = getStartOfWeek(date);
  const end = addDays(start, 6);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  return `${new Intl.DateTimeFormat('fr-FR', options).format(start)} - ${new Intl.DateTimeFormat('fr-FR', options).format(end)}`;
};