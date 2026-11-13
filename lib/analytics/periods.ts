import { AnalyticsPeriodKey, MonthBucket, PeriodInterval } from "./types";

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const PERIOD_PRESETS: { key: AnalyticsPeriodKey; label: string }[] = [
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "last_3_months", label: "Last 3 Months" },
  { key: "last_6_months", label: "Last 6 Months" },
  { key: "this_year", label: "This Year" },
];

/**
 * Formats year and month (1-12) as YYYY-MM-DD string for 1st of month.
 */
export function formatDate(year: number, month: number, day: number = 1): string {
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

/**
 * Formats a MonthBucket object for a given year and month (1-12).
 */
function createMonthBucket(year: number, month: number): MonthBucket {
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const label = `${MONTH_NAMES_SHORT[month - 1]} ${year}`;
  return { year, month, key, label };
}

/**
 * Formats YYYY-MM-DD to a human-readable date e.g. "15 Oct 2026"
 */
export function formatHumanDate(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  const [yearStr, monthStr, dayStr] = dateStr.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const monthLabel = MONTH_NAMES_SHORT[month - 1] || monthStr;
  return `${day} ${monthLabel} ${year}`;
}

/**
 * Validates and safely parses a period key from searchParams.
 */
export function parsePeriodKey(key?: string | null): AnalyticsPeriodKey {
  if (
    key === "this_month" ||
    key === "last_month" ||
    key === "last_3_months" ||
    key === "last_6_months" ||
    key === "this_year" ||
    key === "custom"
  ) {
    return key;
  }
  return "this_month";
}

/**
 * Validates whether a string is a real calendar date in YYYY-MM-DD format.
 */
export function isValidDateString(dateStr?: string | null): dateStr is string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [y, m, d] = dateStr.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Shifts a calendar date by N days using UTC arithmetic to avoid timezone shifts.
 */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate()
  );
}

/**
 * Computes calendar days inclusive between two YYYY-MM-DD dates.
 */
export function getCalendarDayDifference(
  startDateStr: string,
  endDateStr: string
): number {
  const [y1, m1, d1] = startDateStr.split("-").map(Number);
  const [y2, m2, d2] = endDateStr.split("-").map(Number);
  const t1 = Date.UTC(y1, m1 - 1, d1);
  const t2 = Date.UTC(y2, m2 - 1, d2);
  return Math.round((t2 - t1) / 86400000) + 1;
}

/**
 * Generates month buckets covering all months spanning a date range.
 */
export function getMonthBucketsInRange(
  startDateStr: string,
  endDateInclusiveStr: string
): MonthBucket[] {
  const [y1, m1] = startDateStr.split("-").map(Number);
  const [y2, m2] = endDateInclusiveStr.split("-").map(Number);
  const months: MonthBucket[] = [];
  let curY = y1;
  let curM = m1;
  while (curY < y2 || (curY === y2 && curM <= m2)) {
    months.push(createMonthBucket(curY, curM));
    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }
  return months;
}

export const MAX_CUSTOM_PERIOD_DAYS = 3660; // 10 years maximum reporting window

export interface MonthProration {
  year: number;
  month: number;
  daysInMonth: number;
  selectedDays: number;
  ratio: number;
}

export interface DateRangeProrationResult {
  isPartial: boolean;
  prorations: MonthProration[];
}

/**
 * Computes exact calendar-day proration details for each month touched by a custom date range.
 */
export function getMonthProrationDetails(
  startDateStr: string,
  endDateInclusiveStr: string
): DateRangeProrationResult {
  if (!isValidDateString(startDateStr) || !isValidDateString(endDateInclusiveStr)) {
    return { isPartial: false, prorations: [] };
  }

  const [y1, m1] = startDateStr.split("-").map(Number);
  const [y2, m2] = endDateInclusiveStr.split("-").map(Number);
  const prorations: MonthProration[] = [];
  let isPartial = false;

  let curY = y1;
  let curM = m1;
  while (curY < y2 || (curY === y2 && curM <= m2)) {
    const daysInMonth = new Date(Date.UTC(curY, curM, 0)).getUTCDate();
    const monthStartStr = formatDate(curY, curM, 1);
    const monthEndStr = formatDate(curY, curM, daysInMonth);

    const overlapStart = startDateStr > monthStartStr ? startDateStr : monthStartStr;
    const overlapEnd = endDateInclusiveStr < monthEndStr ? endDateInclusiveStr : monthEndStr;

    const selectedDays = getCalendarDayDifference(overlapStart, overlapEnd);
    const ratio = Math.max(0, Math.min(1, selectedDays / daysInMonth));

    if (selectedDays < daysInMonth) {
      isPartial = true;
    }

    prorations.push({
      year: curY,
      month: curM,
      daysInMonth,
      selectedDays,
      ratio,
    });

    curM++;
    if (curM > 12) {
      curM = 1;
      curY++;
    }
  }

  return { isPartial, prorations };
}

