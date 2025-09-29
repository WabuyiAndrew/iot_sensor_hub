"use client"

import { useState, useEffect, useMemo } from "react"
import { Droplet, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from "lucide-react"

const EnhancedTankVisualization = ({
  tank,
  fillPercentage = 0,
  currentVolume = 0,
  capacity = 1000,
  status = "normal",
  animated = true,
  showDetails = true,
  size = "medium", // small, medium, large
}) => {
  const [animatedFill, setAnimatedFill] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  // Animate fill level changes
  useEffect(() => {
    if (animated && fillPercentage !== animatedFill) {
      setIsAnimating(true)
      const duration = 1500 // 1.5 seconds
      const steps = 60
      const stepValue = (fillPercentage - animatedFill) / steps
      let currentStep = 0

      const interval = setInterval(() => {
        currentStep++
        setAnimatedFill((prev) => {
          const newValue = prev + stepValue
          if (currentStep >= steps) {
            clearInterval(interval)
            setIsAnimating(false)
            return fillPercentage
          }
          return newValue
        })
      }, duration / steps)

      return () => clearInterval(interval)
    } else if (!animated) {
      setAnimatedFill(fillPercentage)
    }
  }, [fillPercentage, animated, animatedFill])

  // Size configurations
  const sizeConfig = useMemo(() => {
    switch (size) {
      case "small":
        return { width: 120, height: 160, strokeWidth: 2 }
      case "large":
        return { width: 200, height: 280, strokeWidth: 3 }
      default:
        return { width: 160, height: 220, strokeWidth: 2.5 }
    }
  }, [size])

  // Color scheme based on status and fill level
  const getColors = useMemo(() => {
    const fillLevel = animatedFill
    if (status === "critical" || fillLevel >= 90) {
      return {
        fill: "#ef4444", // red-500
        stroke: "#dc2626", // red-600
        glow: "#fca5a5", // red-300
        background: "#fef2f2", // red-50
      }
    } else if (status === "warning" || fillLevel >= 80) {
      return {
        fill: "#f59e0b", // amber-500
        stroke: "#d97706", // amber-600
        glow: "#fcd34d", // amber-300
        background: "#fffbeb", // amber-50
      }
    } else if (fillLevel <= 20) {
      return {
        fill: "#3b82f6", // blue-500
        stroke: "#2563eb", // blue-600
        glow: "#93c5fd", // blue-300
        background: "#eff6ff", // blue-50
      }
    } else {
      return {
        fill: "#10b981", // emerald-500
        stroke: "#059669", // emerald-600
        glow: "#6ee7b7", // emerald-300
        background: "#ecfdf5", // emerald-50
      }
    }
  }, [animatedFill, status])

  // Tank shape rendering with enhanced shapes and better liquid filling
  const renderTankShape = () => {
    const { width, height, strokeWidth } = sizeConfig
    const tankShape = tank?.shape || "cylindrical"
    const orientation = tank?.orientation || "vertical"
    const fillHeight = Math.max(0, (animatedFill / 100) * (height - 40))
    const fillY = height - 20 - fillHeight

    switch (tankShape) {
      case "rectangular":
        return (
          <g>
            {/* Tank outline */}
            <rect
              x={20}
              y={20}
              width={width - 40}
              height={height - 40}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
              rx={4}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <rect
                x={22}
                y={fillY}
                width={width - 44}
                height={fillHeight}
                fill={getColors.fill}
                opacity={0.8}
                rx={2}
              >
                {animated && <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />}
              </rect>
            )}
            {/* Liquid surface animation */}
            {animated && fillHeight > 0 && (
              <path
                d={`M 22 ${fillY} Q ${width / 2} ${fillY - 2} ${width - 22} ${fillY} Q ${width / 2} ${fillY + 2} 22 ${fillY}`}
                fill={getColors.glow}
                opacity={0.7}
              >
                <animateTransform
                  attributeName="transform"
                  type="translate"
                  values="0,0; 1,0; 0,0"
                  dur="3s"
                  repeatCount="indefinite"
                />
              </path>
            )}
          </g>
        )

      case "spherical":
        const radius = Math.min(width, height) / 2 - 20
        const centerX = width / 2
        const centerY = height / 2

        // Calculate the fill area for sphere
        const fillRatio = Math.min(animatedFill / 100, 1)
        const fillTopY = centerY + radius - (2 * radius * fillRatio)

        return (
          <g>
            {/* Tank outline */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill - using clipping path for accurate spherical fill */}
            {fillHeight > 0 && (
              <g>
                <defs>
                  <clipPath id="sphereClip">
                    <circle cx={centerX} cy={centerY} r={radius - 2} />
                  </clipPath>
                </defs>
                <rect
                  x={centerX - radius}
                  y={fillTopY}
                  width={2 * radius}
                  height={centerY + radius - fillTopY}
                  fill={getColors.fill}
                  opacity={0.8}
                  clipPath="url(#sphereClip)"
                >
                  {animated && <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />}
                </rect>
                {/* Liquid surface */}
                {animated && (
                  <ellipse
                    cx={centerX}
                    cy={fillTopY}
                    rx={Math.sqrt(radius * radius - (fillTopY - centerY) * (fillTopY - centerY))}
                    ry={3}
                    fill={getColors.glow}
                    opacity={0.6}
                    clipPath="url(#sphereClip)"
                  >
                    <animateTransform
                      attributeName="transform"
                      type="translate"
                      values="0,0; 1,0; 0,0"
                      dur="3s"
                      repeatCount="indefinite"
                    />
                  </ellipse>
                )}
              </g>
            )}
          </g>
        )

      case "silo": { // Added braces to create a new scope
        const siloBodyHeight = height - 80
        const coneHeight = 30
        return (
          <g>
            {/* Silo body (cylinder) */}
            <rect
              x={30}
              y={30}
              width={width - 60}
              height={siloBodyHeight}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Cone bottom */}
            <path
              d={`M 30 ${30 + siloBodyHeight} L ${width / 2} ${height - 20} L ${width - 30} ${30 + siloBodyHeight} Z`}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />

            {/* Fill logic for silo */}
            {fillHeight > 0 && (
              <g>
                {/* Fill in cone first */}
                {fillHeight <= coneHeight && (
                  <path
                    d={`M ${width / 2 - (fillHeight / coneHeight) * ((width - 60) / 2)} ${height - 20 - fillHeight}
                      L ${width / 2} ${height - 20}
                      L ${width / 2 + (fillHeight / coneHeight) * ((width - 60) / 2)} ${height - 20 - fillHeight} Z`}
                    fill={getColors.fill}
                    opacity={0.8}
                  />
                )}

                {/* Fill in cylinder when cone is full */}
                {fillHeight > coneHeight && (
                  <>
                    {/* Full cone */}
                    <path
                      d={`M 32 ${30 + siloBodyHeight} L ${width / 2} ${height - 22} L ${width - 32} ${30 + siloBodyHeight} Z`}
                      fill={getColors.fill}
                      opacity={0.8}
                    />
                    {/* Cylinder fill */}
                    <rect
                      x={32}
                      y={Math.max(32, height - 20 - fillHeight)}
                      width={width - 64}
                      height={Math.min(fillHeight - coneHeight, siloBodyHeight - 4)}
                      fill={getColors.fill}
                      opacity={0.8}
                    />
                  </>
                )}
              </g>
            )}
          </g>
        )
      } // End of scope for silo case

      case "dish_ends":
        const dishRadius = 15
        return (
          <g>
            {/* Main cylinder body */}
            <rect
              x={30}
              y={40}
              width={width - 60}
              height={height - 80}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Left dish end */}
            <path
              d={`M 30 40 Q ${30 - dishRadius} ${height / 2} 30 ${height - 40}`}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Right dish end */}
            <path
              d={`M ${width - 30} 40 Q ${width - 30 + dishRadius} ${height / 2} ${width - 30} ${height - 40}`}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                {/* Main body fill */}
                <rect
                  x={32}
                  y={Math.max(42, fillY)}
                  width={width - 64}
                  height={Math.max(0, Math.min(fillHeight, height - 82))}
                  fill={getColors.fill}
                  opacity={0.8}
                />
                {/* Left dish fill */}
                {fillHeight > 0 && (
                  <path
                    d={`M 32 ${Math.max(42, fillY)}
                          Q ${32 - dishRadius + 2} ${height / 2} 32 ${Math.min(height - 42, fillY + fillHeight)}`}
                    fill={getColors.fill}
                    opacity={0.8}
                  />
                )}
                {/* Right dish fill */}
                {fillHeight > 0 && (
                  <path
                    d={`M ${width - 32} ${Math.max(42, fillY)}
                          Q ${width - 32 + dishRadius - 2} ${height / 2} ${width - 32} ${Math.min(height - 42, fillY + fillHeight)}`}
                    fill={getColors.fill}
                    opacity={0.8}
                  />
                )}
              </g>
            )}
          </g>
        )

      case "horizontal_capsule":
        const capHeight = (height - 60) / 2
        return (
          <g>
            {/* Main body */}
            <rect
              x={40}
              y={30}
              width={width - 80}
              height={height - 60}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Left end cap */}
            <circle
              cx={40}
              cy={height / 2}
              r={capHeight}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Right end cap */}
            <circle
              cx={width - 40}
              cy={height / 2}
              r={capHeight}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                <defs>
                  <clipPath id="capsuleClip">
                    <rect x={42} y={32} width={width - 84} height={height - 64} />
                    <circle cx={40} cy={height / 2} r={capHeight - 2} />
                    <circle cx={width - 40} cy={height / 2} r={capHeight - 2} />
                  </clipPath>
                </defs>
                <rect
                  x={40 - capHeight}
                  y={fillY}
                  width={width - 80 + 2 * capHeight}
                  height={fillHeight}
                  fill={getColors.fill}
                  opacity={0.8}
                  clipPath="url(#capsuleClip)"
                />
              </g>
            )}
          </g>
        )

      case "vertical_capsule":
        const capRadius = (width - 60) / 2
        return (
          <g>
            {/* Main body */}
            <rect
              x={30}
              y={40}
              width={width - 60}
              height={height - 80}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Top end cap */}
            <circle
              cx={width / 2}
              cy={40}
              r={capRadius}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Bottom end cap */}
            <circle
              cx={width / 2}
              cy={height - 40}
              r={capRadius}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                <defs>
                  <clipPath id="vCapsuleClip">
                    <rect x={32} y={42} width={width - 64} height={height - 84} />
                    <circle cx={width / 2} cy={40} r={capRadius - 2} />
                    <circle cx={width / 2} cy={height - 40} r={capRadius - 2} />
                  </clipPath>
                </defs>
                <rect
                  x={width / 2 - capRadius}
                  y={fillY}
                  width={2 * capRadius}
                  height={fillHeight + capRadius}
                  fill={getColors.fill}
                  opacity={0.8}
                  clipPath="url(#vCapsuleClip)"
                />
              </g>
            )}
          </g>
        )

      case "horizontal_oval":
        const hOvalRx = (width - 40) / 2
        const hOvalRy = (height - 40) / 2
        return (
          <g>
            {/* Oval outline */}
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={hOvalRx}
              ry={hOvalRy}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                <defs>
                  <clipPath id="hOvalClip">
                    <ellipse cx={width / 2} cy={height / 2} rx={hOvalRx - 2} ry={hOvalRy - 2} />
                  </clipPath>
                </defs>
                <rect
                  x={width / 2 - hOvalRx}
                  y={fillY}
                  width={2 * hOvalRx}
                  height={fillHeight}
                  fill={getColors.fill}
                  opacity={0.8}
                  clipPath="url(#hOvalClip)"
                />
              </g>
            )}
          </g>
        )

      case "vertical_oval":
        const vOvalRx = (width - 40) / 2
        const vOvalRy = (height - 40) / 2
        return (
          <g>
            {/* Oval outline */}
            <ellipse
              cx={width / 2}
              cy={height / 2}
              rx={vOvalRx}
              ry={vOvalRy}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                <defs>
                  <clipPath id="vOvalClip">
                    <ellipse cx={width / 2} cy={height / 2} rx={vOvalRx - 2} ry={vOvalRy - 2} />
                  </clipPath>
                </defs>
                <rect
                  x={width / 2 - vOvalRx}
                  y={fillY}
                  width={2 * vOvalRx}
                  height={fillHeight}
                  fill={getColors.fill}
                  opacity={0.8}
                  clipPath="url(#vOvalClip)"
                />
              </g>
            )}
          </g>
        )

      case "conical": { // Added braces to create a new scope
        const coneWidth = width - 40
        const coneHeight = height - 40
        const fillTopY = height - 20 - fillHeight
        const fillWidth = coneWidth * (fillHeight / coneHeight)
        const fillX = width / 2 - fillWidth / 2

        return (
          <g>
            {/* Cone outline */}
            <path
              d={`M ${width / 2} 20 L 20 ${height - 20} L ${width - 20} ${height - 20} Z`}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            {/* Fill - conical fill that follows the shape */}
            {fillHeight > 0 && (
              <path
                d={`M ${fillX} ${fillTopY}
                    L ${width / 2} ${height - 20}
                    L ${fillX + fillWidth} ${fillTopY} Z`}
                fill={getColors.fill}
                opacity={0.8}
              >
                {animated && <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />}
              </path>
            )}
          </g>
        )
      } // End of scope for conical case

      default: // cylindrical
        return (
          <g>
            {/* Tank outline */}
            <ellipse
              cx={width / 2}
              cy={20}
              rx={(width - 40) / 2}
              ry={8}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            <rect
              x={20}
              y={20}
              width={width - 40}
              height={height - 40}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />
            <ellipse
              cx={width / 2}
              cy={height - 20}
              rx={(width - 40) / 2}
              ry={8}
              fill="none"
              stroke={getColors.stroke}
              strokeWidth={strokeWidth}
            />

            {/* Fill */}
            {fillHeight > 0 && (
              <g>
                {/* Main body fill */}
                <rect
                  x={22}
                  y={fillY}
                  width={width - 44}
                  height={fillHeight}
                  fill={getColors.fill}
                  opacity={0.8}
                />

                {/* Top surface of liquid */}
                {fillHeight > 8 && (
                  <ellipse
                    cx={width / 2}
                    cy={fillY}
                    rx={(width - 44) / 2}
                    ry={6}
                    fill={getColors.fill}
                    opacity={0.9}
                  >
                    {animated && <animate attributeName="opacity" values="0.7;1;0.7" dur="2s" repeatCount="indefinite" />}
                  </ellipse>
                )}

                {/* Bottom surface (always visible when there's liquid) */}
                <ellipse
                  cx={width / 2}
                  cy={height - 20}
                  rx={(width - 44) / 2}
                  ry={6}
                  fill={getColors.fill}
                  opacity={0.8}
                />

                {/* Surface ripple animation */}
                {animated && fillHeight > 8 && (
                  <ellipse
                    cx={width / 2}
                    cy={fillY}
                    rx={(width - 44) / 2}
                    ry={4}
                    fill={getColors.glow}
                    opacity={0.4}
                  >
                    <animate attributeName="rx" values={`${(width - 44) / 2};${(width - 44) / 2 + 2};${(width - 44) / 2}`} dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;0.6;0.2" dur="3s" repeatCount="indefinite" />
                  </ellipse>
                )}
              </g>
            )}
          </g>
        )
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case "critical":
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />
      case "normal":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Droplet className="w-4 h-4 text-blue-500" />
    }
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Tank Visualization */}
      <div className="relative">
        <svg
          key={`${tank?.shape}-${tank?.orientation}-${tank?._id}`}
          width={sizeConfig.width}
          height={sizeConfig.height}
          className="drop-shadow-lg rounded-lg"
          style={{ background: getColors.background }}
        >
          {/* Glow effect definitions */}
          <defs>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getColors.glow} stopOpacity="0.8" />
              <stop offset="100%" stopColor={getColors.fill} stopOpacity="1" />
            </linearGradient>
          </defs>

          {renderTankShape()}

          {/* Percentage text */}
          <text
            x={sizeConfig.width / 2}
            y={sizeConfig.height / 2}
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-bold fill-gray-700 dark:fill-gray-200"
            style={{ fontSize: size === 'large' ? '18px' : size === 'small' ? '12px' : '14px' }}
          >
            {Math.round(animatedFill)}%
          </text>

          {/* Animation indicator */}
          {isAnimating && (
            <circle cx={sizeConfig.width - 15} cy={15} r={3} fill={getColors.fill}>
              <animate attributeName="opacity" values="0;1;0" dur="1s" repeatCount="indefinite" />
            </circle>
          )}
        </svg>

        {/* Status indicator */}
        <div className="absolute top-2 left-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-md">
          {getStatusIcon()}
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <Droplet className="w-4 h-4 text-blue-500" />
            <span className="text-sm font-medium dark:text-white">
              {currentVolume.toLocaleString()} / {capacity.toLocaleString()} L
            </span>
          </div>
          <div className="flex items-center justify-center space-x-1 text-xs text-gray-600 dark:text-gray-400">
            {animatedFill > 50 ? (
              <TrendingUp className="w-3 h-3 text-green-500" />
            ) : (
              <TrendingDown className="w-3 h-3 text-red-500" />
            )}
            <span>{tank?.name || "Tank"}</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedTankVisualization
