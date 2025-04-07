export interface TimeInfo {
  timezone: string;
  currentTime: string;
  currentDate: string;
  offset: string;
}

export const getTimeInfo = (): TimeInfo => {
  const now = new Date();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = now.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetString = `${offset > 0 ? '-' : '+'}${offsetHours.toString().padStart(2, '0')}:${offsetMinutes.toString().padStart(2, '0')}`;

  return {
    timezone: timeZone,
    currentTime: now.toLocaleTimeString(),
    currentDate: now.toLocaleDateString(),
    offset: offsetString
  };
}; 