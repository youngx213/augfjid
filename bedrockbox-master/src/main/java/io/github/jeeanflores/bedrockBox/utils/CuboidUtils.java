package io.github.jeeanflores.bedrockBox.utils;

import io.github.jeeanflores.bedrockBox.TntChallengeConstants;
import io.github.jeeanflores.bedrockBox.BedrockBoxPlugin;
import org.bukkit.*;
import org.bukkit.block.Block;
import org.bukkit.entity.EntityType;
import org.bukkit.entity.Firework;
import org.bukkit.entity.TNTPrimed;
import org.bukkit.inventory.meta.FireworkMeta;
import org.bukkit.scheduler.BukkitRunnable;
import org.bukkit.util.Vector;

import java.util.Random;

public class CuboidUtils {

    private static final Random random = new Random();

    public static void setBlockByLayer(WorldCuboid cuboid, int y, Block block) {
        if (y >= cuboid.getMinY() && y <= cuboid.getMaxY()) {
            block.setType(getBlockTypeByLayer(y - cuboid.getMinY()));
        }
    }

    private static Material getBlockTypeByLayer(int layerIndex) {
        Material[] blockTypes = {
            Material.STONE,
            Material.COBBLESTONE,
            Material.SANDSTONE,
            Material.BRICKS,
            Material.NETHER_BRICKS,
            Material.END_STONE_BRICKS,
            Material.QUARTZ_BLOCK,
            Material.PRISMARINE,
            Material.DARK_PRISMARINE,
            Material.PURPUR_BLOCK
        };
        
        return blockTypes[layerIndex % blockTypes.length];
    }

    public static void sendTnt(Location location, int power, double delay) {
        new BukkitRunnable() {
            @Override
            public void run() {
                TNTPrimed tnt = (TNTPrimed) location.getWorld().spawnEntity(location, EntityType.PRIMED_TNT);
                tnt.setFuseTicks((int) (20 * delay));
            }
        }.runTaskLater(BedrockBoxPlugin.getInstance(), (long) (delay * 20));
    }

    public static void rainTnt(Location center, int amount, boolean isZeus) {
        World world = center.getWorld();
        int radius = isZeus ? 15 : 10;
        
        for (int i = 0; i < amount; i++) {
            new BukkitRunnable() {
                @Override
                public void run() {
                    double x = center.getX() + (random.nextDouble() - 0.5) * radius * 2;
                    double z = center.getZ() + (random.nextDouble() - 0.5) * radius * 2;
                    double y = center.getY() + 20 + random.nextDouble() * 10;
                    
                    Location tntLocation = new Location(world, x, y, z);
                    TNTPrimed tnt = (TNTPrimed) world.spawnEntity(tntLocation, EntityType.PRIMED_TNT);
                    
                    if (isZeus) {
                        world.strikeLightning(tntLocation);
                    }
                }
            }.runTaskLater(BedrockBoxPlugin.getInstance(), i * 2L);
        }
    }

    public static void fireworksAtBase(WorldCuboid cuboid) {
        Location center = cuboid.getCenter();
        World world = center.getWorld();
        
        for (int i = 0; i < 5; i++) {
            new BukkitRunnable() {
                @Override
                public void run() {
                    double x = center.getX() + (random.nextDouble() - 0.5) * 10;
                    double z = center.getZ() + (random.nextDouble() - 0.5) * 10;
                    double y = center.getY();
                    
                    Location fireworkLocation = new Location(world, x, y, z);
                    Firework firework = (Firework) world.spawnEntity(fireworkLocation, EntityType.FIREWORK);
                    
                    FireworkMeta meta = firework.getFireworkMeta();
                    meta.addEffect(FireworkEffect.builder()
                        .with(FireworkEffect.Type.BURST)
                        .withColor(Color.RED, Color.YELLOW, Color.ORANGE)
                        .withFade(Color.WHITE)
                        .build());
                    meta.setPower(2);
                    
                    firework.setFireworkMeta(meta);
                }
            }.runTaskLater(BedrockBoxPlugin.getInstance(), i * 10L);
        }
    }

    public static void detonateFirework(Location location, int radius) {
        World world = location.getWorld();
        
        for (int i = 0; i < 3; i++) {
            new BukkitRunnable() {
                @Override
                public void run() {
                    double x = location.getX() + (random.nextDouble() - 0.5) * radius;
                    double z = location.getZ() + (random.nextDouble() - 0.5) * radius;
                    double y = location.getY() + 2;
                    
                    Location fireworkLocation = new Location(world, x, y, z);
                    Firework firework = (Firework) world.spawnEntity(fireworkLocation, EntityType.FIREWORK);
                    
                    FireworkMeta meta = firework.getFireworkMeta();
                    meta.addEffect(FireworkEffect.builder()
                        .with(FireworkEffect.Type.STAR)
                        .withColor(Color.RED, Color.BLUE, Color.GREEN)
                        .withFade(Color.YELLOW)
                        .build());
                    meta.setPower(1);
                    
                    firework.setFireworkMeta(meta);
                }
            }.runTaskLater(BedrockBoxPlugin.getInstance(), i * 5L);
        }
    }
}