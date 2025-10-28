package io.github.jeeanflores.bedrockBox.utils;

import org.bukkit.Bukkit;
import org.bukkit.Location;
import org.bukkit.Material;
import org.bukkit.World;
import org.bukkit.block.Block;
import org.bukkit.util.Vector;

public class WorldCuboid {
    private final String worldName;
    private final Vector min;
    private final Vector max;
    private final World world;

    public WorldCuboid(String worldName, Vector min, Vector max) {
        this.worldName = worldName;
        this.min = Vector.getMinimum(min, max);
        this.max = Vector.getMaximum(min, max);
        this.world = Bukkit.getWorld(worldName);
    }

    public boolean contains(Location location, boolean includeEdges) {
        if (location.getWorld() != world) return false;
        
        double x = location.getX();
        double y = location.getY();
        double z = location.getZ();
        
        if (includeEdges) {
            return x >= min.getX() && x <= max.getX() &&
                   y >= min.getY() && y <= max.getY() &&
                   z >= min.getZ() && z <= max.getZ();
        } else {
            return x > min.getX() && x < max.getX() &&
                   y > min.getY() && y < max.getY() &&
                   z > min.getZ() && z < max.getZ();
        }
    }

    public void destroy(boolean includeAir) {
        for (int x = getMinX(); x <= getMaxX(); x++) {
            for (int y = getMinY(); y <= getMaxY(); y++) {
                for (int z = getMinZ(); z <= getMaxZ(); z++) {
                    Block block = world.getBlockAt(x, y, z);
                    if (includeAir || block.getType() != Material.AIR) {
                        block.setType(Material.AIR);
                    }
                }
            }
        }
    }

    public Location getCenter() {
        double x = (min.getX() + max.getX()) / 2;
        double y = (min.getY() + max.getY()) / 2;
        double z = (min.getZ() + max.getZ()) / 2;
        return new Location(world, x, y, z);
    }

    public String getWorldName() {
        return worldName;
    }

    public Vector getMin() {
        return min.clone();
    }

    public Vector getMax() {
        return max.clone();
    }

    public World getBukkitWorld() {
        return world;
    }

    public int getMinX() {
        return min.getBlockX();
    }

    public int getMinY() {
        return min.getBlockY();
    }

    public int getMinZ() {
        return min.getBlockZ();
    }

    public int getMaxX() {
        return max.getBlockX();
    }

    public int getMaxY() {
        return max.getBlockY();
    }

    public int getMaxZ() {
        return max.getBlockZ();
    }
}