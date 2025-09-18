// Utility functions for date parsing and formatting

export function parseCustomDateFormat(dateString: string | number | Date): Date | null {
  if (!dateString) return null

  try {
    // If it's already a Date object or timestamp, use it directly
    if (dateString instanceof Date) return dateString
    if (typeof dateString === "number") return new Date(dateString)

    const dateStr = dateString.toString()

    if (dateStr.includes("/") && (dateStr.includes(" AM") || dateStr.includes(" PM"))) {
      const [datePart, timePart] = dateStr.split(" ")
      const dateParts = datePart.split("/").map(Number)

      // Always treat as DD/MM/YYYY format since your DB stores it this way
      const [day, month, year] = dateParts

      // Parse time with AM/PM
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i)
      if (timeMatch) {
        const [, hours, minutes, seconds, period] = timeMatch
        let hour24 = Number.parseInt(hours)

        if (period.toUpperCase() === "PM" && hour24 !== 12) {
          hour24 += 12
        } else if (period.toUpperCase() === "AM" && hour24 === 12) {
          hour24 = 0
        }

        return new Date(year, month - 1, day, hour24, Number.parseInt(minutes), Number.parseInt(seconds))
      }
    }

    if (dateStr.includes("/") && dateStr.includes(", ")) {
      const [datePart, timePart] = dateStr.split(", ")
      const dateParts = datePart.split("/").map(Number)

      // Determine if it's DD/MM/YYYY or MM/DD/YYYY based on the first number
      // If first number > 12, it's likely DD/MM/YYYY, otherwise MM/DD/YYYY
      let day: number, month: number, year: number

      if (dateParts[0] > 12) {
        // DD/MM/YYYY format
        ;[day, month, year] = dateParts
      } else if (dateParts[1] > 12) {
        // MM/DD/YYYY format
        ;[month, day, year] = dateParts
      } else {
        // Ambiguous case - assume DD/MM/YYYY for Indian format
        ;[day, month, year] = dateParts
      }

      // Check if time has AM/PM (12-hour format)
      const timeMatch12 = timePart.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)/i)
      if (timeMatch12) {
        const [, hours, minutes, seconds, period] = timeMatch12
        let hour24 = Number.parseInt(hours)

        if (period.toLowerCase() === "pm" && hour24 !== 12) {
          hour24 += 12
        } else if (period.toLowerCase() === "am" && hour24 === 12) {
          hour24 = 0
        }

        return new Date(year, month - 1, day, hour24, Number.parseInt(minutes), Number.parseInt(seconds))
      }

      // Handle 24-hour format (HH:MM:SS) - like "16:08:28"
      const timeMatch24 = timePart.match(/(\d{1,2}):(\d{2}):(\d{2})/)
      if (timeMatch24) {
        const [, hours, minutes, seconds] = timeMatch24
        return new Date(
          year,
          month - 1,
          day,
          Number.parseInt(hours),
          Number.parseInt(minutes),
          Number.parseInt(seconds),
        )
      }
    }

    // Handle format "MM-DD-YYYY HH:MM:SS AM/PM" (e.g., "06-20-2025 03:19:20 pm")
    if (dateStr.includes("-") && dateStr.includes(" ")) {
      const parts = dateStr.split(" ")
      const datePart = parts[0]
      const timePart = parts[1]
      const periodPart = parts[2] // AM or PM

      // Parse date parts (MM-DD-YYYY)
      const [month, day, year] = datePart.split("-").map(Number)

      // Parse time parts (HH:MM:SS)
      let [hours, minutes, seconds] = timePart.split(":").map(Number)

      // Convert 12-hour format to 24-hour format if needed
      if (periodPart && periodPart.toUpperCase() === "PM" && hours < 12) {
        hours += 12
      } else if (periodPart && periodPart.toUpperCase() === "AM" && hours === 12) {
        hours = 0
      }

      // Create date object (months are 0-indexed in JavaScript)
      return new Date(year, month - 1, day, hours, minutes, seconds)
    }

    // Fallback to standard date parsing
    return new Date(dateString)
  } catch (error) {
    console.error("Error parsing date:", error, dateString)
    return null
  }
}

export function formatRelativeTime(date: Date): string {
  if (!date || isNaN(date.getTime())) {
    return "Unknown time"
  }

  const now = new Date()
  const diffTime = now.getTime() - date.getTime()

  // Convert to seconds, minutes, hours, days
  const diffSeconds = Math.floor(diffTime / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  } else if (diffHours > 0) {
    return `${diffHours}hr${diffHours === 1 ? "" : "s"} ago`
  } else if (diffMinutes > 1) {
    return `${diffMinutes} min ago`
  } else if (diffMinutes === 1) {
    return "1 min ago"
  } else {
    return "just now"
  }
}

export function formatDateForDisplay(dateString: string | number | Date): string {
  const date = parseCustomDateFormat(dateString)
  if (!date) return "Invalid Date"

  const day = date.getDate().toString().padStart(2, "0")
  const month = (date.getMonth() + 1).toString().padStart(2, "0")
  const year = date.getFullYear()

  return `${day}/${month}/${year}`
}
