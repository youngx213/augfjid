// check-keys.js - Kiểm tra trạng thái key
import { redis } from "./redis.js";
import { getAllUsedKeys } from "./auth.js";

async function checkKeys() {
  console.log("🔍 Checking key status...");
  
  try {
    // Lấy tất cả key hợp lệ
    const validKeys = await redis.hgetall("valid_keys");
    console.log("\n📋 Valid keys:");
    for (const [key, role] of Object.entries(validKeys)) {
      console.log(`  ${key} -> ${role}`);
    }
    
    // Lấy tất cả key đã sử dụng
    const usedKeys = await getAllUsedKeys();
    console.log("\n📋 Used keys:");
    for (const usedKey of usedKeys) {
      console.log(`  ${usedKey.key} -> ${usedKey.role} (used by ${usedKey.username} at ${new Date(usedKey.usedAt).toLocaleString()})`);
    }
    
    // Thống kê
    const totalValid = Object.keys(validKeys).length;
    const totalUsed = usedKeys.length;
    const available = totalValid - totalUsed;
    
    console.log("\n📊 Statistics:");
    console.log(`  Total valid keys: ${totalValid}`);
    console.log(`  Used keys: ${totalUsed}`);
    console.log(`  Available keys: ${available}`);
    
  } catch (error) {
    console.error("❌ Error checking keys:", error);
  } finally {
    process.exit(0);
  }
}

checkKeys();
