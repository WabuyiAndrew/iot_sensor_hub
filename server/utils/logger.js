// backend/utils/logger.js
const colors = require("colors")

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || "info"
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3,
    }
  }

  shouldLog(level) {
    return this.levels[level] >= this.levels[this.logLevel]
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString()
    const contextStr = Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : ""
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${contextStr}`
  }

  debug(message, context = {}) {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", message, context).gray)
    }
  }

  info(message, context = {}) {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", message, context).cyan)
    }
  }

  warn(message, context = {}) {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", message, context).yellow)
    }
  }

  error(message, context = {}) {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", message, context).red)
    }
  }
}

module.exports = { Logger: new Logger() }
