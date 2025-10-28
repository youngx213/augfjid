package io.github.jeeanflores.bedrockBox.listeners;

import io.github.jeeanflores.bedrockBox.game.BoxGame;
import io.github.jeeanflores.bedrockBox.game.BoxManager;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.block.Block;
import org.bukkit.entity.Player;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.block.BlockPlaceEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.event.player.PlayerMoveEvent;

import java.util.UUID;

public class BoxListener implements Listener {
    
    private final BoxManager boxManager;
    
    public BoxListener(BoxManager boxManager) {
        this.boxManager = boxManager;
    }
    
    @EventHandler
    public void onBlockPlace(BlockPlaceEvent event) {
        Player player = event.getPlayer();
        Block block = event.getBlock();
        Location location = block.getLocation();
        
        // Check if player is placing block inside their box
        BoxGame game = boxManager.getPlayerGame(player);
        if (game != null && game.isLocationInside(location)) {
            // Award coins for placing blocks inside the box
            game.addBlockPlaced();
            
            // Block placed (no chat notification)
            
            // Check if box is now full and start timer
            if (boxManager.isBoxFullDebug(game) && !game.isTimerRunning()) {
                boxManager.startTimerPublic(game);
                // Box full, timer started (no chat message)
                player.sendTitle(ChatColor.GREEN + "BOX ĐẦY!", 
                               ChatColor.YELLOW + "Timer bắt đầu!", 10, 70, 20);
            }
        }
    }
    
    @EventHandler
    public void onBlockBreak(BlockBreakEvent event) {
        Player player = event.getPlayer();
        Block block = event.getBlock();
        Location location = block.getLocation();
        
        // Check if player is breaking block inside their box
        BoxGame game = boxManager.getPlayerGame(player);
        if (game != null && game.isLocationInside(location)) {
            // Prevent breaking bedrock walls
            if (block.getType() == Material.BEDROCK) {
                event.setCancelled(true);
                // Cannot break bedrock (no chat message)
                return;
            }
            
            // If timer is running and any block is broken, stop timer
            if (game.isTimerRunning()) {
                game.setTimerRunning(false);
                // Block broken, timer stopped (no chat message)
                player.sendTitle(ChatColor.YELLOW + "TIMER DỪNG!", 
                               ChatColor.WHITE + "Có thể lấp lại để tiếp tục!", 10, 70, 20);
            }
        }
    }
    
    @EventHandler
    public void onEntityExplode(EntityExplodeEvent event) {
        if (!(event.getEntity() instanceof TNTPrimed)) {
            return;
        }
        
        TNTPrimed tnt = (TNTPrimed) event.getEntity();
        Location tntLocation = tnt.getLocation();
        
        // Find which game this TNT belongs to
        for (BoxGame game : boxManager.getAllGames()) {
            if (game.isLocationInside(tntLocation)) {
                // TNT exploded inside a box
                game.addTntExploded();
                
                // If timer is running and TNT exploded, stop timer immediately
                if (game.isTimerRunning()) {
                    game.setTimerRunning(false);
                    
                    Player streamer = Bukkit.getPlayer(game.getPlayerId());
                    if (streamer != null) {
                        // TNT exploded, timer stopped (no chat message)
                        streamer.sendTitle(ChatColor.YELLOW + "TNT NỔ!", 
                                         ChatColor.WHITE + "Có thể lấp lại để tiếp tục!", 10, 70, 20);
                    }
                }
                break;
            }
        }
    }
    
    @EventHandler
    public void onPlayerMove(PlayerMoveEvent event) {
        Player player = event.getPlayer();
        Location to = event.getTo();
        
        if (to == null) return;
        
        // Check if player is moving inside their box during timer
        BoxGame game = boxManager.getPlayerGame(player);
        if (game != null && game.isTimerRunning() && game.isLocationInside(to)) {
            // Player is inside their box during active game
            // Could add effects or restrictions here
        }
    }
    
    private int countRemainingBlocks(BoxGame game) {
        int count = 0;
        Location min = game.getMin();
        Location max = game.getMax();
        
        for (int x = min.getBlockX() + 1; x < max.getBlockX(); x++) {
            for (int y = min.getBlockY() + 1; y < max.getBlockY(); y++) {
                for (int z = min.getBlockZ() + 1; z < max.getBlockZ(); z++) {
                    Block block = min.getWorld().getBlockAt(x, y, z);
                    if (block.getType() != Material.AIR && block.getType() != Material.BEDROCK) {
                        count++;
                    }
                }
            }
        }
        
        return count;
    }
}
