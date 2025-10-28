# ✅ Minecraft Integration - HOÀN TẤT

## Tóm tắt cuối cùng

### ✅ Đã hoàn thành

#### 1. Backend Integration
**File: `backend/listener.js`**
- ✅ Import `getPresets` từ `gameService`
- ✅ Function `triggerPlugin()` - tìm preset và emit event
- ✅ Gọi `triggerPlugin()` khi nhận gift từ TikTok (line 124-128)
- ✅ Emit `plugin:trigger` với đầy đủ commands từ preset

**Flow trong listener.js:**
```javascript
tiktok.on("gift", async (data) => {
  // ... existing analytics code ...
  
  // NEW: Trigger plugin
  await triggerPlugin(username, {
    giftName: data.giftName,
    username: data.uniqueId,
    repeatCount: data.repeatCount || 1
  });
});

async function triggerPlugin(username, giftData) {
  const presets = await getPresets(username);
  const preset = presets.find(p => p.giftName === giftData.giftName && p.enabled !== false);
  
  if (preset && preset.commands) {
    ioRef.to(`plugin:${username}`).emit("plugin:trigger", {
      giftName, nickname, amount,
      commands: preset.commands,
      repetition: preset.repetition || 1,
      delay: preset.delay || 0
    });
  }
}
```

#### 2. Plugin Minecraft
**File: `SocketIOClient.java`**
- ✅ Listen event `plugin:trigger`
- ✅ Parse commands từ JSON
- ✅ Execute commands: `/bedrock tnt`, `/give @p diamond`, etc.
- ✅ Support repetition và delay

**File: `BoxManager.java`**
- ✅ Khởi tạo SocketIOClient
- ✅ Không còn hardcode gift types
- ✅ Commands tự động execute từ backend

#### 3. Frontend Dashboard
**File: `frontend/src/MinecraftDashboard.jsx`**
- ✅ UI tạo presets với commands field
- ✅ Gửi presets về backend qua `/api/game/presets`
- ✅ Format: `commands: ["/bedrock tnt", "/bedrock create 5 5"]`

## Flow hoạt động HOÀN CHỈNH

```
┌─────────────────────────────────────────┐
│  User trên TikTok Live                   │
│  Gửi gift "Rose"                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  backend/listener.js                    │
│  tiktok.on("gift", ...)                 │
│  → triggerPlugin(username, data)       │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  listener.js: triggerPlugin()           │
│  - await getPresets(username)           │
│  - Tìm preset: giftName="Rose"         │
│  - Lấy commands: ["/bedrock tnt"]      │
│  - ioRef.to(`plugin:${username}`)      │
│    .emit("plugin:trigger", {...})      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Socket.IO Event                        │
│  plugin:${username}                     │
│  event: "plugin:trigger"                │
│  data: {                                │
│    commands: ["/bedrock tnt"],          │
│    giftName: "Rose",                    │
│    nickname: "viewer",                  │
│    amount: 1                            │
│  }                                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Plugin: SocketIOClient.java             │
│  socket.on("plugin:trigger", ...)       │
│  - Parse JSON                            │
│  - Lấy commands array                   │
│  - Execute mỗi command                  │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Plugin: executeCommand()               │
│  Bukkit.getServer()                     │
│    .dispatchCommand(console, "/bedrock tnt")│
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│  Minecraft Game                         │
│  → TNT spawned! 🎯                      │
└─────────────────────────────────────────┘
```

## Files thay đổi

### Backend (2 files):
1. ✅ `backend/listener.js` - Thêm import và triggerPlugin()
2. ✅ `backend/server.js` - Socket.IO plugin authentication

### Plugin (3 files):
1. ✅ `bedrockbox-master/pom.xml` - Socket.IO dependency
2. ✅ `bedrockbox-master/config.yml` - Plugin config
3. ✅ `SocketIOClient.java` - Listen và execute commands
4. ✅ `BoxManager.java` - SocketIOClient integration

### Frontend (không sửa):
- ✅ `MinecraftDashboard.jsx` - Đã có UI sẵn

## Testing Flow

### 1. Setup
```bash
# Backend
cd backend
npm start

# Plugin
cd bedrockbox-master
mvn clean package
# Copy .jar vào plugins/ và restart server
```

### 2. Tạo Preset
1. Login dashboard: `http://localhost:5173/minecraft`
2. Tạo preset:
   - Gift: "Rose"
   - Commands: `/bedrock tnt`
   - Coins: 1
3. Start TikTok listener

### 3. Test
1. User gửi "Rose" trên TikTok Live
2. Check backend logs: `🔌 Sent plugin trigger for Rose`
3. Check plugin logs: `[SocketIO] Received gift trigger: Rose`
4. Check Minecraft: TNT spawn!

## Commands Format

Plugin support BẤT KỲ Minecraft command:

### Single command:
```
/bedrock tnt
```

### Multiple commands (separate by semicolon):
```
/bedrock create 5 5;/bedrock fill 3
```

### With parameters:
```
/give @p diamond 10
/tp @p 0 100 0
/msg @p Hello World
```

### Custom commands:
```
/bedrock autowin
/bedrock fireworks
/bedrock delete
```

## Preset Structure

Preset được lưu trong Redis với format:
```json
{
  "id": "rose",
  "giftName": "Rose",
  "coinsPerUnit": 1,
  "commands": ["/bedrock tnt"],
  "soundFile": "rose.mp3",
  "imageUrl": "https://...",
  "enabled": true,
  "repetition": 1,
  "delay": 0,
  "interval": 100
}
```

## Checklist

### Backend:
- [x] `listener.js` nhận gift từ TikTok
- [x] `listener.js` tìm preset trong database
- [x] `listener.js` emit `plugin:trigger` với commands
- [x] `server.js` authenticate plugin qua Socket.IO
- [x] `server.js` join room `plugin:{username}`

### Plugin:
- [x] SocketIOClient connect to backend
- [x] SocketIOClient listen event `plugin:trigger`
- [x] SocketIOClient execute commands từ backend
- [x] Không còn hardcode gift types
- [x] Support repetition và delay

### Frontend:
- [x] UI tạo presets
- [x] Gửi presets về backend
- [x] Commands format đúng

## Kết quả

**HOÀN TÁT 100%** - Minecraft plugin giờ nhận commands từ dashboard settings!

Flow:
```
TikTok Gift → Backend → Tìm Preset → Emit Event → Plugin Execute Command
```

Tất cả đều khớp với nhau! 🎉

