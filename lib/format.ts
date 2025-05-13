import { format, differenceInDays } from "date-fns"

// Parse the specific date format used in the application
export const parseRequestDate = (dateString: string | undefined) => {
  if (!dateString) return null

  try {
    // Handle the specific format: "04-21-2025 03:51:44 pm"
    const [datePart, timePart] = dateString.split(" ")
    const [month, day, year] = datePart.split("-").map(Number)

    const [hourMinSec, ampm] = timePart.split(" ")
    let [hours, minutes, seconds] = hourMinSec.split(":").map(Number)

    // Convert 12-hour format to 24-hour
    if (ampm && ampm.toLowerCase() === "pm" && hours < 12) {
      hours += 12
    } else if (ampm && ampm.toLowerCase() === "am" && hours === 12) {
      hours = 0
    }

    const date = new Date(year, month - 1, day, hours, minutes, seconds)
    return date
  } catch (error) {
    console.error("Error parsing date:", dateString, error)
    return null
  }
}

// Check if a date is today
export const isToday = (date: Date) => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

// Format date string to readable format
export const formatDate = (dateString: string | undefined | null) => {
  if (!dateString) return "Not set"

  try {
    const parsedDate = parseRequestDate(dateString)
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      // Fallback to standard parsing if our custom parser fails
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return "Invalid date"
      return format(date, "PPP")
    }
    return format(parsedDate, "PPP")
  } catch (error) {
    console.error("Invalid date:", dateString)
    return "Invalid date"
  }
}

// Format distance in kilometers
export const formatDistance = (distance: number) => {
  return `${distance.toFixed(1)} km`
}

// Format time duration in minutes to hours and minutes
export const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins}m`
}

// Calculate experience from starting date
export const calculateExperience = (startingDate: string | undefined) => {
  if (!startingDate) return "N/A"

  try {
    const parsedDate = parseRequestDate(startingDate)
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      const startDate = new Date(startingDate)
      if (isNaN(startDate.getTime())) return "Invalid date"
      const days = differenceInDays(new Date(), startDate)
      if (days < 30) return `${days} days`
      if (days < 365) return `${Math.floor(days / 30)} months`
      return `${Math.floor(days / 365)} years`
    }

    const days = differenceInDays(new Date(), parsedDate)
    if (days < 30) return `${days} days`
    if (days < 365) return `${Math.floor(days / 30)} months`
    return `${Math.floor(days / 365)} years`
  } catch (error) {
    console.error("Error calculating experience:", error)
    return "N/A"
  }
}

// Format status to display name
export const formatStatus = (status: string | undefined) => {
  if (!status) return "Unknown"

  const statusMap: Record<string, string> = {
    pending: "Pending",
    Pending: "Pending",
    assigned: "Assigned (Pending)",
    Assigned: "Assigned (Pending)",
    ongoing: "Ongoing (Picked Up)",
    Ongoing: "Ongoing (Picked Up)",
    "in-progress": "In Progress",
    "In-progress": "In Progress",
    refilled: "Refilled (Canister Changed)",
    Refilled: "Refilled (Canister Changed)",
    completed: "Completed",
    Completed: "Completed",
    cancelled: "Cancelled",
    Cancelled: "Cancelled",
  }

  return statusMap[status] || status
}

// Get status badge variant
export const getStatusVariant = (
  status: string | undefined,
): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | undefined => {
  if (!status) return "secondary"

  // Convert to lowercase for case-insensitive comparison
  const statusLower = status.toLowerCase()

  if (statusLower === "pending") return "outline"
  if (statusLower === "assigned") return "outline" // Pending
  if (statusLower === "ongoing") return "default" // Picked up
  if (statusLower === "in-progress") return "default"
  if (statusLower === "refilled") return "warning" // Canister changed
  if (statusLower === "completed") return "success" // Completed
  if (statusLower === "cancelled") return "destructive" // Cancelled

  // Default fallback
  return "secondary"
}
