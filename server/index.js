import app from './app.js';

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 API Server running at http://localhost:${PORT}`);
  console.log(`📊 Admin: http://localhost:5173/admin`);
});

// Prevent Node event loop from exiting prematurely
setInterval(() => {}, 1000 * 60 * 60);

export default server;
