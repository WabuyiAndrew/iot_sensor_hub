class NotificationManager {
  constructor() {
    this.sentNotifications = new Map()
    this.notificationTimeout = 5 * 60 * 1000 // 5 minutes
  }

  // Generate unique notification key
  generateNotificationKey(deviceId, type, value) {
    return `${deviceId}-${type}-${Math.floor(value / 5) * 5}` // Round to nearest 5 to prevent micro-changes
  }

  // Check if notification was recently sent
  wasRecentlySent(key) {
    const lastSent = this.sentNotifications.get(key)
    if (!lastSent) return false

    const now = Date.now()
    return now - lastSent < this.notificationTimeout
  }

  // Mark notification as sent
  markAsSent(key) {
    this.sentNotifications.set(key, Date.now())

    // Clean up old entries
    this.cleanup()
  }

  // Clean up old notification entries
  cleanup() {
    const now = Date.now()
    for (const [key, timestamp] of this.sentNotifications.entries()) {
      if (now - timestamp > this.notificationTimeout) {
        this.sentNotifications.delete(key)
      }
    }
  }

  // Generate alert with deduplication
  generateAlert(deviceId, paramName, value, threshold, severity = "warning") {
    const key = this.generateNotificationKey(deviceId, paramName, value)

    if (this.wasRecentlySent(key)) {
      return null // Skip duplicate notification
    }

    this.markAsSent(key)

    return {
      id: `${paramName}-${deviceId}-${Date.now()}`,
      title: this.getAlertTitle(paramName, severity),
      message: this.getAlertMessage(deviceId, paramName, value, threshold),
      severity,
      createdAt: new Date().toISOString(),
      deviceId,
      paramName,
      value,
    }
  }

  getAlertTitle(paramName, severity) {
    const titles = {
      temperature: {
        critical: "🔥 Critical Temperature Alert",
        warning: "⚠️ High Temperature Warning",
        info: "ℹ️ Temperature Notice",
      },
      humidity: {
        critical: "💧 Critical Humidity Alert",
        warning: "⚠️ High Humidity Warning",
        info: "ℹ️ Humidity Notice",
      },
      ultrasonic_liquid_level: {
        critical: "🚨 Critical Water Level Alert",
        warning: "⚠️ Water Level Warning",
        info: "ℹ️ Water Level Notice",
      },
    }

    return titles[paramName]?.[severity] || `${severity.toUpperCase()} Alert`
  }

  getAlertMessage(deviceId, paramName, value, threshold) {
    const messages = {
      temperature: `Device ${deviceId}: Temperature is ${value}°C (threshold: ${threshold}°C)`,
      humidity: `Device ${deviceId}: Humidity is ${value}% (threshold: ${threshold}%)`,
      ultrasonic_liquid_level: `Device ${deviceId}: Water level is ${value}cm (threshold: ${threshold}cm)`,
    }

    return messages[paramName] || `Device ${deviceId}: ${paramName} is ${value}`
  }
}

module.exports = new NotificationManager()
