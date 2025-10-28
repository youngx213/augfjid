package io.github.jeeanflores.bedrockBox.game;

import io.github.jeeanflores.bedrockBox.BedrockBoxPlugin;
import io.github.jeeanflores.bedrockBox.chat.TikTokChatIntegration;
import io.github.jeeanflores.bedrockBox.utils.ApiClient;
import io.github.jeeanflores.bedrockBox.utils.SocketIOClient;
import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.util.BoundingBox;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class BoxManager {
    
    private final BedrockBoxPlugin plugin;
    private final ApiClient apiClient;
    private final TikTokChatIntegration tikTokChat;
    
    // Game state
    private final Map<UUID, BoxGame> activeGames = new ConcurrentHashMap<>();
    private final Map<String, Material> fillBlockTypes = new HashMap<>();
    private boolean debugLogEnabled = false; // Default: log disabled
    
    public BoxManager(BedrockBoxPlugin plugin) {
        this.plugin = plugin;
        // Get plugin key and API URL from config
        String pluginKey = plugin.getConfig().getString("plugin-key", "453782thien");
        String apiUrl = plugin.getConfig().getString("api.base_url", "http://localhost:3001/api/plugin");
        this.apiClient = new ApiClient(pluginKey, apiUrl);
        this.tikTokChat = new TikTokChatIntegration(plugin);
        
        // Initialize fill block types
        fillBlockTypes.put("slime", Material.SLIME_BLOCK);
        fillBlockTypes.put("gold", Material.GOLD_BLOCK);
        fillBlockTypes.put("diamond", Material.DIAMOND_BLOCK);
        fillBlockTypes.put("default", Material.STONE);
    }
    
    public boolean createBox(Player player, int size, int height) {
        UUID playerId = player.getUniqueId();
        
        // Check if player already has a box
        if (activeGames.containsKey(playerId)) {
            player.sendMessage(ChatColor.RED + "Bạn đã có một hộp bedrock rồi! Dùng /bedrock delete để xóa hộp cũ.");
            return false;
        }
        
        Location center = player.getLocation();
        World world = center.getWorld();
        
        if (world == null) {
            player.sendMessage(ChatColor.RED + "Không thể tạo hộp: World không tồn tại!");
            return false;
        }
        
        // Calculate box bounds
        int halfSize = size / 2;
        Location min = center.clone().add(-halfSize, 0, -halfSize);
        Location max = center.clone().add(halfSize, height, halfSize);
        
        // Create bedrock box walls
        createBedrockWalls(world, min, max);
        
        // Create game instance
        BoxGame game = new BoxGame(playerId, player.getName(), min, max, size, height);
        activeGames.put(playerId, game);
        
        // Box created (no chat messages)
        
        // Send to backend
        apiClient.sendBoxCreated(player.getName(), size, height);
        
        return true;
    }
    
    private void createBedrockWalls(World world, Location min, Location max) {
        Material bedrock = Material.BEDROCK;
        
        // Create only 4 walls around and bottom, NO TOP
        for (int x = min.getBlockX(); x <= max.getBlockX(); x++) {
            for (int y = min.getBlockY(); y <= max.getBlockY(); y++) {
                for (int z = min.getBlockZ(); z <= max.getBlockZ(); z++) {
                    // Only place bedrock on: bottom, left wall, right wall, front wall, back wall
                    // NO TOP (y != max.getBlockY())
                    boolean isWall = (x == min.getBlockX() || x == max.getBlockX() ||  // Left/Right walls
                                    y == min.getBlockY() ||                           // Bottom
                                    z == min.getBlockZ() || z == max.getBlockZ());    // Front/Back walls
                    
                    // Exclude the top layer completely
                    if (y == max.getBlockY()) {
                        continue;
                    }
                    
                    if (isWall) {
                        Block block = world.getBlockAt(x, y, z);
                        if (block.getType() != bedrock) {
                            block.setType(bedrock);
                        }
                    }
                }
            }
        }
    }
    
    public boolean fillBox(Player player, int rows) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock! Dùng /bedrock create để tạo.");
            return false;
        }
        
        // Allow filling even if timer is running (for refilling after damage)
        if (game.isTimerRunning()) {
            // Timer stopped for filling (no chat message)
            game.setTimerRunning(false);
        }
        
        // Fill the box with blocks
        fillBoxWithBlocks(game, rows);
        
        // Check if box is full (but don't start timer for fill command)
        boolean isFull = isBoxFull(game);
        // Box filled (no chat messages)
        
        return true;
    }
    
    private void fillBoxWithBlocks(BoxGame game, int rows) {
        World world = game.getMin().getWorld();
        if (world == null) return;
        
        Material fillMaterial = fillBlockTypes.get(game.getFillBlockType());
        
        // Fill from bottom up
        for (int y = game.getMin().getBlockY() + 1; y < game.getMax().getBlockY(); y++) {
            if (rows > 0 && y - game.getMin().getBlockY() > rows) break;
            
            for (int x = game.getMin().getBlockX() + 1; x < game.getMax().getBlockX(); x++) {
                for (int z = game.getMin().getBlockZ() + 1; z < game.getMax().getBlockZ(); z++) {
                    Block block = world.getBlockAt(x, y, z);
                    if (block.getType() == Material.AIR) {
                        block.setType(fillMaterial);
                        game.addBlockPlaced();
                    }
                }
            }
        }
    }
    
    private boolean isBoxFull(BoxGame game) {
        World world = game.getMin().getWorld();
        if (world == null) return false;
        
        int totalBlocks = 0;
        int filledBlocks = 0;
        int emptyBlocks = 0;
        
        // Check if all interior blocks are filled (excluding the top layer since there's no roof)
        for (int x = game.getMin().getBlockX() + 1; x < game.getMax().getBlockX(); x++) {
            for (int y = game.getMin().getBlockY() + 1; y < game.getMax().getBlockY(); y++) {
                for (int z = game.getMin().getBlockZ() + 1; z < game.getMax().getBlockZ(); z++) {
                    Block block = world.getBlockAt(x, y, z);
                    totalBlocks++;
                    
                    if (block.getType() == Material.AIR) {
                        emptyBlocks++;
                        // Debug: show first few empty blocks (only if logging is enabled)
                        if (debugLogEnabled && emptyBlocks <= 5) {
                            System.out.println("Empty block at: " + x + "," + y + "," + z + " type=" + block.getType());
                        }
                    } else {
                        filledBlocks++;
                    }
                }
            }
        }
        
        // Debug output (only if logging is enabled)
        if (debugLogEnabled) {
            System.out.println("Debug isBoxFull: Total=" + totalBlocks + ", Filled=" + filledBlocks + ", Empty=" + emptyBlocks);
        }
        
        return emptyBlocks == 0;
    }
    
    private void startTimer(BoxGame game) {
        game.setTimerRunning(true);
        game.setTimeLeft(15); // 60 seconds default
        
        Player player = Bukkit.getPlayer(game.getPlayerId());
        if (player != null) {
            // Timer started (no chat message)
            player.sendTitle(ChatColor.GREEN + "TIMER BẮT ĐẦU!", 
                           ChatColor.YELLOW + "60 giây để chiến thắng!", 10, 70, 20);
        }
        
        new BukkitRunnable() {
            @Override
            public void run() {
                if (!game.isTimerRunning() || game.getTimeLeft() <= 0) {
                    this.cancel();
                    endGame(game, game.getTimeLeft() <= 0);
                    return;
                }
                
                // Show countdown
                Player player = Bukkit.getPlayer(game.getPlayerId());
                if (player != null) {
                    if (game.getTimeLeft() <= 15) {
                        // Show countdown from 15 seconds
                        if (game.getTimeLeft() <= 3) {
                            // Slow countdown for last 3 seconds
                            player.sendTitle(ChatColor.RED + "" + game.getTimeLeft(), 
                                           ChatColor.YELLOW + "Giây cuối!", 0, 20, 0);
                            player.playSound(player.getLocation(), Sound.BLOCK_NOTE_BLOCK_PLING, 1.0f, 1.0f);
                        } else {
                            // Show countdown from 15 to 4
                            player.sendTitle(ChatColor.GREEN + "" + game.getTimeLeft(), 
                                           ChatColor.WHITE + "Giây còn lại", 0, 20, 0);
                        }
                    } else {
                        // Countdown (no chat message)
                    }
                }
                
                game.decrementTime();
            }
        }.runTaskTimer(plugin, 0L, 20L); // Run every second
    }
    
    private void endGame(BoxGame game, boolean streamerWon) {
        game.setTimerRunning(false);
        
        Player player = Bukkit.getPlayer(game.getPlayerId());
        if (player != null) {
            if (streamerWon) {
                player.sendTitle(ChatColor.GREEN + "THẮNG!", 
                               ChatColor.YELLOW + "Hộp vẫn nguyên vẹn!", 10, 70, 20);
                player.playSound(player.getLocation(), Sound.UI_TOAST_CHALLENGE_COMPLETE, 1.0f, 1.0f);
                
                // Trigger fireworks
                triggerFireworks(game);
                
                // Clear box after 3 seconds for new game
                new BukkitRunnable() {
                    @Override
                    public void run() {
                        clearBox(game);
                        // Box cleared for new game (no chat messages)
                    }
                }.runTaskLater(plugin, 60L); // 3 seconds delay
            } else {
                player.sendTitle(ChatColor.RED + "THUA!", 
                               ChatColor.YELLOW + "Hộp đã bị phá!", 10, 70, 20);
                player.playSound(player.getLocation(), Sound.ENTITY_GENERIC_EXPLODE, 1.0f, 1.0f);
            }
        }
        
        // Send result to backend
        apiClient.sendGameResult(game.getPlayerName(), streamerWon, game.getBlocksPlaced(), game.getTntExploded());
    }
    
    public void spawnTnt(BoxGame game) {
        if (game == null) {
            return;
        }
        
        World world = game.getMin().getWorld();
        if (world == null) return;
        
        // Spawn TNT under the player's feet
        Player player = Bukkit.getPlayer(game.getPlayerId());
        if (player != null) {
            Location playerLoc = player.getLocation();
            Location tntLoc = playerLoc.clone().add(0, -1, 0); // Under player's feet
            
            // Make sure TNT is inside the box
            if (game.isLocationInside(tntLoc)) {
                TNTPrimed tnt = world.spawn(tntLoc, TNTPrimed.class);
                tnt.setFuseTicks(40); // 2 seconds fuse
                game.addTntSpawned();
                
                // Add explosion effect
                world.spawnParticle(Particle.EXPLOSION_NORMAL, tntLoc, 1);
                
                // TNT spawned under feet (no chat message)
            } else {
                // If under feet is not in box, spawn at player location
                TNTPrimed tnt = world.spawn(playerLoc, TNTPrimed.class);
                tnt.setFuseTicks(40); // 2 seconds fuse
                game.addTntSpawned();
                
                world.spawnParticle(Particle.EXPLOSION_NORMAL, playerLoc, 1);
                // TNT spawned at location (no chat message)
            }
        }
    }
    
    private Location getRandomLocationInside(BoxGame game) {
        World world = game.getMin().getWorld();
        if (world == null) return null;
        
        Random random = new Random();
        int attempts = 0;
        
        while (attempts < 100) {
            int x = game.getMin().getBlockX() + 1 + random.nextInt(game.getSize() - 2);
            int y = game.getMin().getBlockY() + 1 + random.nextInt(game.getHeight() - 2);
            int z = game.getMin().getBlockZ() + 1 + random.nextInt(game.getSize() - 2);
            
            Block block = world.getBlockAt(x, y, z);
            if (block.getType() != Material.AIR) {
                return new Location(world, x + 0.5, y, z + 0.5);
            }
            attempts++;
        }
        
        return null;
    }
    
    public void triggerFireworks(BoxGame game) {
        World world = game.getMin().getWorld();
        if (world == null) return;
        
        Location center = game.getCenter();
        
        // Spawn fireworks
        new BukkitRunnable() {
            int count = 0;
            
            @Override
            public void run() {
                if (count >= 10) {
                    this.cancel();
                    return;
                }
                
                world.spawnParticle(Particle.FIREWORKS_SPARK, center, 50, 2, 2, 2, 0.1);
                world.playSound(center, Sound.ENTITY_FIREWORK_ROCKET_LAUNCH, 1.0f, 1.0f);
                
                count++;
            }
        }.runTaskTimer(plugin, 0L, 10L);
    }
    
    public boolean deleteBox(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return false;
        }
        
        // Clear all blocks in the area
        clearBox(game);
        
        // Remove game
        activeGames.remove(player.getUniqueId());
        
        // Box deleted (no chat message)
        return true;
    }
    
    public boolean clearBox(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return false;
        }
        
        if (game.isTimerRunning()) {
            return false;
        }
        
        clearBox(game);
        // Box cleared (no chat message)
        return true;
    }
    
    private void clearBox(BoxGame game) {
        World world = game.getMin().getWorld();
        if (world == null) return;
        
        // Clear interior blocks only (keep bedrock walls)
        for (int x = game.getMin().getBlockX() + 1; x < game.getMax().getBlockX(); x++) {
            for (int y = game.getMin().getBlockY() + 1; y < game.getMax().getBlockY(); y++) {
                for (int z = game.getMin().getBlockZ() + 1; z < game.getMax().getBlockZ(); z++) {
                    Block block = world.getBlockAt(x, y, z);
                    if (block.getType() != Material.BEDROCK) {
                        block.setType(Material.AIR);
                    }
                }
            }
        }
        
        // Reset game stats
        game.setBlocksPlaced(0);
        game.setTntSpawned(0);
        game.setTntExploded(0);
        game.setTimerRunning(false);
        game.setTimeLeft(0);
    }
    
    public void stopTimer(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        if (!game.isTimerRunning()) {
            player.sendMessage(ChatColor.RED + "Timer không đang chạy!");
            return;
        }
        
        game.setTimerRunning(false);
        // Timer stopped (no chat message)
    }
    
    public void autoWin(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        endGame(game, true);
        // Auto win activated (no chat message)
    }
    
    public void teleportToBox(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        player.teleport(game.getCenter());
        // Teleported to box (no chat message)
    }
    
    public void showBoxInfo(Player player) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        player.sendMessage(ChatColor.GOLD + "=== THÔNG TIN HỘP BEDROCK ===");
        player.sendMessage(ChatColor.YELLOW + "Kích thước: " + game.getSize() + "x" + game.getSize() + "x" + game.getHeight());
        player.sendMessage(ChatColor.YELLOW + "Tình trạng: " + (game.isTimerRunning() ? ChatColor.RED + "Timer đang chạy" : ChatColor.GREEN + "Sẵn sàng"));
        player.sendMessage(ChatColor.YELLOW + "Thời gian còn lại: " + game.getTimeLeft() + "s");
        player.sendMessage(ChatColor.YELLOW + "Block đã đặt: " + game.getBlocksPlaced());
        player.sendMessage(ChatColor.YELLOW + "TNT đã nổ: " + game.getTntExploded());
        player.sendMessage(ChatColor.YELLOW + "Loại block fill: " + game.getFillBlockType());
    }
    
    public void setFillBlockType(Player player, String blockType) {
        BoxGame game = getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        if (!fillBlockTypes.containsKey(blockType.toLowerCase())) {
            player.sendMessage(ChatColor.RED + "Loại block không hợp lệ! Các loại có sẵn: " + 
                             String.join(", ", fillBlockTypes.keySet()));
            return;
        }
        
        game.setFillBlockType(blockType.toLowerCase());
        // Fill block type set (no chat message)
    }
    
    public BoxGame getPlayerGame(Player player) {
        return activeGames.get(player.getUniqueId());
    }
    
    public BoxGame getPlayerGame(UUID playerId) {
        return activeGames.get(playerId);
    }
    
    public Collection<BoxGame> getAllGames() {
        return activeGames.values();
    }
    
    public boolean isBoxFullDebug(BoxGame game) {
        return isBoxFull(game);
    }
    
    public void forceStartTimer(BoxGame game) {
        startTimer(game);
    }
    
    public void startTimerPublic(BoxGame game) {
        startTimer(game);
    }
    
    public void toggleDebugLog() {
        debugLogEnabled = !debugLogEnabled;
    }
    
    public boolean isDebugLogEnabled() {
        return debugLogEnabled;
    }
    
    public void startTikTokChat(String streamerName) {
        tikTokChat.startChatListening(streamerName);
    }
    
    public void stopTikTokChat() {
        tikTokChat.stopChatListening();
    }
    
    public boolean isTikTokChatEnabled() {
        return tikTokChat.isChatEnabled();
    }
    
    public void cleanup() {
        for (BoxGame game : activeGames.values()) {
            game.setTimerRunning(false);
        }
        activeGames.clear();
    }
    
    // Method for backend integration
    public void processGiftFromViewer(String streamerName, String giftType, int amount) {
        // Find game by streamer name
        for (BoxGame game : activeGames.values()) {
            if (game.getPlayerName().equalsIgnoreCase(streamerName) && game.isTimerRunning()) {
                // Spawn TNT based on gift
                for (int i = 0; i < amount; i++) {
                    spawnTnt(game);
                }
                break;
            }
        }
    }
}
