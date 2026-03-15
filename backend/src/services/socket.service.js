const { verifyToken } = require('../utils/jwt')

const initSocket = (io) => {
  // Auth middleware for socket
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))
    try {
      const decoded = verifyToken(token)
      socket.userId = decoded.id
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.userId}`)

    // Join a project room
    socket.on('project:join', (projectId) => {
      socket.join(projectId)
      console.log(`User ${socket.userId} joined project ${projectId}`)
    })

    // Leave a project room
    socket.on('project:leave', (projectId) => {
      socket.leave(projectId)
    })

    // Broadcast design changes to other users in same project
    socket.on('project:change', ({ projectId, change }) => {
      socket.to(projectId).emit('project:change', { userId: socket.userId, change })
    })

    // Live cursor position
    socket.on('cursor:move', ({ projectId, x, y }) => {
      socket.to(projectId).emit('cursor:move', { userId: socket.userId, x, y })
    })

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.userId}`)
    })
  })
}

module.exports = { initSocket }