/**
 * Computes interval, exclusive end date, and month buckets for a custom date range.
 */
export function getCustomPeriodInterval(
  customFrom?: string,
  customTo?: string
): PeriodInterval {
  if (!isValidDateString(customFrom) || !isValidDateString(customTo)) {
    return getPeriodInterval("this_month");
  }

  // Reject reversed ranges: do NOT silently swap
  if (customFrom > customTo) {
    return getPeriodInterval("this_month");
  }

  // Reject date ranges exceeding the maximum allowable threshold
  const durationDays = getCalendarDayDifference(customFrom, customTo);
  if (durationDays > MAX_CUSTOM_PERIOD_DAYS) {
    return getPeriodInterval("this_month");
  }

  const startDate = customFrom;
  // Convert inclusive user end date to exclusive end date for SQL boundary
  const endDateExclusive = addCalendarDays(customTo, 1);
  const months = getMonthBucketsInRange(customFrom, customTo);
  const label = `${formatHumanDate(customFrom)} – ${formatHumanDate(customTo)}`;

  return {
    key: "custom",
    label,
    startDate,
    endDateExclusive,
    months,
    isCustom: true,
    customStartDate: customFrom,
    customEndDate: customTo,
  };
}

/**
 * Computes the comparative prior period of identical calendar duration immediately preceding customFrom.
 */
export function getCustomPreviousPeriodInterval(
  customFrom?: string,
  customTo?: string
): PeriodInterval {
  if (!isValidDateString(customFrom) || !isValidDateString(customTo)) {
    return getPreviousPeriodInterval("this_month");
  }

  // Reject reversed ranges
  if (customFrom > customTo) {
    return getPreviousPeriodInterval("this_month");
  }

  const durationDays = getCalendarDayDifference(customFrom, customTo);
  if (durationDays > MAX_CUSTOM_PERIOD_DAYS) {
    return getPreviousPeriodInterval("this_month");
  }

  // Prior period ends when current period starts (exclusive)
  const prevEndDateExclusive = customFrom;
  // Prior period starts (durationDays) before current start
  const prevStartDate = addCalendarDays(customFrom, -durationDays);
  // Inclusive last day of prior period
  const prevEndDateInclusive = addCalendarDays(customFrom, -1);

  const months = getMonthBucketsInRange(prevStartDate, prevEndDateInclusive);
  const label = `Prior Period (${formatHumanDate(prevStartDate)} – ${formatHumanDate(prevEndDateInclusive)})`;

  return {
    key: "custom",
    label,
    startDate: prevStartDate,
    endDateExclusive: prevEndDateExclusive,
    months,
    isCustom: true,
    customStartDate: prevStartDate,
    customEndDate: prevEndDateInclusive,
  };
}

/**
 * Computes the half-open interval [startDate, endDateExclusive) and chronological
 * list of months for the given period preset relative to a reference date.
 */
