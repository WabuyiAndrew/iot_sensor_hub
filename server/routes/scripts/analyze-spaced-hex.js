const fs = require("fs")
const readline = require("readline")

async function analyzeSpacedHex() {
  const logFilePath = "sensor_logs.log"
  console.log("🔍 Analyzing log file for SPACED hex data...")
  console.log("=".repeat(50))

  const fileStream = fs.createReadStream(logFilePath)
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Number.POSITIVE_INFINITY,
  })

  let lineNumber = 0
  let validSensorLines = 0
  const sampleValidLines = []

  for await (const line of rl) {
    lineNumber++

    // Look for hex data patterns
    const hexIndex = line.indexOf("Bytes in Hex: ")
    if (hexIndex !== -1) {
      const hexData = line.substring(hexIndex + "Bytes in Hex: ".length).trim()

      // Remove spaces and check if it starts with FEDC
      const cleanHex = hexData.replace(/\s/g, "").toUpperCase()

      if (cleanHex.startsWith("FEDC")) {
        validSensorLines++

        if (sampleValidLines.length < 5) {
          const timestamp = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3})/)
          sampleValidLines.push({
            line: lineNumber,
            timestamp: timestamp ? timestamp[1] : "No timestamp",
            hexStart: hexData.substring(0, 50) + "...",
            cleanHexStart: cleanHex.substring(0, 50) + "...",
            length: cleanHex.length,
          })
        }
      }
    }

    // Stop after checking enough lines
    if (lineNumber >= 100000) break
  }

  console.log(`📊 Results (first ${lineNumber} lines):`)
  console.log(`✅ Valid sensor data lines found: ${validSensorLines}`)

  if (validSensorLines > 0) {
    console.log("\n🎉 SUCCESS! Your sensor data IS in the log file!")
    console.log("The issue was that hex strings have SPACES that need to be removed.")

    console.log("\n📋 Sample valid sensor data:")
    sampleValidLines.forEach((sample, index) => {
      console.log(`\n${index + 1}. Line ${sample.line}:`)
      console.log(`   Timestamp: ${sample.timestamp}`)
      console.log(`   Raw hex: ${sample.hexStart}`)
      console.log(`   Clean hex: ${sample.cleanHexStart}`)
      console.log(`   Length: ${sample.length} characters`)
    })

    console.log(`\n✅ Found ${validSensorLines} valid sensor data entries!`)
    console.log("The processing script needs to handle spaced hex strings.")
  } else {
    console.log("❌ Still no valid sensor data found")
  }
}

analyzeSpacedHex().catch(console.error)
