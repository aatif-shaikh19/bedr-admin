require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')
const swaggerUi = require('swagger-ui-express')

const { errorHandler } = require('./middleware/errorHandler')
const { requireApiKey } = require('./middleware/auth')
const swaggerSpec = require('./lib/swagger')

// Import route files (we'll create these next)
const flatRoutes = require('./routes/flats')
const roomRoutes = require('./routes/rooms')
const bedRoutes = require('./routes/beds')
const tenantRoutes = require('./routes/tenants')
const assignmentRoutes = require('./routes/assignments')
const dashboardRoutes = require('./routes/dashboard')

const app = express()
const PORT = process.env.PORT || 5000

// ─── Security Middleware ───────────────────────────────────────────────────────
app.use(helmet())                          // Sets secure HTTP headers
app.use(cors({
  origin: [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'x-api-key'],
}))

// ─── Rate Limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,             // 15 minutes
  max: 200,                              // max 200 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again in 15 minutes.',
      },
    })
  },
})
app.use(limiter)

// ─── General Middleware ────────────────────────────────────────────────────────
app.use(morgan('dev'))                   // Request logging
app.use(express.json())                  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }))

// ─── API Key Auth (applies to all /api routes except public ones) ──────────────
app.use('/api', requireApiKey)

// ─── Swagger Docs (public) ─────────────────────────────────────────────────────
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'BedR API Docs',
}))

// ─── Health Check ──────────────────────────────────────────────────────────────
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: Server is running
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  })
})

// ─── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/flats', flatRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/beds', bedRoutes)
app.use('/api/tenants', tenantRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/dashboard', dashboardRoutes)

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.originalUrl} does not exist.`,
    },
  })
})

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use(errorHandler)

// ─── Start Server ──────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 BedR API running on http://localhost:${PORT}`)
  console.log(`📖 Swagger docs at http://localhost:${PORT}/api/docs`)
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`)
})

module.exports = app