export class StringUtils {
  /**
   * Generate a slug from a string
   */
  static slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
  }

  /**
   * Capitalize first letter of each word
   */
  static titleCase(text: string): string {
    return text.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())
  }

  /**
   * Truncate text with ellipsis
   */
  static truncate(text: string, length = 100, suffix = "..."): string {
    if (text.length <= length) {
      return text
    }
    return text.substring(0, length).trim() + suffix
  }

  /**
   * Extract initials from name
   */
  static getInitials(name: string): string {
    return name
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase())
      .join("")
      .substring(0, 2)
  }

  /**
   * Generate random string
   */
  static randomString(length = 10): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let result = ""
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Mask email address
   */
  static maskEmail(email: string): string {
    const [username, domain] = email.split("@")
    const maskedUsername = username.charAt(0) + "*".repeat(username.length - 2) + username.charAt(username.length - 1)
    return `${maskedUsername}@${domain}`
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  /**
   * Generate color from string (for avatars)
   */
  static stringToColor(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }

    const hue = hash % 360
    return `hsl(${hue}, 70%, 50%)`
  }
}
