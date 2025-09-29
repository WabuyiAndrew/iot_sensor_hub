const fs = require("fs")
const readline = require("readline")

async function analyzeLogFile() {
  const logFilePath = "sensor_logs.log"

  if (!fs.existsSync(logFilePath)) {
    console.error(`❌ Log file not found: ${logFilePath}`)
    return
  }

  console.log("🔍 Analyzing your actual log file...")
  console.log("=".repeat(50))

  const fileStream = fs.createReadStream(logFilePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  let lineNumber = 0
  let linesWithHex = 0
  const hexPatterns = new Map()
  const sampleLines = []
  const timestampFormats = new Set()

  for await (const line of rl) {
    lineNumber++

    // Collect sample lines
    if (sampleLines.length < 10) {
      sampleLines.push(`Line ${lineNumber}: ${line.substring(0, 100)}...`)
    }

    // Check for timestamp patterns
    const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/)
    if (timestampMatch) {
      timestampFormats.add("YYYY-MM-DD HH:mm:ss.SSS")
    }

    // Look for hex data patterns
    const hexPatterns_check = ["Bytes in Hex: ", "hex: ", "data: ", "payload: ", "raw: "]

    let hexFound = false
    let hexData = null

    for (const pattern of hexPatterns_check) {
      const hexIndex = line.indexOf(pattern)
      if (hexIndex !== -1) {
        hexData = line.substring(hexIndex + pattern.length).trim()
        hexFound = true
        linesWithHex++

        // Get first 8 characters to identify patterns
        const hexStart = hexData.substring(0, 8).toUpperCase()
        const count = hexPatterns.get(hexStart) || 0
        hexPatterns.set(hexStart, count + 1)
        break
      }
    }

    // Stop after analyzing enough lines
    if (lineNumber >= 50000) break
  }

  console.log(`📊 Analysis Results (first ${lineNumber} lines):`)
  console.log(`📝 Total lines analyzed: ${lineNumber}`)
  console.log(`🔢 Lines with hex data: ${linesWithHex}`)
  console.log(`📅 Timestamp formats found: ${Array.from(timestampFormats).join(", ") || "None"}`)

  console.log("\n🔍 Sample lines from your log file:")
  sampleLines.forEach((line) => console.log(line))

  console.log("\n📈 Hex pattern frequency (first 8 chars):")
  const sortedPatterns = Array.from(hexPatterns.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)

  if (sortedPatterns.length === 0) {
    console.log("❌ No hex patterns found!")
    console.log("\n💡 Your log file might not contain sensor data in the expected format.")
    console.log("Expected format: lines containing 'Bytes in Hex: FEDC...'")
  } else {
    sortedPatterns.forEach(([pattern, count]) => {
      const isValid = pattern.startsWith("FEDC")
      const status = isValid ? "✅ VALID" : "❌ INVALID"
      console.log(`  ${pattern}: ${count} occurrences ${status}`)
    })

    // Check if any valid FEDC patterns exist
    const validPatterns = sortedPatterns.filter(([pattern]) => pattern.startsWith("FEDC"))
    if (validPatterns.length === 0) {
      console.log("\n❌ NO VALID SENSOR DATA FOUND!")
      console.log("Your log file contains hex data, but none start with 'FEDC'")
      console.log("This means your log file doesn't contain the expected sensor protocol data.")
    } else {
      console.log(`\n✅ Found ${validPatterns.length} valid sensor data patterns!`)
    }
  }

  console.log("\n🔧 Debugging suggestions:")
  console.log("1. Check if your log file is the correct one")
  console.log("2. Verify your sensors are using the FEDC protocol")
  console.log("3. Check if the log format has changed")
  console.log("4. Look for sensor data in a different log file")
}

analyzeLogFile().catch(console.error)
