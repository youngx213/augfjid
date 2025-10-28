// create-sample-keys.js - Tạo key mẫu cho testing
import { redis } from "./redis.js";
import { addKey, generateKey } from "./auth.js";

async function createSampleKeys() {
  console.log("🔑 Creating sample keys...");
  
  try {
    // Tạo key admin
    const adminKey = generateKey(20);
    await addKey(adminKey, "admin");
    console.log(`✅ Admin key: ${adminKey}`);
    
    // Tạo key game
    const gameKey1 = generateKey(20);
    await addKey(gameKey1, "game");
    console.log(`✅ Game key 1: ${gameKey1}`);
    
    const gameKey2 = generateKey(20);
    await addKey(gameKey2, "game");
    console.log(`✅ Game key 2: ${gameKey2}`);
    
    // Tạo key bot
    const botKey1 = generateKey(20);
    await addKey(botKey1, "bot");
    console.log(`✅ Bot key 1: ${botKey1}`);
    
    const botKey2 = generateKey(20);
    await addKey(botKey2, "bot");
    console.log(`✅ Bot key 2: ${botKey2}`);
    
    console.log("\n📋 Sample keys created successfully!");
    console.log("You can use these keys to register accounts.");
    console.log("Each key can only be used once.");
    
  } catch (error) {
    console.error("❌ Error creating keys:", error);
  } finally {
    process.exit(0);
  }
}

createSampleKeys();
