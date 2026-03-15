const express     = require('express')
const http        = require('http')
const { Server }  = require('socket.io')
const cors        = require('cors')
const helmet      = require('helmet')
const morgan      = require('morgan')
const compression = require('compression')
const path        = require('path')

const { env }          = require('./config/env')
const { connectDB }    = require('./config/db')
const { seedAdmin }    = require('./config/seedAdmin')
const { errorHandler } = require('./middleware/error.middleware')
const { initSocket }   = require('./services/socket.service')

// Routes
const authRoutes      = require('./routes/auth')
const projectRoutes   = require('./routes/project')
const furnitureRoutes = require('./routes/furniture')
const textureRoutes   = require('./routes/texture')
const adminRoutes     = require('./routes/admin')

// ── App setup ────────────────────────────────────────────────────────────────
const app    = express()
const server = http.createServer(app)
const io     = new Server(server, {
  cors: { origin: env.CLIENT_URL, methods: ['GET', 'POST'] }
})

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({ origin: env.CLIENT_URL, credentials: true }))
app.use(compression())
app.use(morgan(env.NODE_ENV === 'development' ? 'dev' : 'combined'))
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes)
app.use('/api/projects',  projectRoutes)
app.use('/api/furniture', furnitureRoutes)
app.use('/api/textures',  textureRoutes)
app.use('/api/admin',     adminRoutes)

// Health check
app.get('/api/health', (req, res) =>
  res.json({ success: true, message: 'HomePlan3D API running', env: env.NODE_ENV })
)

// 404
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.path} not found` })
)

// ── Error handler ────────────────────────────────────────────────────────────
app.use(errorHandler)

// ── Socket.IO ────────────────────────────────────────────────────────────────
initSocket(io)

// ── Start server ─────────────────────────────────────────────────────────────
connectDB().then(async () => {
  await seedAdmin()
  server.listen(env.PORT, () =>
    console.log(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`)
  )
})