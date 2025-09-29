package com.iot.tools;

import java.io.*;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SensorLogReplayer {
    private static final Pattern HEX_LINE_PATTERN =
            Pattern.compile("Bytes in Hex:\\s*([0-9A-Fa-f\\s]+)");

    public static void main(String[] args) {
        if (args.length < 3) {
            System.out.println("Usage: java SensorLogReplayer <logFilePath> <host> <port> [delayMs]");
            System.exit(1);
        }

        String logFilePath = args[0];
        String host = args[1];
        int port = Integer.parseInt(args[2]);
        long delayMs = args.length >= 4 ? Long.parseLong(args[3]) : 0;

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(new FileInputStream(logFilePath), StandardCharsets.UTF_8),
                4000
        );
             Socket socket = new Socket(host, port);
             PrintWriter writer = new PrintWriter(socket.getOutputStream(), true)) {

            String line;
            long sentCount = 0;

            while ((line = reader.readLine()) != null) {
                Matcher matcher = HEX_LINE_PATTERN.matcher(line);
                if (matcher.find()) {
                    String hexData = matcher.group(1).replaceAll("\\s+", "").toUpperCase();

                    if (hexData.startsWith("FEDC") && hexData.length() >= 32) {
                        writer.println(hexData);
                        sentCount++;
                        if (delayMs > 0) Thread.sleep(delayMs);
                    }
                }
            }

            System.out.println("✅ Replay complete. Packets sent: " + sentCount);

        } catch (Exception e) {
            System.err.println("❌ Error during replay: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
