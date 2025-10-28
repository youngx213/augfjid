package io.github.jeeanflores.bedrockBox.chat;

import io.github.jeeanflores.bedrockBox.BedrockBoxPlugin;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.entity.Player;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CompletableFuture;

public class TikTokChatIntegration {
    
    private final BedrockBoxPlugin plugin;
    private final String API_URL = "http://localhost:3001/api/tiktok/chat";
    private boolean chatEnabled = false;
    private String currentStreamer = null;
    
    public TikTokChatIntegration(BedrockBoxPlugin plugin) {
        this.plugin = plugin;
    }
    
    public void startChatListening(String streamerName) {
        this.currentStreamer = streamerName;
        this.chatEnabled = true;
        
        // Start listening for TikTok chat messages
        startChatLoop();
        
        // TikTok chat listening started (no console log)
    }
    
    public void stopChatListening() {
        this.chatEnabled = false;
        this.currentStreamer = null;
        
        // TikTok chat listening stopped (no console log)
    }
    
    private void startChatLoop() {
        Bukkit.getScheduler().runTaskAsynchronously(plugin, () -> {
            while (chatEnabled && currentStreamer != null) {
                try {
                    fetchAndProcessChatMessages();
                    Thread.sleep(2000); // Check every 2 seconds
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    break;
                } catch (Exception e) {
                    // Error fetching TikTok chat (no console log)
                    try {
                        Thread.sleep(5000); // Wait 5 seconds before retrying
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        });
    }
    
    private void fetchAndProcessChatMessages() {
        try {
            URL url = new URL(API_URL + "/messages?streamer=" + currentStreamer);
            HttpURLConnection connection = (HttpURLConnection) url.openConnection();
            
            connection.setRequestMethod("GET");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(5000);
            
            int responseCode = connection.getResponseCode();
            if (responseCode == HttpURLConnection.HTTP_OK) {
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(connection.getInputStream(), StandardCharsets.UTF_8));
                
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    response.append(line);
                }
                reader.close();
                
                // Process the chat messages
                processChatMessages(response.toString());
            }
            
            connection.disconnect();
            
        } catch (IOException e) {
            // Failed to fetch TikTok chat messages (no console log)
        }
    }
    
    private void processChatMessages(String jsonResponse) {
        // Simple JSON parsing for chat messages
        // This is a basic implementation - you might want to use a proper JSON library
        if (jsonResponse.contains("messages")) {
            // Extract and display chat messages
            String[] messages = jsonResponse.split("\"message\":");
            
            for (int i = 1; i < messages.length; i++) {
                String message = messages[i];
                if (message.contains("\"")) {
                    String chatMessage = message.substring(message.indexOf("\"") + 1, 
                        message.indexOf("\"", message.indexOf("\"") + 1));
                    
                    // Display in Minecraft chat
                    displayTikTokMessage(chatMessage);
                }
            }
        }
    }
    
    private void displayTikTokMessage(String message) {
        // Find the streamer player and display the message
        Player streamer = Bukkit.getPlayer(currentStreamer);
        if (streamer != null && streamer.isOnline()) {
            // Display TikTok chat message in Minecraft
            streamer.sendMessage(ChatColor.AQUA + "[TikTok] " + ChatColor.WHITE + message);
            
            // Also broadcast to nearby players (optional)
            for (Player player : streamer.getWorld().getPlayers()) {
                if (player.getLocation().distance(streamer.getLocation()) <= 50) {
                    if (!player.equals(streamer)) {
                        player.sendMessage(ChatColor.AQUA + "[TikTok] " + ChatColor.WHITE + message);
                    }
                }
            }
        }
    }
    
    public boolean isChatEnabled() {
        return chatEnabled;
    }
    
    public String getCurrentStreamer() {
        return currentStreamer;
    }
}
