/**
 * Shared CSV Utility Module
 * Adheres strictly to RFC 4180 standards and provides defense-in-depth against
 * CSV Spreadsheet Formula Injection (CWE-1236 / OWASP).
 */

export const UTF8_BOM = "\uFEFF";
export const CSV_LINE_BREAK = "\r\n";

export const CSV_FORMULA_TRIGGERS = ["=", "+", "-", "@", "\t", "\r"];

/**
 * Escapes a single cell value for RFC 4180 CSV export.
 *
 * If isTextField is true:
 * - Checks for formula injection characters (=, +, -, @) after leading whitespace and control characters.
 * - Neutralizes formulas by prepending an apostrophe (').
 * - Preserves valid pure numbers (even negative like "-150.00" or "+25.50") so
 *   financial calculations in spreadsheets remain numeric data types.
 *
 * Quotes the field with "" if it contains commas, double quotes, or newlines.
 */
export function escapeCsvField(val: unknown, isTextField = false): string {
  if (val === null || val === undefined) return '""';

  // If natively a number, format directly without formula prefixing
  if (typeof val === "number") {
    return Number.isFinite(val) ? `"${String(val)}"` : '""';
  }

  let str = String(val);

  // Neutralize spreadsheet formula injection on user-controlled text fields (CWE-1236)
  if (isTextField && str.length > 0) {
    // Strip leading whitespace and ASCII control characters to inspect effective leading trigger
    const trimmedLeading = str.replace(/^[\s\u0000-\u001f]+/, "");
    if (trimmedLeading.length > 0) {
      const firstChar = trimmedLeading.charAt(0);
      if (CSV_FORMULA_TRIGGERS.includes(firstChar)) {
        // Check if the trimmed string is a legitimate pure numeric amount (e.g. "-150.00", "+25.50")
        // Pure numbers do not contain '=' or '@' and parse cleanly via Number()
        const isPureNumber =
          !trimmedLeading.includes("=") &&
          !trimmedLeading.includes("@") &&
          !isNaN(Number(trimmedLeading)) &&
          !isNaN(parseFloat(trimmedLeading));

        if (!isPureNumber) {
          str = `'${str}`;
        }
      }
    }
  }

  // RFC 4180 escaping: double internal quotes and enclose in double quotes
  if (
    str.includes('"') ||
    str.includes(",") ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return `"${str}"`;
}
