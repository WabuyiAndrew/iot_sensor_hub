"use client"

import React, { useMemo, useCallback, useRef, useEffect } from "react"

const EnhancedGauge = ({
  value = 0,
  min = 0,
  max = 200,
  unit = "",
  label = "Parameter",
  zones = [],
  isDarkMode = false,
  size = "medium",
  showAnimation = true,
}) => {
  const animationRef = useRef(null)
  const [animatedValue, setAnimatedValue] = React.useState(value)
  const previousValueRef = useRef(value)

  // Enhanced size configurations with better proportions
  const sizeConfig = {
    small: {
      width: 240,
      height: 140,
      strokeWidth: 16,
      pointerWidth: 3,
      fontSize: 10,
      centerRadius: 8,
    },
    medium: {
      width: 320,
      height: 180,
      strokeWidth: 20,
      pointerWidth: 4,
      fontSize: 12,
      centerRadius: 10,
    },
    large: {
      width: 400,
      height: 220,
      strokeWidth: 24,
      pointerWidth: 5,
      fontSize: 14,
      centerRadius: 12,
    },
  }

  const config = sizeConfig[size] || sizeConfig.medium

  // Ensure we have valid numbers and proper clamping
  const safeValue = typeof value === "number" && !isNaN(value) ? value : 0
  const safeMin = typeof min === "number" && !isNaN(min) ? min : 0
  const safeMax = typeof max === "number" && !isNaN(max) && max > safeMin ? max : safeMin + 100

  // Clamp the value within min and max bounds
  const clampedValue = Math.max(safeMin, Math.min(safeMax, safeValue))

  useEffect(() => {
    // Only animate if the value actually changed
    if (previousValueRef.current === clampedValue) {
      return
    }

    previousValueRef.current = clampedValue

    if (!showAnimation) {
      setAnimatedValue(clampedValue)
      return
    }

    if (animationRef.current) {
      clearTimeout(animationRef.current)
    }

    const startValue = animatedValue
    const endValue = clampedValue
    const duration = Math.abs(endValue - startValue) > 10 ? 1500 : 800 // Longer animation for bigger changes
    const startTime = Date.now()

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOutCubic = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (endValue - startValue) * easeOutCubic

      setAnimatedValue(currentValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [clampedValue, showAnimation]) // Removed animatedValue from dependencies to prevent loops

  // Calculate the angle for the pointer (0-180 degrees) - FIXED CALCULATION
  const valueRange = safeMax - safeMin
  const normalizedValue = valueRange > 0 ? (animatedValue - safeMin) / valueRange : 0
  const angle = normalizedValue * 180 // 0 to 180 degrees

  // Enhanced pointer color logic
  const getPointerColor = useCallback(() => {
    if (zones.length === 0) {
      return isDarkMode ? "#60A5FA" : "#3B82F6" // Default blue
    }

    const sortedZones = [...zones].sort((a, b) => a.value - b.value)
    let color = sortedZones[0]?.color || (isDarkMode ? "#6B7280" : "#4B5563")

    for (let i = 0; i < sortedZones.length; i++) {
      if (animatedValue >= sortedZones[i].value) {
        color = sortedZones[i].color
      } else {
        break
      }
    }

    return color
  }, [animatedValue, zones, isDarkMode])

  const pointerColor = getPointerColor()

  // Generate scale values with proper distribution - FIXED SCALE GENERATION
  const getScaleValues = useCallback(() => {
    const values = []
    const numTicks = 11 // More ticks for better precision (0, 10, 20, ..., 100%)

    for (let i = 0; i < numTicks; i++) {
      const percentage = i / (numTicks - 1)
      const scaleValue = safeMin + (safeMax - safeMin) * percentage
      values.push({
        value: Math.round(scaleValue * 10) / 10,
        angle: percentage * 180,
        isMajor: i % 2 === 0, // Every other tick is major
      })
    }

    return values
  }, [safeMin, safeMax])

  const scaleValues = useMemo(() => getScaleValues(), [getScaleValues])

  // Enhanced gradient for the arc
  const getGradientStops = useCallback(() => {
    if (zones.length > 0) {
      return zones
        .map((zone, index) => ({
          offset: ((zone.value - safeMin) / (safeMax - safeMin)) * 100,
          color: zone.color,
        }))
        .sort((a, b) => a.offset - b.offset)
    }

    // Default gradient
    return [
      { offset: 0, color: "#10B981" },
      { offset: 25, color: "#22C55E" },
      { offset: 50, color: "#FACC15" },
      { offset: 75, color: "#F97316" },
      { offset: 100, color: "#EF4444" },
    ]
  }, [zones, safeMin, safeMax])

  const gradientStops = useMemo(() => getGradientStops(), [getGradientStops])

  // Calculate gauge dimensions
  const centerX = config.width / 2
  const centerY = config.height * 0.85
  const radius = config.width * 0.35

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
      <div className="relative flex items-center justify-center" style={{ width: config.width, height: config.height }}>
        {/* Background with glass morphism effect */}
        <div
          className="absolute rounded-t-full transition-all duration-500"
          style={{
            width: config.width * 0.9,
            height: config.width * 0.45,
            background: isDarkMode
              ? "linear-gradient(180deg, rgba(30, 41, 59, 0.1) 0%, rgba(51, 65, 85, 0.05) 100%)"
              : "linear-gradient(180deg, rgba(248, 250, 252, 0.3) 0%, rgba(226, 232, 240, 0.1) 100%)",
            transform: "translateY(20%)",
            boxShadow: isDarkMode ? "inset 0 0 10px rgba(0,0,0,0.1)" : "inset 0 0 8px rgba(0,0,0,0.02)",
          }}
        />

        {/* Main SVG for gauge */}
        <svg
          className="absolute drop-shadow-lg"
          width={config.width}
          height={config.height}
          viewBox={`0 0 ${config.width} ${config.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id={`gaugeGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              {gradientStops.map((stop, index) => (
                <stop key={index} offset={`${stop.offset}%`} stopColor={stop.color} />
              ))}
            </linearGradient>
            <filter id={`glow-${label}`}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id={`shadow-${label}`}>
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity="0.2" />
            </filter>
          </defs>

          {/* Background arc */}
          <path
            d={`M${centerX - radius},${centerY} A${radius},${radius} 0 0 1 ${centerX + radius},${centerY}`}
            fill="none"
            stroke={isDarkMode ? "#374151" : "#E5E7EB"}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* Main colored arc */}
          <path
            d={`M${centerX - radius},${centerY} A${radius},${radius} 0 0 1 ${centerX + radius},${centerY}`}
            fill="none"
            stroke={`url(#gaugeGradient-${label})`}
            strokeWidth={config.strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-700"
            filter={`url(#glow-${label})`}
          />

          {/* Scale marks with FIXED positioning */}
          {scaleValues.map((scale, index) => {
            const tickAngle = (180 - scale.angle) * (Math.PI / 180) // Convert to radians and flip
            const tickLength = scale.isMajor ? 15 : 10
            const tickWidth = scale.isMajor ? 3 : 2

            const x1 = centerX + (radius - tickLength) * Math.cos(tickAngle)
            const y1 = centerY - (radius - tickLength) * Math.sin(tickAngle)
            const x2 = centerX + radius * Math.cos(tickAngle)
            const y2 = centerY - radius * Math.sin(tickAngle)

            const textRadius = radius - tickLength - 20
            const textX = centerX + textRadius * Math.cos(tickAngle)
            const textY = centerY - textRadius * Math.sin(tickAngle)

            return (
              <g key={index}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isDarkMode ? "#D1D5DB" : "#4B5563"}
                  strokeWidth={tickWidth}
                  strokeLinecap="round"
                  opacity={scale.isMajor ? 0.9 : 0.6}
                />
                {scale.isMajor && (
                  <text
                    x={textX}
                    y={textY + 4}
                    textAnchor="middle"
                    fontSize={config.fontSize}
                    fill={isDarkMode ? "#F3F4F6" : "#374151"}
                    className="font-semibold"
                    style={{
                      filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.1))",
                    }}
                  >
                    {scale.value}
                  </text>
                )}
              </g>
            )
          })}

          {/* Enhanced pointer with FIXED angle calculation */}
          {typeof animatedValue === "number" && !isNaN(animatedValue) && (
            <g>
              {/* Pointer shadow */}
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + (radius - 25) * Math.cos((180 - angle) * (Math.PI / 180))}
                y2={centerY - (radius - 25) * Math.sin((180 - angle) * (Math.PI / 180))}
                stroke="rgba(0,0,0,0.2)"
                strokeWidth={config.pointerWidth + 1}
                strokeLinecap="round"
                transform={`translate(2, 2)`}
              />
              {/* Main pointer */}
              <line
                x1={centerX}
                y1={centerY}
                x2={centerX + (radius - 25) * Math.cos((180 - angle) * (Math.PI / 180))}
                y2={centerY - (radius - 25) * Math.sin((180 - angle) * (Math.PI / 180))}
                stroke={pointerColor}
                strokeWidth={config.pointerWidth}
                strokeLinecap="round"
                className="transition-all duration-300"
                filter={`url(#glow-${label})`}
              />
            </g>
          )}

          {/* Enhanced center circle */}
          <circle
            cx={centerX}
            cy={centerY}
            r={config.centerRadius}
            fill={isDarkMode ? "#1F2937" : "#FFFFFF"}
            stroke={pointerColor}
            strokeWidth={3}
            filter={`url(#shadow-${label})`}
          />
          <circle cx={centerX} cy={centerY} r={config.centerRadius - 3} fill={pointerColor} opacity={0.8} />
        </svg>
      </div>

      <div className="flex items-center justify-center space-x-6 text-sm mt-4 mb-2">
        <div className="text-center">
          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{safeMin}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">MIN</div>
        </div>
        <div
          className="text-center px-6 py-3 rounded-xl border-2 transition-all duration-300 relative"
          style={{
            backgroundColor: `${pointerColor}15`,
            borderColor: `${pointerColor}40`,
            boxShadow: `0 0 20px ${pointerColor}20`,
          }}
        >
          {Math.abs(animatedValue - previousValueRef.current) > 0.1 && (
            <div
              className="absolute inset-0 rounded-xl animate-pulse"
              style={{
                backgroundColor: `${pointerColor}30`,
              }}
            />
          )}
          <div className="relative z-10">
            <div className="text-2xl font-extrabold" style={{ color: pointerColor }}>
              {animatedValue.toFixed(1)}
            </div>
            <div className="text-xs font-bold opacity-80" style={{ color: pointerColor }}>
              {unit}
            </div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-sm font-bold text-gray-600 dark:text-gray-400">{safeMax}</div>
          <div className="text-xs text-gray-500 dark:text-gray-500 font-medium">MAX</div>
        </div>
      </div>

      {/* Zone indicators */}
      {zones.length > 0 && (
        <div className="flex items-center justify-center space-x-3 text-xs mt-2 flex-wrap">
          {zones.slice(0, 4).map((zone, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div className="w-3 h-2 rounded" style={{ backgroundColor: zone.color }} />
              <span className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{zone.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default EnhancedGauge
