"use client"

import { useState, useEffect } from 'react'
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { useNetworkStatus } from '../hooks/useNetworkStatus'

const OfflineIndicator = () => {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus()
  const [showIndicator, setShowIndicator] = useState(false)

  useEffect(() => {
    if (!isOnline || isSlowConnection) {
      setShowIndicator(true)
    } else {
      // Hide indicator after a delay when back online
      const timer = setTimeout(() => setShowIndicator(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, isSlowConnection])

  if (!showIndicator) return null

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-2 duration-300">
      <div
        className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm ${
          !isOnline
            ? 'bg-red-500/90 text-white'
            : isSlowConnection
              ? 'bg-yellow-500/90 text-white'
              : 'bg-green-500/90 text-white'
        }`}
      >
        {!isOnline ? (
          <WifiOff className="w-4 h-4" />
        ) : isSlowConnection ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Wifi className="w-4 h-4" />
        )}
        <span className="text-sm font-medium">
          {!isOnline
            ? 'Offline - Using cached data'
            : isSlowConnection
              ? `Slow connection (${effectiveType})`
              : 'Back online'}
        </span>
      </div>
    </div>
  )
}

export default OfflineIndicator