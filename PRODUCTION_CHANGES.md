# 📝 Production Configuration Changes

## Summary

Updated configuration files to support production deployment on `eric-software.click`.

## Files Changed

### 1. Frontend
**File: `frontend/nginx.conf`**
- ✅ Added HTTPS configuration
- ✅ Changed domain from `localhost` to `eric-software.click`
- ✅ Added SSL certificate paths
- ✅ Added security headers
- ✅ Changed proxy_pass from `backend:3001` to `localhost:3001`

**Environment File: `frontend/.env.production`**
```bash
VITE_API_URL=https://eric-software.click/api
```

### 2. Backend
**File: `backend/config.js`**
- ✅ Changed default CORS origin from `http://localhost:5173` to `https://eric-software.click`

**Environment File: `backend/.env.example`**
- Added production configuration template

### 3. Plugin
**Files: `bedrockbox-master/config.yml` & related Java files**
- ✅ Changed API URL from `localhost:3001` to `eric-software.click`
- ✅ All references to localhost replaced

### 4. Nginx Production Config
**File: `nginx.production.conf`**
- ✅ Complete production nginx configuration
- ✅ SSL/HTTPS setup
- ✅ WebSocket support
- ✅ Security headers
- ✅ Caching configuration
- ✅ Rate limiting ready

## Configuration Details

### API Endpoints (Production)

| Service | URL |
|---------|-----|
| Frontend | `https://eric-software.click` |
| API | `https://eric-software.click/api` |
| WebSocket | `https://eric-software.click/socket.io` |
| Minecraft Plugin | `http://eric-software.click` |

### Environment Variables

#### Frontend
```bash
VITE_API_URL=https://eric-software.click/api
```

#### Backend
```bash
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://eric-software.click
REDIS_URL=redis://localhost:6379
JWT_SECRET=<strong-secret>
PLUGIN_KEY=<your-key>
```

### Plugin Config
```yaml
plugin-key: "YOUR_KEY_HERE"
streamer: "YOUR_MINECRAFT_USERNAME"
api:
  base_url: "http://eric-software.click/api/plugin"
```

## Deployment Checklist

- [ ] Install SSL certificate
- [ ] Configure nginx
- [ ] Setup backend with PM2
- [ ] Build and deploy frontend
- [ ] Configure Redis
- [ ] Setup firewall
- [ ] Configure domain DNS
- [ ] Test all endpoints
- [ ] Setup backups
- [ ] Configure monitoring

## Testing

```bash
# Test frontend
curl https://eric-software.click

# Test API
curl https://eric-software.click/api/health

# Test WebSocket (from browser console)
const socket = io('https://eric-software.click');
```

## Rollback Plan

If issues occur, revert to localhost:

1. Restore `frontend/nginx.conf`
2. Restore `backend/config.js`
3. Update plugin config
4. Rebuild and redeploy

## Notes

- All URLs changed from `localhost` to `eric-software.click`
- HTTPS enforced throughout
- Backend listens on `localhost:3001` (nginx proxies to it)
- Plugin connects to `http://eric-software.click` (no HTTPS for Minecraft)

