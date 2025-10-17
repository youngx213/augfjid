# ToolTikTok - Role-Based System

Hệ thống đã được cập nhật để hỗ trợ đầy đủ **role bot và game** với MinecraftDashboard và API bridge cho plugin Minecraft.

## 🎯 Tính năng chính

### 1. **Phân quyền Role**
- **Role `bot`**: Truy cập Dashboard TikTok (quản lý accounts, logs, queue)
- **Role `game`**: Truy cập MinecraftDashboard (quản lý presets, overlay URLs)
- **Role `admin`**: Truy cập AdminDashboard (quản lý users, keys)

### 2. **MinecraftDashboard (Role Game)**
- Giao diện giống **BedrockBox của StreamToEarn**
- Quản lý preset (Bedrock Box) với các trường:
  - Gift name (tên quà tặng)
  - Block (loại block, ví dụ: "1x TNT")
  - Sound file (file âm thanh)
  - Amount (số lượng)
- Quản lý Overlay URLs:
  - Goal Likes Bar
  - Smart Bar  
  - Top Gifters
- Stats realtime (coins, viewers, winGoal, timer)
- Copy URLs overlay
- Test sound functionality

### 3. **Backend API Routes**

#### Game Routes (`/api/game/*`) - Chỉ role=game
- `GET /api/game/presets` - Lấy danh sách presets
- `POST /api/game/presets` - Lưu presets
- `POST /api/game/presets/:id` - Cập nhật preset
- `DELETE /api/game/presets/:id` - Xóa preset
- `GET /api/game/overlay` - Lấy overlay config
- `POST /api/game/overlay/update` - Cập nhật overlay URLs

#### Plugin Routes (`/api/plugin/*`) - Cho Minecraft plugin
- `GET /api/plugin/config/:username` - Lấy config cho plugin
- `POST /api/plugin/trigger` - Trigger event từ TikTok đến Minecraft
- `POST /api/plugin/stats` - Plugin cập nhật stats

#### Bot Routes (`/api/accounts/*`) - Chỉ role=bot
- Tất cả routes quản lý TikTok accounts

### 4. **Socket.IO Events**
- `join:game` - Frontend join room `game:username`
- `join:plugin` - Plugin join room `plugin:username`
- `plugin:trigger` - Event trigger từ TikTok đến Minecraft
- `stats:update` - Cập nhật stats realtime

### 5. **Dữ liệu mẫu cho User Role=Game**
Khi user mới role=game được tạo, hệ thống tự động thêm:

```json
{
  "presets": [
    {"gift": "Follow", "block": "1x TNT", "sound": "sub.mp3", "amount": 1},
    {"gift": "Rose", "block": "1x TNT", "sound": "bue.mp3", "amount": 1},
    {"gift": "Perfume", "block": "20x TNT", "sound": "chipi.mp3", "amount": 20}
  ],
  "overlay": {
    "goalLikes": "https://app.streamtoearn.io/overlay/{username}/goal-likes",
    "smartBar": "https://app.streamtoearn.io/overlay/{username}/smart-bar",
    "topGifters": "https://app.streamtoearn.io/overlay/{username}/top-gifters"
  },
  "stats": {
    "coins": 0,
    "viewers": 0,
    "winGoal": 100,
    "timer": 0
  }
}
```

## 🚀 Cách sử dụng

### 1. **Đăng ký User**
```bash
POST /api/auth/register
{
  "username": "player1",
  "password": "password123",
  "role": "game"  // hoặc "bot", "admin"
}
```

### 2. **Minecraft Plugin Integration**

#### Kết nối Socket.IO:
```javascript
const socket = io('http://localhost:3001');
socket.emit('join:plugin', { username: 'player1' });

socket.on('plugin:trigger', (data) => {
  // data = { gift: "Rose", amount: 5 }
  // Xử lý hiệu ứng trong Minecraft
});
```

#### Lấy config:
```bash
GET /api/plugin/config/player1
```

#### Cập nhật stats:
```bash
POST /api/plugin/stats
{
  "username": "player1",
  "coins": 150,
  "viewers": 25,
  "winGoal": 200,
  "timer": 300
}
```

### 3. **Trigger Event từ TikTok**
```bash
POST /api/plugin/trigger
{
  "username": "player1",
  "gift": "Rose",
  "amount": 5
}
```

## 📁 Cấu trúc dữ liệu Redis

```
users:{username} - Thông tin user
game:{username}:presets - Presets của user
game:{username}:overlay - Overlay URLs của user  
game:{username}:stats - Stats của user
valid_keys - Keys hợp lệ với role
```

## 🔧 Development

### Backend
```bash
cd augfjid/backend
npm install
npm start
```

### Frontend  
```bash
cd augfjid/frontend
npm install
npm run dev
```

## 🎮 Minecraft Plugin Example

```javascript
// Plugin kết nối và nhận events
const socket = io('http://localhost:3001');

socket.emit('join:plugin', { username: 'player1' });

socket.on('plugin:trigger', (data) => {
  const { gift, amount } = data;
  
  // Tìm preset tương ứng
  const preset = presets.find(p => p.gift === gift);
  if (preset) {
    // Spawn blocks trong Minecraft
    spawnBlocks(preset.block, amount);
    // Phát âm thanh
    playSound(preset.sound);
  }
});

// Cập nhật stats định kỳ
setInterval(() => {
  fetch('/api/plugin/stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'player1',
      coins: getCurrentCoins(),
      viewers: getCurrentViewers(),
      winGoal: getWinGoal(),
      timer: getTimer()
    })
  });
}, 5000);
```

## ✅ Kết quả

- ✅ Role `bot` → Dashboard TikTok (giữ nguyên)
- ✅ Role `game` → MinecraftDashboard riêng với giao diện BedrockBox
- ✅ Plugin Minecraft có thể kết nối và nhận events
- ✅ Backend emit Socket.IO events khi có trigger quà
- ✅ Mỗi user có data riêng biệt, không gộp
- ✅ API bridge hoàn chỉnh cho plugin communication
- ✅ Phân quyền rõ ràng theo role
- ✅ Dữ liệu mẫu tự động cho user mới

Hệ thống đã sẵn sàng để sử dụng với flow hoàn chỉnh:
`Frontend (MinecraftDashboard)` ↔ `Backend (/api/game/*)` ↔ `Plugin (/api/plugin/*)`
