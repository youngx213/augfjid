package io.github.jeeanflores.bedrockBox;

import io.github.jeeanflores.bedrockBox.commands.BedrockCommand;
import io.github.jeeanflores.bedrockBox.commands.completer.BedrockCommandCompleter;
import io.github.jeeanflores.bedrockBox.game.BoxManager;
import io.github.jeeanflores.bedrockBox.listeners.BoxListener;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.PluginCommand;
import org.bukkit.plugin.java.JavaPlugin;

public class BedrockBoxPlugin extends JavaPlugin {
    
    private static BedrockBoxPlugin instance;
    private BoxManager boxManager;
    
    @Override
    public void onEnable() {
        instance = this;
        
        // Create data folder and save default config
        getDataFolder().mkdirs();
        saveDefaultConfig();
        
        // Initialize managers
        boxManager = new BoxManager(this);
        
        // Register commands
        PluginCommand bedrockCommand = getCommand("bedrock");
        if (bedrockCommand != null) {
            bedrockCommand.setExecutor(new BedrockCommand(boxManager));
            bedrockCommand.setTabCompleter(new BedrockCommandCompleter());
            getLogger().info("Bedrock command registered successfully");
        } else {
            getLogger().severe("Failed to register bedrock command!");
        }
        
        // Register listeners
        Bukkit.getPluginManager().registerEvents(new BoxListener(boxManager), this);
        
        getLogger().info("BedrockBox plugin enabled! Version: " + getDescription().getVersion());
        getLogger().info("Data folder: " + getDataFolder().getAbsolutePath());
    }
    
    @Override
    public void onDisable() {
        if (boxManager != null) {
            boxManager.cleanup();
        }
        getLogger().info("BedrockBox plugin disabled!");
    }
    
    public static BedrockBoxPlugin getInstance() {
        return instance;
    }
    
    public BoxManager getBoxManager() {
        return boxManager;
    }
}
