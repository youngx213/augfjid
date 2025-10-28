# Minecraft BedrockBox Plugin - StreamToEarn Integration

Plugin Minecraft tích hợp với hệ thống StreamToEarn, cho phép người xem tương tác với game thông qua việc gửi quà trên TikTok.

## Tính năng mới

### 🎮 Game Mode StreamToEarn
- **Hệ thống coin**: Người chơi nhận coin khi đặt block và hoàn thành thử thách
- **Leaderboard**: Bảng xếp hạng theo số coin
- **Timer**: Theo dõi thời gian game
- **Real-time stats**: Thống kê trực tiếp

### 🎁 Tích hợp Gift TikTok
- **Rose/Hồng**: Gửi TNT nhỏ đến người chơi
- **Heart/Tim**: Gửi TNT mạnh hơn
- **Firework/Pháo hoa**: Pháo hoa tại base
- **Rain/Mưa**: Mưa TNT
- **Zeus/Thần sấm**: Mưa TNT + sấm sét
- **Reset/Làm mới**: Reset game
- **Build/Xây**: Xây tháp

### 🔗 Kết nối Backend
- **API Integration**: Kết nối với backend StreamToEarn
- **Real-time sync**: Đồng bộ dữ liệu real-time
- **Authentication**: Bảo mật với plugin key

## Lệnh mới

### Game Management
```
/tntchallenge start <streamer>    # Bắt đầu game
/tntchallenge end                 # Kết thúc game
/tntchallenge status              # Xem trạng thái game
/tntchallenge leaderboard         # Xem bảng xếp hạng
```

### Gift Testing
```
/tntchallenge gift <giftname> <nickname> <amount>
```

### Lệnh cũ (vẫn hoạt động)
```
/tntchallenge reset <text>
/tntchallenge teste <text>
/tntchallenge rain <text>
/tntchallenge zeus <text>
/tntchallenge build <text>
/tntchallenge tnt <player> <amount> <power> <delay> <sender>
```

## Cài đặt

### 1. Backend Setup
```bash
cd augfjid/backend
npm install
npm start
```

### 2. Plugin Build
```bash
cd augfjid/bedrockbox-master
mvn clean package
```

### 3. Cấu hình
- Copy file `.jar` vào thư mục `plugins/` của server Minecraft
- Đảm bảo backend chạy trên port 3001
- Plugin key mặc định: `453782thien`

## API Endpoints

### Plugin API
- `POST /api/plugin/trigger` - Nhận gift từ TikTok
- `GET /api/plugin/config/:username` - Lấy cấu hình game
- `POST /api/plugin/stats` - Cập nhật thống kê
- `GET /api/plugin/leaderboard/:username` - Lấy bảng xếp hạng
- `GET /api/plugin/game-status/:username` - Trạng thái game

### Headers yêu cầu
```
x-plugin-key: 453782thien
Content-Type: application/json
```

## Luồng hoạt động

1. **Streamer bắt đầu game**: `/tntchallenge start <username>`
2. **Viewer gửi gift trên TikTok**: Gift được gửi đến backend
3. **Backend xử lý**: Tìm preset tương ứng và tính coin
4. **Plugin nhận trigger**: Thực hiện hiệu ứng trong game
5. **Player nhận coin**: Tự động cộng coin khi đặt block
6. **Real-time update**: Cập nhật leaderboard và stats

## Tính năng StreamToEarn

### Coin System
- **+1 coin**: Mỗi block đặt được
- **+10 coins**: Hoàn thành tháp (bonus)
- **Variable coins**: Theo preset của gift

### Game Objectives
- **Build Tower**: Xây tháp trong khu vực được bảo vệ
- **Survive TNT**: Tránh TNT từ viewer
- **Complete Challenge**: Hoàn thành thử thách để nhận bonus

### Real-time Features
- **Live Leaderboard**: Cập nhật real-time
- **Timer**: Hiển thị thời gian game
- **Stats**: Thống kê chi tiết
- **Notifications**: Thông báo khi nhận coin

## Troubleshooting

### Plugin không kết nối được backend
- Kiểm tra backend có chạy trên port 3001
- Kiểm tra plugin key trong config
- Kiểm tra firewall/network

### Gift không hoạt động
- Kiểm tra preset trong backend
- Kiểm tra log của backend và plugin
- Test bằng lệnh `/tntchallenge gift`

### Performance Issues
- Giảm số lượng TNT trong rain
- Tối ưu hóa khu vực build
- Kiểm tra memory usage

## License

MIT License - Xem file LICENSE để biết thêm chi tiết.