// Start server with proper error handling
console.log('🚀 Starting TikTok Draw Bot Backend Server...');

try {
  await import('./server.js');
  console.log('✅ Server started successfully!');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
