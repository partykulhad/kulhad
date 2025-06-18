export function formatDateTime(dateTimeString: string | null): string {
  if (!dateTimeString) return "N/A"

  try {
    // Handle the format "06-14-2025 04:08:43 pm"
    const date = new Date(dateTimeString)

    // If the date is invalid, try parsing the custom format
    if (isNaN(date.getTime())) {
      // Parse custom format: "06-14-2025 04:08:43 pm"
      const [datePart, timePart, ampm] = dateTimeString.split(" ")
      const [month, day, year] = datePart.split("-")
      const [hours, minutes, seconds] = timePart.split(":")

      let hour24 = Number.parseInt(hours)
      if (ampm?.toLowerCase() === "pm" && hour24 !== 12) {
        hour24 += 12
      } else if (ampm?.toLowerCase() === "am" && hour24 === 12) {
        hour24 = 0
      }

      const parsedDate = new Date(
        Number.parseInt(year),
        Number.parseInt(month) - 1, // Month is 0-indexed
        Number.parseInt(day),
        hour24,
        Number.parseInt(minutes),
        Number.parseInt(seconds),
      )

      // Format as DD/MM/YYYY, HH:MM:SS AM/PM
      return parsedDate.toLocaleString("en-GB", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    }

    // If date parsing worked, format it as DD/MM/YYYY
    return date.toLocaleString("en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })
  } catch (error) {
    console.error("Error formatting date:", error)
    return dateTimeString // Return original string if parsing fails
  }
}
