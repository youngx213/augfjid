package io.github.jeeanflores.bedrockBox.commands;

import io.github.jeeanflores.bedrockBox.game.BoxGame;
import io.github.jeeanflores.bedrockBox.game.BoxManager;
import org.bukkit.ChatColor;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public class BedrockCommand implements CommandExecutor {
    
    private final BoxManager boxManager;
    
    public BedrockCommand(BoxManager boxManager) {
        this.boxManager = boxManager;
    }
    
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage(ChatColor.RED + "Chỉ có người chơi mới có thể sử dụng lệnh này!");
            return true;
        }
        
        Player player = (Player) sender;
        
        if (args.length == 0) {
            showHelp(player);
            return true;
        }
        
        String subCommand = args[0].toLowerCase();
        
        switch (subCommand) {
            case "create":
                handleCreate(player, args);
                break;
                
            case "fill":
                handleFill(player, args);
                break;
                
            case "delete":
                handleDelete(player);
                break;
                
            case "clear":
                handleClear(player);
                break;
                
            case "stop":
                handleStop(player);
                break;
                
            case "autowin":
                handleAutoWin(player);
                break;
                
            case "tnt":
                handleTnt(player);
                break;
                
            case "fireworks":
                handleFireworks(player);
                break;
                
            case "tp":
                handleTp(player);
                break;
                
            case "info":
                handleInfo(player);
                break;
                
            case "setblock":
                handleSetBlock(player, args);
                break;
                
            case "debug":
                handleDebug(player);
                break;
                
            case "log":
                handleToggleLog(player);
                break;
                
            case "tiktok":
                handleTikTokChat(player, args);
                break;
                
            default:
                showHelp(player);
                break;
        }
        
        return true;
    }
    
    private void handleCreate(Player player, String[] args) {
        int size = 9; // Default size
        int height = 9; // Default height
        
        if (args.length >= 2) {
            try {
                size = Integer.parseInt(args[1]);
                if (size < 3 || size > 21) {
                    player.sendMessage(ChatColor.RED + "Kích thước phải từ 3 đến 21!");
                    return;
                }
            } catch (NumberFormatException e) {
                player.sendMessage(ChatColor.RED + "Kích thước không hợp lệ!");
                return;
            }
        }
        
        if (args.length >= 3) {
            try {
                height = Integer.parseInt(args[2]);
                if (height < 3 || height > 21) {
                    player.sendMessage(ChatColor.RED + "Chiều cao phải từ 3 đến 21!");
                    return;
                }
            } catch (NumberFormatException e) {
                player.sendMessage(ChatColor.RED + "Chiều cao không hợp lệ!");
                return;
            }
        }
        
        boxManager.createBox(player, size, height);
    }
    
    private void handleFill(Player player, String[] args) {
        int rows = 1; // Default fill 1 row
        
        if (args.length >= 2) {
            try {
                rows = Integer.parseInt(args[1]);
                if (rows < 1 || rows > 10) {
                    player.sendMessage(ChatColor.RED + "Số hàng phải từ 1 đến 10!");
                    return;
                }
            } catch (NumberFormatException e) {
                player.sendMessage(ChatColor.RED + "Số hàng không hợp lệ!");
                return;
            }
        }
        
        boxManager.fillBox(player, rows);
    }
    
    private void handleDelete(Player player) {
        boxManager.deleteBox(player);
    }
    
    private void handleClear(Player player) {
        boxManager.clearBox(player);
    }
    
    private void handleStop(Player player) {
        boxManager.stopTimer(player);
    }
    
    private void handleAutoWin(Player player) {
        boxManager.autoWin(player);
    }
    
    private void handleTnt(Player player) {
        BoxGame game = boxManager.getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        boxManager.spawnTnt(game);
        // TNT spawned (no chat message)
    }
    
    private void handleFireworks(Player player) {
        BoxGame game = boxManager.getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        boxManager.triggerFireworks(game);
        // Fireworks triggered (no chat message)
    }
    
    private void handleTp(Player player) {
        boxManager.teleportToBox(player);
    }
    
    private void handleInfo(Player player) {
        boxManager.showBoxInfo(player);
    }
    
    private void handleSetBlock(Player player, String[] args) {
        if (args.length < 2) {
            player.sendMessage(ChatColor.RED + "Usage: /bedrock setblock <type>");
            player.sendMessage(ChatColor.YELLOW + "Các loại có sẵn: slime, gold, diamond, default");
            return;
        }
        
        String blockType = args[1];
        boxManager.setFillBlockType(player, blockType);
    }
    
    private void handleDebug(Player player) {
        BoxGame game = boxManager.getPlayerGame(player);
        if (game == null) {
            player.sendMessage(ChatColor.RED + "Bạn chưa có hộp bedrock!");
            return;
        }
        
        // Debug info (no chat messages)
    }
    
    private void handleToggleLog(Player player) {
        boxManager.toggleDebugLog();
        boolean isEnabled = boxManager.isDebugLogEnabled();
        
        if (isEnabled) {
            // Debug log enabled (no chat message)
        } else {
            // Debug log disabled (no chat message)
        }
    }
    
    private void handleTikTokChat(Player player, String[] args) {
        if (args.length < 2) {
            if (boxManager.isTikTokChatEnabled()) {
                boxManager.stopTikTokChat();
                // TikTok chat stopped (no chat message)
            } else {
                player.sendMessage(ChatColor.YELLOW + "Usage: /bedrock tiktok <start|stop> [streamer_name]");
                player.sendMessage(ChatColor.YELLOW + "Hiện tại TikTok chat: " + 
                    (boxManager.isTikTokChatEnabled() ? ChatColor.GREEN + "BẬT" : ChatColor.RED + "TẮT"));
            }
            return;
        }
        
        String action = args[1].toLowerCase();
        
        switch (action) {
            case "start":
                if (args.length >= 3) {
                    String streamerName = args[2];
                    boxManager.startTikTokChat(streamerName);
                    // TikTok chat started (no chat messages)
                } else {
                    player.sendMessage(ChatColor.RED + "Usage: /bedrock tiktok start <streamer_name>");
                }
                break;
                
            case "stop":
                boxManager.stopTikTokChat();
                // TikTok chat stopped (no chat message)
                break;
                
            case "status":
                boolean isEnabled = boxManager.isTikTokChatEnabled();
                // TikTok chat status (no chat message)
                break;
                
            default:
                player.sendMessage(ChatColor.YELLOW + "Usage: /bedrock tiktok <start|stop|status> [streamer_name]");
                break;
        }
    }
    
    private void showHelp(Player player) {
        player.sendMessage(ChatColor.GOLD + "=== BEDROCK BOX COMMANDS ===");
        player.sendMessage(ChatColor.YELLOW + "/bedrock create [size] [height] - Tạo hộp bedrock");
        player.sendMessage(ChatColor.YELLOW + "/bedrock fill [rows] - Lấp hộp với blocks");
        player.sendMessage(ChatColor.YELLOW + "/bedrock delete - Xóa hộp hiện tại");
        player.sendMessage(ChatColor.YELLOW + "/bedrock clear - Dọn block bên trong hộp");
        player.sendMessage(ChatColor.YELLOW + "/bedrock stop - Dừng timer");
        player.sendMessage(ChatColor.YELLOW + "/bedrock autowin - Chế độ thắng tự động");
        player.sendMessage(ChatColor.YELLOW + "/bedrock tnt - Spawn TNT test");
        player.sendMessage(ChatColor.YELLOW + "/bedrock fireworks - Kích hoạt pháo hoa");
        player.sendMessage(ChatColor.YELLOW + "/bedrock tp - Dịch chuyển đến hộp");
        player.sendMessage(ChatColor.YELLOW + "/bedrock info - Thông tin hộp");
        player.sendMessage(ChatColor.YELLOW + "/bedrock setblock <type> - Đặt loại block fill");
        player.sendMessage(ChatColor.YELLOW + "/bedrock debug - Debug thông tin hộp");
        player.sendMessage(ChatColor.YELLOW + "/bedrock log - Bật/tắt debug log");
        player.sendMessage(ChatColor.YELLOW + "/bedrock tiktok <start|stop|status> [streamer] - TikTok chat integration");
    }
}
