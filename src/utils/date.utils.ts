export class DateUtils {
  /**
   * Check if a date is expired
   */
  static isExpired(date: Date): boolean {
    return new Date() > date
  }

  /**
   * Add time to a date
   */
  static addTime(date: Date, amount: number, unit: "minutes" | "hours" | "days" | "weeks"): Date {
    const newDate = new Date(date)

    switch (unit) {
      case "minutes":
        newDate.setMinutes(newDate.getMinutes() + amount)
        break
      case "hours":
        newDate.setHours(newDate.getHours() + amount)
        break
      case "days":
        newDate.setDate(newDate.getDate() + amount)
        break
      case "weeks":
        newDate.setDate(newDate.getDate() + amount * 7)
        break
    }

    return newDate
  }

  /**
   * Format date for display
   */
  static formatDate(date: Date, format: "short" | "long" | "iso" = "short"): string {
    switch (format) {
      case "short":
        return date.toLocaleDateString()
      case "long":
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      case "iso":
        return date.toISOString()
      default:
        return date.toString()
    }
  }

  /**
   * Get time ago string
   */
  static timeAgo(date: Date): string {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "just now"
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60)
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes > 1 ? "s" : ""} ago`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 30) {
      return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`
    }

    const diffInMonths = Math.floor(diffInDays / 30)
    if (diffInMonths < 12) {
      return `${diffInMonths} month${diffInMonths > 1 ? "s" : ""} ago`
    }

    const diffInYears = Math.floor(diffInMonths / 12)
    return `${diffInYears} year${diffInYears > 1 ? "s" : ""} ago`
  }

  /**
   * Check if date is within business hours
   */
  static isBusinessHours(date: Date, startHour = 9, endHour = 17): boolean {
    const hour = date.getHours()
    const day = date.getDay()

    // Check if it's a weekday (Monday = 1, Friday = 5)
    const isWeekday = day >= 1 && day <= 5

    return isWeekday && hour >= startHour && hour < endHour
  }

  /**
   * Get next business day
   */
  static getNextBusinessDay(date: Date = new Date()): Date {
    const nextDay = new Date(date)
    nextDay.setDate(nextDay.getDate() + 1)

    // If it's Saturday (6) or Sunday (0), move to Monday
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay.setDate(nextDay.getDate() + 1)
    }

    return nextDay
  }
}
