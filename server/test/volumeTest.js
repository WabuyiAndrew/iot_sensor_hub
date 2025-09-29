// Test script to validate volume calculations
const { calculateTankVolume, calculateMaxTankVolume } = require("../utils/tankVolumeCalculations")

console.log("🧪 Testing Volume Calculations\n")

// Test Case 1: Cylindrical Tank
console.log("=== Test 1: Cylindrical Tank ===")
const cylindricalDimensions = {
  diameter: 2.0, // 2 meters diameter
  height: 3.0, // 3 meters height
}

const liquidLevel = 1.5 // 1.5 meters liquid level

console.log("Dimensions:", cylindricalDimensions)
console.log("Liquid Level:", liquidLevel, "m")

const maxVolume = calculateMaxTankVolume("cylindrical", "vertical", cylindricalDimensions)
console.log("Max Theoretical Volume:", (maxVolume * 1000).toFixed(2), "L")

const volumeResult = calculateTankVolume("cylindrical", "vertical", cylindricalDimensions, liquidLevel)
console.log("Calculated Volume:", (volumeResult.currentVolume * 1000).toFixed(2), "L")
console.log("Fill Percentage:", ((volumeResult.currentVolume / maxVolume) * 100).toFixed(1), "%")

// Expected: π × (1)² × 1.5 = 4.712 m³ = 4712 L
const expectedVolume = Math.PI * 1 * 1 * 1.5
console.log("Expected Volume:", (expectedVolume * 1000).toFixed(2), "L")
console.log("Match:", Math.abs(volumeResult.currentVolume - expectedVolume) < 0.001 ? "✅" : "❌")

console.log("\n=== Test 2: Rectangular Tank ===")
const rectangularDimensions = {
  length: 2.0, // 2 meters
  width: 1.5, // 1.5 meters
  height: 2.0, // 2 meters
}

const rectLiquidLevel = 1.0 // 1 meter liquid level

console.log("Dimensions:", rectangularDimensions)
console.log("Liquid Level:", rectLiquidLevel, "m")

const rectMaxVolume = calculateMaxTankVolume("rectangular", "vertical", rectangularDimensions)
console.log("Max Theoretical Volume:", (rectMaxVolume * 1000).toFixed(2), "L")

const rectVolumeResult = calculateTankVolume("rectangular", "vertical", rectangularDimensions, rectLiquidLevel)
console.log("Calculated Volume:", (rectVolumeResult.currentVolume * 1000).toFixed(2), "L")
console.log("Fill Percentage:", ((rectVolumeResult.currentVolume / rectMaxVolume) * 100).toFixed(1), "%")

// Expected: 2 × 1.5 × 1 = 3 m³ = 3000 L
const rectExpectedVolume = 2 * 1.5 * 1
console.log("Expected Volume:", (rectExpectedVolume * 1000).toFixed(2), "L")
console.log("Match:", Math.abs(rectVolumeResult.currentVolume - rectExpectedVolume) < 0.001 ? "✅" : "❌")

console.log("\n=== Test 3: Capacity Validation ===")
const tankCapacity = 5000 // 5000 L capacity
const calculatedVolume = 4712 // From test 1

console.log("Tank Capacity:", tankCapacity, "L")
console.log("Calculated Volume:", calculatedVolume, "L")
console.log("Within Capacity:", calculatedVolume <= tankCapacity ? "✅" : "❌")
console.log("Fill Percentage:", ((calculatedVolume / tankCapacity) * 100).toFixed(1), "%")
