console.log("🔍 Debugging Hex String Alignment")
console.log("=".repeat(50))

// From your translation document:
console.log("Expected hex from translation document:")
console.log("FE DC 01 12 4A 7D A9 08 49 00 00 00 00 03 00 30")
console.log("00 00 00 ED 00 00 02 C2 00 01 58 78 00 00 00 1A")
console.log("00 00 00 26 00 00 00 07 00 00 00 C4 00 00 00 00")
console.log("00 00 00 00 00 00 00 1F 00 00 00 00 00 00 00 75 00")

// Convert to clean hex (no spaces)
const correctHex =
  "FEDC01124A7DA9084900000000030030000000ED000002C20001587800000001A000000260000000700000C40000000000000000000000001F00000000000000750"
console.log("\nCorrect clean hex:")
console.log(correctHex)
console.log(`Length: ${correctHex.length}`)

// Your test hex
const testHex =
  "FEDC01124A7DA9084900000000030030000000ED000002C20001587800000001A000000260000000700000C40000000000000000000000001F00000000000000750"
console.log("\nYour test hex:")
console.log(testHex)
console.log(`Length: ${testHex.length}`)

console.log("\nComparison:")
console.log(`Match: ${correctHex === testHex}`)

// Let's break down the correct positions based on your translation document
console.log("\n📊 Correct Field Positions:")
console.log(
  `Temperature (pos 32-40): ${correctHex.substring(32, 40)} = ${Number.parseInt(correctHex.substring(32, 40), 16)} -> ${Number.parseInt(correctHex.substring(32, 40), 16) / 10}°C`,
)
console.log(
  `Humidity (pos 40-48): ${correctHex.substring(40, 48)} = ${Number.parseInt(correctHex.substring(40, 48), 16)} -> ${Number.parseInt(correctHex.substring(40, 48), 16) / 10}%`,
)
console.log(
  `Pressure (pos 48-56): ${correctHex.substring(48, 56)} = ${Number.parseInt(correctHex.substring(48, 56), 16)} -> ${Number.parseInt(correctHex.substring(48, 56), 16) / 100}mbar`,
)

// The issue is here - let's find where PM2.5 should be
console.log("\n🔍 Looking for PM2.5 = 26 (0x1A):")
for (let i = 56; i < correctHex.length - 8; i += 8) {
  const value = Number.parseInt(correctHex.substring(i, i + 8), 16)
  console.log(`Position ${i}-${i + 8}: ${correctHex.substring(i, i + 8)} = ${value}`)
  if (value === 26) {
    console.log(`  ✅ Found PM2.5 = 26 at position ${i}`)
  }
  if (value === 38) {
    console.log(`  ✅ Found PM10 = 38 at position ${i}`)
  }
  if (value === 7) {
    console.log(`  ✅ Found Wind Speed = 7 (0.7m/s) at position ${i}`)
  }
  if (value === 196) {
    console.log(`  ✅ Found Wind Direction = 196° at position ${i}`)
  }
  if (value === 31) {
    console.log(`  ✅ Found RSSI = 31 at position ${i}`)
  }
  if (value === 117) {
    console.log(`  ✅ Found Version = 117 (11.7) at position ${i}`)
  }
}
