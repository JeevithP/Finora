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
function formatDate(year: number, month: number, day: number = 1): string {
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
 * Validates and safely parses a period key from searchParams.
 */
export function parsePeriodKey(key?: string | null): AnalyticsPeriodKey {
  if (
    key === "this_month" ||
    key === "last_month" ||
    key === "last_3_months" ||
    key === "last_6_months" ||
    key === "this_year"
  ) {
    return key;
  }
  return "this_month";
}

/**
 * Computes the half-open interval [startDate, endDateExclusive) and chronological
 * list of months for the given period preset relative to a reference date.
 */
export function getPeriodInterval(
  periodKey: AnalyticsPeriodKey = "this_month",
  referenceDate: Date = new Date()
): PeriodInterval {
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
  referenceDate: Date = new Date()
): PeriodInterval {
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
