# Plugin Integration - BedrockBox Minecraft

Hướng dẫn tích hợp plugin Minecraft với backend StreamToEarn.

## API Endpoints

### 1. Trigger Gift
```http
POST /api/plugin/trigger
Content-Type: application/json
x-plugin-key: 453782thien

{
  "username": "streamer_name",
  "giftName": "rose",
  "nickname": "viewer_name", 
  "amount": 1
}
```

**Response:**
```json
{
  "ok": true,
  "coinsAdded": 1
}
```

### 2. Get Game Config
```http
GET /api/plugin/config/{username}
x-plugin-key: 453782thien
```

**Response:**
```json
{
  "ok": true,
  "presets": [...],
  "overlay": {...},
  "stats": {
    "coins": 100,
    "viewers": 50,
    "timer": 300
  }
}
```

### 3. Update Stats
```http
POST /api/plugin/stats
Content-Type: application/json
x-plugin-key: 453782thien

{
  "username": "streamer_name",
  "viewers": 50,
  "coins": 100,
  "winGoal": 1000,
  "timer": 300
}
```

### 4. Get Leaderboard
```http
GET /api/plugin/leaderboard/{username}
x-plugin-key: 453782thien
```

### 5. Get Game Status
```http
GET /api/plugin/game-status/{username}
x-plugin-key: 453782thien
```

## Gift Types & Effects

### Basic Gifts
- **rose/hồng**: TNT power 2, +1 coin
- **heart/tim**: TNT power 3, +2 coins
- **firework/pháo hoa**: Fireworks at base, +3 coins

### Special Gifts
- **rain/mưa**: Rain TNT (20), +5 coins
- **zeus/thần sấm**: Zeus TNT (40), +10 coins
- **reset/làm mới**: Reset game, 0 coins
- **build/xây**: Build tower, 0 coins

## Socket.IO Events

### Plugin Events
```javascript
// Listen for plugin events
socket.on('plugin:trigger', (data) => {
  // Process gift trigger
  console.log(data.giftName, data.nickname, data.amount, data.coinsAdded);
});
```

### Overlay Events
```javascript
// Send to overlay
io.to(`overlay:${username}`).emit('overlay:update', {
  type: 'gift',
  giftName: 'rose',
  nickname: 'viewer',
  amount: 1,
  coinsAdded: 1,
  stats: { coins: 101 }
});
```

## Configuration

### Environment Variables
```bash
PLUGIN_KEY=453782thien
API_PORT=3001
CORS_ORIGIN=http://localhost:5173
```

### Plugin Configuration
- **API Base URL**: `http://localhost:3001/api/plugin`
- **Plugin Key**: `453782thien`
- **Timeout**: 5000ms
- **Retry Attempts**: 3

## Game Flow

1. **Start Game**: `/tntchallenge start <streamer>`
2. **Load Config**: Plugin fetches presets and settings
3. **Process Gifts**: Backend receives TikTok gifts
4. **Trigger Effects**: Plugin executes game effects
5. **Update Stats**: Real-time stats synchronization
6. **End Game**: `/tntchallenge end`

## Error Handling

### Common Errors
- **401 Unauthorized**: Invalid plugin key
- **503 Service Unavailable**: Plugin integration disabled
- **500 Internal Server Error**: Backend processing error

### Retry Logic
```javascript
// Plugin retries failed API calls
for (let i = 0; i < retryAttempts; i++) {
  try {
    const response = await apiCall();
    break;
  } catch (error) {
    if (i === retryAttempts - 1) throw error;
    await delay(1000 * (i + 1)); // Exponential backoff
  }
}
```

## Testing

### Manual Testing
```bash
# Test gift trigger
curl -X POST http://localhost:3001/api/plugin/trigger \
  -H "Content-Type: application/json" \
  -H "x-plugin-key: 453782thien" \
  -d '{"username":"test","giftName":"rose","nickname":"tester","amount":1}'

# Test config
curl http://localhost:3001/api/plugin/config/test \
  -H "x-plugin-key: 453782thien"
```

### Plugin Commands
```bash
# In Minecraft server
/tntchallenge start test
/tntchallenge gift rose tester 1
/tntchallenge status
/tntchallenge leaderboard
/tntchallenge end
```

## Monitoring

### Logs
- **API Calls**: All plugin API requests logged
- **Gift Processing**: Gift triggers and effects logged
- **Error Tracking**: Failed requests and errors tracked

### Metrics
- **Response Times**: API response time monitoring
- **Success Rate**: API call success percentage
- **Gift Volume**: Number of gifts processed per minute

## Security

### Authentication
- **Plugin Key**: Required for all API calls
- **Rate Limiting**: Prevents API abuse
- **CORS**: Configured for specific origins

### Data Protection
- **No Sensitive Data**: Only game-related data transmitted
- **Temporary Storage**: Stats stored temporarily in Redis
- **Secure Headers**: Helmet.js security headers enabled

## Deployment

### Backend Deployment
```bash
# Production
NODE_ENV=production npm start

# Docker
docker build -t streamtoearn-backend .
docker run -p 3001:3001 streamtoearn-backend
```

### Plugin Deployment
1. Build plugin: `mvn clean package`
2. Copy `.jar` to server `plugins/` folder
3. Configure `config.yml`
4. Restart server

## Troubleshooting

### Connection Issues
- Check backend is running on port 3001
- Verify plugin key configuration
- Check network connectivity
- Review firewall settings

### Gift Not Working
- Check gift preset configuration
- Verify gift name mapping
- Check backend logs
- Test with manual API call

### Performance Issues
- Monitor API response times
- Check database/Redis performance
- Review plugin memory usage
- Optimize gift processing logic
