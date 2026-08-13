type CalendarYear = `${number}${number}${number}${number}`;
type CalendarMonth =
  | "01" | "02" | "03" | "04" | "05" | "06"
  | "07" | "08" | "09" | "10" | "11" | "12";

export type BookReadingState =
  | Readonly<{ startedAt: `${CalendarYear}-${CalendarMonth}`; status: "reading" }>
  | Readonly<{ readAt: `${CalendarYear}-${CalendarMonth}`; status: "read" }>;

export type BookshelfBook = Readonly<{
  author: string;
  note: string;
  reading: BookReadingState;
  sourceUrl: `https://${string}`;
  title: string;
  writtenYear: CalendarYear;
}>;

export const BOOKSHELF_PATH = "/bookshelf" as const;

const readMonthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  timeZone: "UTC",
  year: "numeric",
});

export function bookshelfReadingLabel(reading: BookReadingState): string {
  if (reading.status === "reading") return "reading now";
  return `read ${readMonthFormatter
    .format(new Date(`${reading.readAt}-01T00:00:00Z`))
    .toLocaleLowerCase("en-US")}`;
}

/** Add only books the site owner has actually read or is reading. */
export const bookshelfBooks: readonly BookshelfBook[] = [];