export function getPeriodInterval(
  periodKey: AnalyticsPeriodKey = "this_month",
  referenceDate: Date = new Date(),
  customFrom?: string,
  customTo?: string
): PeriodInterval {
  if (periodKey === "custom") {
    if (isValidDateString(customFrom) && isValidDateString(customTo)) {
      return getCustomPeriodInterval(customFrom, customTo);
    }
    // Fallback safely to this_month if custom dates are missing or invalid
    periodKey = "this_month";
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  let startDate = "";
  let endDateExclusive = "";
  let label = "This Month";
  const months: MonthBucket[] = [];

  switch (periodKey) {
    case "this_month": {
      label = "This Month";
      startDate = formatDate(currentYear, currentMonth, 1);
      // Next month 1st day
      if (currentMonth === 12) {
        endDateExclusive = formatDate(currentYear + 1, 1, 1);
      } else {
        endDateExclusive = formatDate(currentYear, currentMonth + 1, 1);
      }
      months.push(createMonthBucket(currentYear, currentMonth));
      break;
    }

    case "last_month": {
      label = "Last Month";
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      startDate = formatDate(prevYear, prevMonth, 1);
      endDateExclusive = formatDate(currentYear, currentMonth, 1);
      months.push(createMonthBucket(prevYear, prevMonth));
      break;
    }

    case "last_3_months": {
      label = "Last 3 Months";
      // End date is 1st of next month
      if (currentMonth === 12) {
        endDateExclusive = formatDate(currentYear + 1, 1, 1);
      } else {
        endDateExclusive = formatDate(currentYear, currentMonth + 1, 1);
      }

      // Collect 3 months chronologically: [current - 2, current - 1, current]
      for (let i = 2; i >= 0; i--) {
        let y = currentYear;
        let m = currentMonth - i;
        while (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push(createMonthBucket(y, m));
      }
      startDate = formatDate(months[0].year, months[0].month, 1);
      break;
    }

    case "last_6_months": {
      label = "Last 6 Months";
      // End date is 1st of next month
      if (currentMonth === 12) {
        endDateExclusive = formatDate(currentYear + 1, 1, 1);
      } else {
        endDateExclusive = formatDate(currentYear, currentMonth + 1, 1);
      }

      // Collect 6 months chronologically: [current - 5, ..., current]
      for (let i = 5; i >= 0; i--) {
        let y = currentYear;
        let m = currentMonth - i;
        while (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push(createMonthBucket(y, m));
      }
      startDate = formatDate(months[0].year, months[0].month, 1);
      break;
    }

    case "this_year": {
      label = "This Year";
      startDate = formatDate(currentYear, 1, 1);
      endDateExclusive = formatDate(currentYear + 1, 1, 1);

      for (let m = 1; m <= 12; m++) {
        months.push(createMonthBucket(currentYear, m));
      }
      break;
    }
  }

  return {
    key: periodKey,
    label,
    startDate,
    endDateExclusive,
    months,
  };
}

/**
 * Computes the equivalent non-overlapping prior period interval
 * for comparison and spending-change insights.
 */
export function getPreviousPeriodInterval(
  periodKey: AnalyticsPeriodKey = "this_month",
  referenceDate: Date = new Date(),
  customFrom?: string,
  customTo?: string
): PeriodInterval {
  if (periodKey === "custom") {
    if (isValidDateString(customFrom) && isValidDateString(customTo)) {
      return getCustomPreviousPeriodInterval(customFrom, customTo);
    }
    periodKey = "this_month";
  }

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth() + 1; // 1-12

  let startDate = "";
  let endDateExclusive = "";
  let label = "Prior Period";
  const months: MonthBucket[] = [];

  switch (periodKey) {
    case "this_month": {
      // Prior period is Month - 1 (Last Month)
      let prevYear = currentYear;
      let prevMonth = currentMonth - 1;
      if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
      }
      startDate = formatDate(prevYear, prevMonth, 1);
      endDateExclusive = formatDate(currentYear, currentMonth, 1);
      months.push(createMonthBucket(prevYear, prevMonth));
      label = `Last Month (${months[0].label})`;
      break;
    }

    case "last_month": {
      // Prior period is Month - 2 (Month before last)
      let m2Year = currentYear;
      let m2Month = currentMonth - 2;
      while (m2Month <= 0) {
        m2Month += 12;
        m2Year -= 1;
      }

      let m1Year = currentYear;
      let m1Month = currentMonth - 1;
      if (m1Month === 0) {
        m1Month = 12;
        m1Year -= 1;
      }

      startDate = formatDate(m2Year, m2Month, 1);
      endDateExclusive = formatDate(m1Year, m1Month, 1);
      months.push(createMonthBucket(m2Year, m2Month));
      label = `Prior Month (${months[0].label})`;
      break;
    }

    case "last_3_months": {
      // Current is [current - 2, current - 1, current]
      // Prior 3 months are [current - 5, current - 4, current - 3]
      for (let i = 5; i >= 3; i--) {
        let y = currentYear;
        let m = currentMonth - i;
        while (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push(createMonthBucket(y, m));
      }

      // End date is 1st of month (current - 2)
      let endY = currentYear;
      let endM = currentMonth - 2;
      while (endM <= 0) {
        endM += 12;
        endY -= 1;
      }

      startDate = formatDate(months[0].year, months[0].month, 1);
      endDateExclusive = formatDate(endY, endM, 1);
      label = "Prior 3 Months";
      break;
    }

    case "last_6_months": {
      // Current is [current - 5, ..., current]
      // Prior 6 months are [current - 11, ..., current - 6]
      for (let i = 11; i >= 6; i--) {
        let y = currentYear;
        let m = currentMonth - i;
        while (m <= 0) {
          m += 12;
          y -= 1;
        }
        months.push(createMonthBucket(y, m));
      }

      // End date is 1st of month (current - 5)
      let endY = currentYear;
      let endM = currentMonth - 5;
      while (endM <= 0) {
        endM += 12;
        endY -= 1;
      }

      startDate = formatDate(months[0].year, months[0].month, 1);
      endDateExclusive = formatDate(endY, endM, 1);
      label = "Prior 6 Months";
      break;
    }

    case "this_year": {
      // Prior year is full Year - 1
      const prevYear = currentYear - 1;
      startDate = formatDate(prevYear, 1, 1);
      endDateExclusive = formatDate(currentYear, 1, 1);

      for (let m = 1; m <= 12; m++) {
        months.push(createMonthBucket(prevYear, m));
      }
      label = `Prior Year (${prevYear})`;
      break;
    }
  }

  return {
    key: periodKey,
    label,
    startDate,
    endDateExclusive,
    months,
  };
}
