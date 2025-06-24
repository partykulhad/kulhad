import { format, parse, isValid, parseISO } from "date-fns"

// Common date/time formats that your system might encounter
const DATE_FORMATS = [
  // Your specific formats
  "dd/M/yyyy, h:mm:ss a", // "20/6/2025, 3:18:04 pm"
  "MM-dd-yyyy hh:mm:ss a", // "06-20-2025 03:19:20 pm"
  "MM-dd-yyyy HH:mm:ss a", // "06-20-2025 15:19:20 PM"

  // Additional common formats
  "yyyy-MM-dd HH:mm:ss", // "2025-06-20 15:18:04"
  "yyyy-MM-dd'T'HH:mm:ss.SSSxxx", // ISO format
  "yyyy-MM-dd'T'HH:mm:ssxxx", // ISO format without milliseconds
  "yyyy-MM-dd'T'HH:mm:ss'Z'", // UTC format
  "MM/dd/yyyy HH:mm:ss", // "06/20/2025 15:18:04"
  "dd/MM/yyyy HH:mm:ss", // "20/06/2025 15:18:04"
  "yyyy/MM/dd HH:mm:ss", // "2025/06/20 15:18:04"
  "dd-MM-yyyy HH:mm:ss", // "20-06-2025 15:18:04"
  "MM/dd/yyyy h:mm:ss a", // "06/20/2025 3:18:04 PM"
  "dd/MM/yyyy h:mm:ss a", // "20/06/2025 3:18:04 PM"
  "M/d/yyyy, h:mm:ss a", // "6/20/2025, 3:18:04 PM"
  "d/M/yyyy, h:mm:ss a", // "20/6/2025, 3:18:04 PM"
  "MMM dd, yyyy h:mm:ss a", // "Jun 20, 2025 3:18:04 PM"
  "dd MMM yyyy HH:mm:ss", // "20 Jun 2025 15:18:04"
]

/**
 * Attempts to parse a date string using multiple format patterns
 */
export function parseFlexibleDate(dateString: string | number | undefined): Date | null {
  if (!dateString) return null

  // Handle timestamp numbers
  if (typeof dateString === "number") {
    const date = new Date(dateString)
    return isValid(date) ? date : null
  }

  // Handle string dates
  const dateStr = dateString.toString().trim()
  if (!dateStr) return null

  // Try parsing as ISO string first (most common)
  try {
    const isoDate = parseISO(dateStr)
    if (isValid(isoDate)) return isoDate
  } catch (error) {
    // Continue to other formats
  }

  // Try direct Date constructor
  try {
    const directDate = new Date(dateStr)
    if (isValid(directDate) && !isNaN(directDate.getTime())) {
      return directDate
    }
  } catch (error) {
    // Continue to format-specific parsing
  }

  // Try each format pattern
  for (const formatPattern of DATE_FORMATS) {
    try {
      const parsedDate = parse(dateStr, formatPattern, new Date())
      if (isValid(parsedDate)) {
        return parsedDate
      }
    } catch (error) {
      // Continue to next format
      continue
    }
  }

  console.warn(`Unable to parse date: ${dateStr}`)
  return null
}

/**
 * Main formatting function for the requests table
 * Handles all your date formats and provides consistent output
 */
export function formatDateTime(
  dateInput: string | number | Date | undefined,
  outputFormat = "MMM dd, yyyy h:mm:ss a"
): string {
  if (!dateInput) return "N/A"

  let date: Date | null = null

  // Handle Date objects
  if (dateInput instanceof Date) {
    date = isValid(dateInput) ? dateInput : null
  } else {
    // Parse flexible date formats
    date = parseFlexibleDate(dateInput)
  }

  if (!date) {
    return "Invalid Date"
  }

  try {
    return format(date, outputFormat)
  } catch (error) {
    console.error("Error formatting date:", error)
    return "Format Error"
  }
}

/**
 * Validates if a date string can be parsed
 */
export function isValidDateString(dateString: string | number | undefined): boolean {
  return parseFlexibleDate(dateString) !== null
}

/**
 * Enhanced date parsing for filtering - handles your specific formats
 */
export function parseDateForFiltering(dateString: string | undefined): Date | null {
  if (!dateString) return null
  return parseFlexibleDate(dateString)
}
