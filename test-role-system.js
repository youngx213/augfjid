// Demo script để test hệ thống role-based
// Chạy trong browser console hoặc Node.js

const API_URL = 'http://localhost:3001';

// 1. Đăng ký user role=game
async function registerGameUser() {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testgame',
      password: 'password123',
      role: 'game'
    })
  });
  
  const data = await response.json();
  console.log('Register result:', data);
  return data.token;
}

// 2. Đăng ký user role=bot
async function registerBotUser() {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testbot',
      password: 'password123',
      role: 'bot'
    })
  });
  
  const data = await response.json();
  console.log('Register result:', data);
  return data.token;
}

// 3. Test game routes
async function testGameRoutes(token) {
  console.log('Testing game routes...');
  
  // Get presets
  const presetsResponse = await fetch(`${API_URL}/api/game/presets`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const presets = await presetsResponse.json();
  console.log('Presets:', presets);
  
  // Get overlay
  const overlayResponse = await fetch(`${API_URL}/api/game/overlay`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const overlay = await overlayResponse.json();
  console.log('Overlay:', overlay);
  
  // Update overlay
  const updateResponse = await fetch(`${API_URL}/api/game/overlay/update`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      goalLikes: 'https://example.com/goal-likes',
      smartBar: 'https://example.com/smart-bar',
      topGifters: 'https://example.com/top-gifters'
    })
  });
  const updateResult = await updateResponse.json();
  console.log('Update overlay result:', updateResult);
}

// 4. Test plugin routes
async function testPluginRoutes() {
  console.log('Testing plugin routes...');
  
  // Get config for plugin
  const configResponse = await fetch(`${API_URL}/api/plugin/config/testgame`);
  const config = await configResponse.json();
  console.log('Plugin config:', config);
  
  // Update stats
  const statsResponse = await fetch(`${API_URL}/api/plugin/stats`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testgame',
      coins: 100,
      viewers: 15,
      winGoal: 200,
      timer: 120
    })
  });
  const statsResult = await statsResponse.json();
  console.log('Update stats result:', statsResult);
  
  // Trigger event
  const triggerResponse = await fetch(`${API_URL}/api/plugin/trigger`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testgame',
      gift: 'Rose',
      amount: 5
    })
  });
  const triggerResult = await triggerResponse.json();
  console.log('Trigger result:', triggerResult);
}

// 5. Test bot routes (should fail for game user)
async function testBotRoutes(token) {
  console.log('Testing bot routes with game token (should fail)...');
  
  try {
    const response = await fetch(`${API_URL}/api/accounts`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log('Bot routes result:', data);
  } catch (error) {
    console.log('Expected error:', error.message);
  }
}

// 6. Socket.IO test
function testSocketIO(token) {
  console.log('Testing Socket.IO...');
  
  const socket = io(API_URL, { auth: { token } });
  
  socket.on('connect', () => {
    console.log('Socket connected');
    socket.emit('join:game', { username: 'testgame' });
  });
  
  socket.on('stats:update', (stats) => {
    console.log('Stats updated:', stats);
  });
  
  socket.on('plugin:trigger', (data) => {
    console.log('Plugin trigger received:', data);
  });
  
  return socket;
}

// Chạy tất cả tests
async function runAllTests() {
  console.log('🚀 Starting role-based system tests...\n');
  
  try {
    // Register users
    const gameToken = await registerGameUser();
    const botToken = await registerBotUser();
    
    console.log('\n--- Testing Game Routes ---');
    await testGameRoutes(gameToken);
    
    console.log('\n--- Testing Plugin Routes ---');
    await testPluginRoutes();
    
    console.log('\n--- Testing Bot Routes (should fail) ---');
    await testBotRoutes(gameToken);
    
    console.log('\n--- Testing Socket.IO ---');
    const socket = testSocketIO(gameToken);
    
    console.log('\n✅ All tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Open http://localhost:5173/login');
    console.log('2. Login with username: testgame, password: password123');
    console.log('3. You should be redirected to MinecraftDashboard');
    console.log('4. Test the preset management and overlay URLs');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export functions for manual testing
window.testRoleSystem = {
  registerGameUser,
  registerBotUser,
  testGameRoutes,
  testPluginRoutes,
  testBotRoutes,
  testSocketIO,
  runAllTests
};

console.log('🎮 Role-based system test functions loaded!');
console.log('Run: testRoleSystem.runAllTests() to start testing');
