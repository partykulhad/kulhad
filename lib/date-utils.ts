// Utility functions for date parsing and formatting

export function parseCustomDateFormat(dateString: string | number | Date): Date | null {
  if (!dateString) return null

  try {
    // If it's already a Date object or timestamp, use it directly
    if (dateString instanceof Date) return dateString
    if (typeof dateString === "number") return new Date(dateString)

    const dateStr = dateString.toString()

    // Handle format "DD/MM/YYYY, HH:MM:SS AM/PM" (e.g., "20/6/2025, 3:18:04 pm")
    if (dateStr.includes("/") && dateStr.includes(",")) {
      const [datePart, timePart] = dateStr.split(", ")
      const [day, month, year] = datePart.split("/").map(Number)

      // Parse time with AM/PM
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)/i)
      if (timeMatch) {
        const [, hours, minutes, seconds, period] = timeMatch
        let hour24 = Number.parseInt(hours)

        if (period.toLowerCase() === "pm" && hour24 !== 12) {
          hour24 += 12
        } else if (period.toLowerCase() === "am" && hour24 === 12) {
          hour24 = 0
        }

        return new Date(year, month - 1, day, hour24, Number.parseInt(minutes), Number.parseInt(seconds))
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

  // Create a human-readable time ago string
  if (diffDays > 0) {
    return `${diffDays} ${diffDays === 1 ? "day" : "days"} ago`
  } else if (diffHours > 0) {
    return `${diffHours} ${diffHours === 1 ? "hour" : "hours"} ago`
  } else if (diffMinutes > 0) {
    return `${diffMinutes} ${diffMinutes === 1 ? "minute" : "minutes"} ago`
  } else if (diffSeconds > 30) {
    return `${diffSeconds} seconds ago`
  } else {
    return "Just now"
  }
}

export function formatDateForDisplay(dateString: string | number | Date): string {
  const date = parseCustomDateFormat(dateString)
  if (!date) return "Invalid Date"

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  })
}
