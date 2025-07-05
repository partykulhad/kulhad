// Utility functions for working with working days

export const WORKING_DAYS_CODES = {
  MON_FRI: "MON_FRI",
  MON_SAT: "MON_SAT",
  ALL_DAYS: "ALL_DAYS",
} as const

export type WorkingDaysCode = (typeof WORKING_DAYS_CODES)[keyof typeof WORKING_DAYS_CODES]

export const WORKING_DAYS_OPTIONS = [
  { label: "Monday - Friday", value: WORKING_DAYS_CODES.MON_FRI },
  { label: "Monday - Saturday", value: WORKING_DAYS_CODES.MON_SAT },
  { label: "All 7 Days", value: WORKING_DAYS_CODES.ALL_DAYS },
]

/**
 * Get display label from working days code
 */
export const getWorkingDaysLabel = (code: string): string => {
  const option = WORKING_DAYS_OPTIONS.find((opt) => opt.value === code)
  return option ? option.label : code
}

/**
 * Check if a machine should be working on a specific day
 * @param workingDaysCode - The working days code (MON_FRI, MON_SAT, ALL_DAYS)
 * @param dayOfWeek - Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @returns boolean indicating if machine should be working
 */
export const isMachineWorkingOnDay = (workingDaysCode: string, dayOfWeek: number): boolean => {
  switch (workingDaysCode) {
    case WORKING_DAYS_CODES.MON_FRI:
      // Monday (1) to Friday (5)
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case WORKING_DAYS_CODES.MON_SAT:
      // Monday (1) to Saturday (6)
      return dayOfWeek >= 1 && dayOfWeek <= 6
    case WORKING_DAYS_CODES.ALL_DAYS:
      // All 7 days
      return true
    default:
      // Default to Monday-Friday if unknown code
      return dayOfWeek >= 1 && dayOfWeek <= 5
  }
}

/**
 * Get current day of week
 * @returns number (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export const getCurrentDayOfWeek = (): number => {
  return new Date().getDay()
}

/**
 * Check if a machine should be working today
 * @param workingDaysCode - The working days code
 * @returns boolean indicating if machine should be working today
 */
export const isMachineWorkingToday = (workingDaysCode: string): boolean => {
  const today = getCurrentDayOfWeek()
  return isMachineWorkingOnDay(workingDaysCode, today)
}

/**
 * Get working days as an array of day names
 * @param workingDaysCode - The working days code
 * @returns Array of day names
 */
export const getWorkingDaysArray = (workingDaysCode: string): string[] => {
  const allDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  switch (workingDaysCode) {
    case WORKING_DAYS_CODES.MON_FRI:
      return allDays.slice(1, 6) // Monday to Friday
    case WORKING_DAYS_CODES.MON_SAT:
      return allDays.slice(1, 7) // Monday to Saturday
    case WORKING_DAYS_CODES.ALL_DAYS:
      return allDays // All days
    default:
      return allDays.slice(1, 6) // Default to Monday-Friday
  }
}
