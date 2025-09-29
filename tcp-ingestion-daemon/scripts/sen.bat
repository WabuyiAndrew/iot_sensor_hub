$serverHost = "localhost"
$serverPort = 8081
$logFile    = "C:\Users\Andy\Downloads\netty-app (3)\server.log"
$chunkSize  = 4000
$delayMs    = 50

Write-Host "🧪 Sending from $logFile in $chunkSize-line chunks..."

# Open TCP connection
$client = New-Object System.Net.Sockets.TcpClient($serverHost, $serverPort)
$stream = $client.GetStream()
$writer = New-Object System.IO.StreamWriter($stream)
$writer.AutoFlush = $true

$chunk = @()
Get-Content $logFile -ReadCount 1 | ForEach-Object {
    if ($_ -match "Bytes in Hex:") {
        $hex = ($_ -split "Bytes in Hex:\s*")[1] -replace "\s",""
        if ($hex -match "^FEDC" -and $hex.Length -ge 32) {
            $chunk += $hex
            if ($chunk.Count -ge $chunkSize) {
                foreach ($line in $chunk) { $writer.WriteLine($line) }
                $chunk = @()
                Start-Sleep -Milliseconds $delayMs
            }
        }
    }
}

# Send remaining lines if any
if ($chunk.Count -gt 0) {
    foreach ($line in $chunk) { $writer.WriteLine($line) }
}

$writer.Close()
$client.Close()

Write-Host "✅ Finished sending file in chunks."
