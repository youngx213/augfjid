package io.github.jeeanflores.bedrockBox.game;

import org.bukkit.Location;

import java.util.UUID;

public class BoxGame {
    
    private final UUID playerId;
    private final String playerName;
    private final Location min;
    private final Location max;
    private final int size;
    private final int height;
    
    private boolean timerRunning;
    private int timeLeft;
    private int blocksPlaced;
    private int tntSpawned;
    private int tntExploded;
    private String fillBlockType;
    
    public BoxGame(UUID playerId, String playerName, Location min, Location max, int size, int height) {
        this.playerId = playerId;
        this.playerName = playerName;
        this.min = min;
        this.max = max;
        this.size = size;
        this.height = height;
        this.timerRunning = false;
        this.timeLeft = 0;
        this.blocksPlaced = 0;
        this.tntSpawned = 0;
        this.tntExploded = 0;
        this.fillBlockType = "slime";
    }
    
    // Getters
    public UUID getPlayerId() {
        return playerId;
    }
    
    public String getPlayerName() {
        return playerName;
    }
    
    public Location getMin() {
        return min;
    }
    
    public Location getMax() {
        return max;
    }
    
    public int getSize() {
        return size;
    }
    
    public int getHeight() {
        return height;
    }
    
    public boolean isTimerRunning() {
        return timerRunning;
    }
    
    public int getTimeLeft() {
        return timeLeft;
    }
    
    public int getBlocksPlaced() {
        return blocksPlaced;
    }
    
    public int getTntSpawned() {
        return tntSpawned;
    }
    
    public int getTntExploded() {
        return tntExploded;
    }
    
    public String getFillBlockType() {
        return fillBlockType;
    }
    
    // Setters
    public void setTimerRunning(boolean timerRunning) {
        this.timerRunning = timerRunning;
    }
    
    public void setTimeLeft(int timeLeft) {
        this.timeLeft = timeLeft;
    }
    
    public void setFillBlockType(String fillBlockType) {
        this.fillBlockType = fillBlockType;
    }
    
    public void setBlocksPlaced(int blocksPlaced) {
        this.blocksPlaced = blocksPlaced;
    }
    
    public void setTntSpawned(int tntSpawned) {
        this.tntSpawned = tntSpawned;
    }
    
    public void setTntExploded(int tntExploded) {
        this.tntExploded = tntExploded;
    }
    
    // Utility methods
    public void addBlockPlaced() {
        this.blocksPlaced++;
    }
    
    public void addTntSpawned() {
        this.tntSpawned++;
    }
    
    public void addTntExploded() {
        this.tntExploded++;
    }
    
    public void decrementTime() {
        if (this.timeLeft > 0) {
            this.timeLeft--;
        }
    }
    
    public Location getCenter() {
        return new Location(
            min.getWorld(),
            (min.getX() + max.getX()) / 2,
            (min.getY() + max.getY()) / 2,
            (min.getZ() + max.getZ()) / 2
        );
    }
    
    public boolean isLocationInside(Location location) {
        if (location.getWorld() != min.getWorld()) {
            return false;
        }
        
        return location.getX() >= min.getX() && location.getX() <= max.getX() &&
               location.getY() >= min.getY() && location.getY() <= max.getY() &&
               location.getZ() >= min.getZ() && location.getZ() <= max.getZ();
    }
}
