package io.github.jeeanflores.bedrockBox.utils;

import com.google.gson.Gson;
import com.google.gson.JsonObject;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class ApiClient {
    
    private final String apiUrl;
    private final String pluginKey;
    private final Gson gson = new Gson();
    
    // Rate limiting
    private long lastRequestTime = 0;
    private static final long MIN_REQUEST_INTERVAL = 100; // 100ms between requests
    
    public ApiClient(String pluginKey, String apiUrl) {
        this.pluginKey = pluginKey;
        this.apiUrl = apiUrl;
    }
    
    public void sendGameResult(String playerName, boolean won, int blocksPlaced, int tntExploded) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("username", playerName);
            payload.addProperty("giftName", won ? "game_win" : "game_lose");
            payload.addProperty("nickname", playerName);
            payload.addProperty("amount", won ? blocksPlaced : tntExploded);
            
            System.out.println("[BedrockBox] Sending game result: " + playerName + " won=" + won + " blocks=" + blocksPlaced + " tnt=" + tntExploded);
            sendRequest("/trigger", payload);
        } catch (Exception e) {
            System.err.println("Error sending game result: " + e.getMessage());
        }
    }
    
    public void sendGiftTrigger(String streamerName, String giftType, int amount) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("username", streamerName);
            payload.addProperty("giftName", giftType);
            payload.addProperty("nickname", streamerName);
            payload.addProperty("amount", amount);
            
            System.out.println("[BedrockBox] Sending gift trigger: " + streamerName + " gift=" + giftType + " amount=" + amount);
            sendRequest("/trigger", payload);
        } catch (Exception e) {
            System.err.println("Error sending gift trigger: " + e.getMessage());
        }
    }
    
    public void sendBoxCreated(String playerName, int size, int height) {
        try {
            JsonObject payload = new JsonObject();
            payload.addProperty("username", playerName);
            payload.addProperty("giftName", "box_created");
            payload.addProperty("nickname", playerName);
            payload.addProperty("amount", size * height);
            
            System.out.println("[BedrockBox] Sending box created: " + playerName + " size=" + size + " height=" + height);
            sendRequest("/trigger", payload);
        } catch (Exception e) {
            System.err.println("Error sending box created: " + e.getMessage());
        }
    }
    
    private void sendRequest(String endpoint, JsonObject payload) throws IOException {
        // Rate limiting
        long currentTime = System.currentTimeMillis();
        long timeSinceLastRequest = currentTime - lastRequestTime;
        if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
            try {
                Thread.sleep(MIN_REQUEST_INTERVAL - timeSinceLastRequest);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("Request interrupted", e);
            }
        }
        lastRequestTime = System.currentTimeMillis();
        
        URL url = new URL(apiUrl + endpoint);
        System.out.println("[BedrockBox] Connecting to: " + url.toString());
        HttpURLConnection connection = (HttpURLConnection) url.openConnection();
        
        connection.setRequestMethod("POST");
        connection.setRequestProperty("Content-Type", "application/json");
        connection.setRequestProperty("User-Agent", "BedrockBox-Plugin/1.0");
        connection.setRequestProperty("x-plugin-key", pluginKey);
        connection.setDoOutput(true);
        connection.setConnectTimeout(5000); // 5 second timeout
        connection.setReadTimeout(5000);
        
        try (OutputStream os = connection.getOutputStream()) {
            byte[] input = gson.toJson(payload).getBytes(StandardCharsets.UTF_8);
            os.write(input, 0, input.length);
        }
        
        int responseCode = connection.getResponseCode();
        
        if (responseCode >= 200 && responseCode < 300) {
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8))) {
                StringBuilder response = new StringBuilder();
                String responseLine;
                while ((responseLine = br.readLine()) != null) {
                    response.append(responseLine.trim());
                }
                
                // Parse response to check for API errors
                try {
                    JsonObject jsonResponse = gson.fromJson(response.toString(), JsonObject.class);
                    if (jsonResponse.has("ok") && !jsonResponse.get("ok").getAsBoolean()) {
                        String errorMsg = jsonResponse.has("error") ? jsonResponse.get("error").getAsString() : "Unknown API error";
                        System.err.println("API returned error: " + errorMsg);
                    }
                } catch (Exception e) {
                    // Response is not valid JSON, ignore
                }
            }
        } else {
            // Try to read error response
            String errorMessage = "API request failed with response code: " + responseCode;
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(connection.getErrorStream(), StandardCharsets.UTF_8))) {
                StringBuilder errorResponse = new StringBuilder();
                String errorLine;
                while ((errorLine = br.readLine()) != null) {
                    errorResponse.append(errorLine.trim());
                }
                if (errorResponse.length() > 0) {
                    errorMessage += " - " + errorResponse.toString();
                }
            } catch (Exception e) {
                // Ignore error reading error stream
            }
            System.err.println(errorMessage);
        }
        
        connection.disconnect();
    }
    
    // Method to handle plugin trigger response with punishment image
    public void handleGiftTrigger(String giftName, String nickname, int amount, String punishmentImageUrl) {
        // This method will be called by the plugin when receiving trigger data
        // The punishment image URL can be displayed or used as needed
        System.out.println("[BedrockBox] Gift trigger received: " + giftName + " from " + nickname + " (amount: " + amount + ")");
        if (punishmentImageUrl != null && !punishmentImageUrl.isEmpty()) {
            System.out.println("[BedrockBox] Punishment image: " + punishmentImageUrl);
        }
    }
}