export interface ZonedDateTimeParts {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  timeZoneName: string;
}

export function getZonedDateTimeParts(isoDate: string, timeZone: string): ZonedDateTimeParts {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid ISO date: ${isoDate}`);
  }

  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZoneName: "short",
  });
  const values = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return {
    year: values.year ?? "",
    month: values.month ?? "",
    day: values.day ?? "",
    hour: values.hour ?? "",
    minute: values.minute ?? "",
    timeZoneName: values.timeZoneName ?? timeZone,
  };
}

export function formatKickoff(isoDate: string, timeZone: string): string {
  const parts = getZonedDateTimeParts(isoDate, timeZone);
  return `${parts.day}.${parts.month}.${parts.year} ${parts.hour}:${parts.minute} ${parts.timeZoneName}`;
}
