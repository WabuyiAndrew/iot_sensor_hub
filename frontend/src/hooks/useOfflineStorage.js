"use client"

// Enhanced offline storage hook for persistent state management
import { useState, useCallback } from "react"

export const useOfflineStorage = (key, initialValue = null) => {
  const [data, setData] = useState(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      console.warn(`Failed to load ${key} from localStorage:`, error)
      return initialValue
    }
  })

  const [lastUpdated, setLastUpdated] = useState(() => {
    try {
      const timestamp = localStorage.getItem(`${key}_timestamp`)
      return timestamp ? new Date(timestamp) : null
    } catch (error) {
      return null
    }
  })

  const updateData = useCallback(
    (newData, merge = true) => {
      try {
        const updatedData =
          merge && data && typeof data === "object" && typeof newData === "object" ? { ...data, ...newData } : newData

        setData(updatedData)
        setLastUpdated(new Date())

        localStorage.setItem(key, JSON.stringify(updatedData))
        localStorage.setItem(`${key}_timestamp`, new Date().toISOString())
      } catch (error) {
        console.error(`Failed to save ${key} to localStorage:`, error)
      }
    },
    [key, data],
  )

  const clearData = useCallback(() => {
    try {
      localStorage.removeItem(key)
      localStorage.removeItem(`${key}_timestamp`)
      setData(initialValue)
      setLastUpdated(null)
    } catch (error) {
      console.error(`Failed to clear ${key} from localStorage:`, error)
    }
  }, [key, initialValue])

  const isStale = useCallback(
    (maxAge = 5 * 60 * 1000) => {
      // 5 minutes default
      if (!lastUpdated) return true
      return Date.now() - lastUpdated.getTime() > maxAge
    },
    [lastUpdated],
  )

  return {
    data,
    lastUpdated,
    updateData,
    clearData,
    isStale,
  }
}
