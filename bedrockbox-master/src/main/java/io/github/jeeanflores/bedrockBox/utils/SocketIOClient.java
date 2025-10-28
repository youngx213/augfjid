package io.github.jeeanflores.bedrockBox.utils;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import io.socket.client.IO;
import io.socket.client.Socket;
import io.socket.emitter.Emitter;
import org.bukkit.Bukkit;

import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

public class SocketIOClient {
    
    private Socket socket;
    private final String serverUrl;
    private final String pluginKey;
    private final String username;
    private final Gson gson = new Gson();
    private boolean isConnected = false;
    
    // Callback interface for handling gifts
    public interface GiftCallback {
        void onGiftReceived(String giftName, String nickname, int amount, JsonObject data);
    }
    
    private GiftCallback giftCallback;
    
    public SocketIOClient(String serverUrl, String pluginKey, String username) {
        this.serverUrl = serverUrl;
        this.pluginKey = pluginKey;
        this.username = username;
    }
    
    public void setGiftCallback(GiftCallback callback) {
        this.giftCallback = callback;
    }
    
    public void connect() {
        try {
            IO.Options options = IO.Options.builder()
                .setAuth(Map.of("pluginKey", pluginKey))
                .build();
            
            socket = IO.socket(serverUrl, options);
            
            // Connection event
            socket.on(Socket.EVENT_CONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    isConnected = true;
                    System.out.println("[SocketIO] Connected to backend");
                    
                    // Join plugin room with plugin key
                    Map<String, String> joinData = new HashMap<>();
                    joinData.put("pluginKey", pluginKey);
                    joinData.put("username", username);
                    socket.emit("join:plugin", gson.toJson(joinData));
                }
            });
            
            // Disconnect event
            socket.on(Socket.EVENT_DISCONNECT, new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    isConnected = false;
                    System.out.println("[SocketIO] Disconnected from backend");
                }
            });
            
            // Plugin ready event
            socket.on("plugin:ready", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    System.out.println("[SocketIO] Plugin ready, username: " + username);
                }
            });
            
            // Plugin trigger event (main event for receiving gifts)
            socket.on("plugin:trigger", new Emitter.Listener() {
                @Override
                public void call(Object... args) {
                    try {
                        // Get JSON string from args
                        String dataString = args.length > 0 ? args[0].toString() : null;
                        
                        if (dataString != null && !dataString.isEmpty()) {
                            JsonObject data = gson.fromJson(dataString, JsonObject.class);
                            
                            String giftName = data.has("giftName") ? data.get("giftName").getAsString() : "";
                            String nickname = data.has("nickname") ? data.get("nickname").getAsString() : "";
                            int amount = data.has("amount") ? data.get("amount").getAsInt() : 1;
                            
                            System.out.println("[SocketIO] Received gift trigger: " + giftName + " from " + nickname + " (amount: " + amount + ")");
                            
                            // Execute commands from backend
                            if (data.has("commands")) {
                                JsonArray commands = data.get("commands").getAsJsonArray();
                                System.out.println("[SocketIO] Executing " + commands.size() + " commands from backend");
                                
                                // Handle repetition and delay
                                int repetition = data.has("repetition") ? data.get("repetition").getAsInt() : 1;
                                int delay = data.has("delay") ? data.get("delay").getAsInt() : 0;
                                
                                for (int rep = 0; rep < repetition; rep++) {
                                    if (rep > 0 && delay > 0) {
                                        try {
                                            Thread.sleep(delay);
                                        } catch (InterruptedException e) {
                                            Thread.currentThread().interrupt();
                                        }
                                    }
                                    
                                    for (int i = 0; i < commands.size(); i++) {
                                        String command = commands.get(i).getAsString();
                                        executeCommand(command);
                                    }
                                }
                            }
                            
                            // Call custom callback if set
                            if (giftCallback != null) {
                                giftCallback.onGiftReceived(giftName, nickname, amount, data);
                            }
                        }
                    } catch (Exception e) {
                        System.err.println("[SocketIO] Error processing plugin:trigger: " + e.getMessage());
                        e.printStackTrace();
                    }
                }
            });
            
            // Connect to server
            socket.connect();
            
        } catch (URISyntaxException e) {
            System.err.println("[SocketIO] Error connecting to backend: " + e.getMessage());
        }
    }
    
    private void executeCommand(String command) {
        System.out.println("[SocketIO] Executing command: " + command);
        
        // Execute Minecraft command as is from backend
        if (command.trim().startsWith("/")) {
            // Execute as server command (remove leading slash)
            String cmd = command.trim().substring(1);
            Bukkit.getServer().dispatchCommand(Bukkit.getConsoleSender(), cmd);
            System.out.println("[SocketIO] Executed command: /" + cmd);
        } else {
            System.out.println("[SocketIO] Invalid command format (must start with /): " + command);
        }
    }
    
    
    public void disconnect() {
        if (socket != null && socket.connected()) {
            socket.disconnect();
            isConnected = false;
        }
    }
    
    public boolean isConnected() {
        return isConnected;
    }
    
    public void emit(String event, Object data) {
        if (socket != null && socket.connected()) {
            socket.emit(event, data);
        }
    }
}

