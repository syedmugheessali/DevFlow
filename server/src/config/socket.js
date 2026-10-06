const { Server } = require('socket.io');
const config = require('./index');
const logger = require('../utils/logger');

let io;

/**
 * Initialize Socket.IO on the HTTP server.
 * Rooms are used per-workspace so updates are scoped.
 */
function initializeSocket(server) {
  io = new Server(server, {
    cors: {
      origin: config.clientUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id}`);

    // Join a workspace room
    socket.on('join:workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
      logger.debug(`Socket ${socket.id} joined workspace:${workspaceId}`);
    });

    // Join a project room
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      logger.debug(`Socket ${socket.id} joined project:${projectId}`);
    });

    // Join an issue room (for live comments/activity)
    socket.on('join:issue', (issueId) => {
      socket.join(`issue:${issueId}`);
    });

    // Leave rooms
    socket.on('leave:workspace', (workspaceId) => {
      socket.leave(`workspace:${workspaceId}`);
    });
    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
    });
    socket.on('leave:issue', (issueId) => {
      socket.leave(`issue:${issueId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
}

module.exports = { initializeSocket, getIO };
