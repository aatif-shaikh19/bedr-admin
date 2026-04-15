const swaggerJsdoc = require('swagger-jsdoc')

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'BedR Admin Panel API',
      version: '1.0.0',
      description: 'REST API for managing flats, rooms, beds, and tenant assignments.',
      contact: {
        name: 'Aatif Shaikh',
      },
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://bedr-backend.onrender.com/api'
          : 'http://localhost:5000/api',
        description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  },
  // Scan these files for JSDoc comments that define API endpoints
  apis: ['./src/routes/*.js'],
}

const swaggerSpec = swaggerJsdoc(options)

module.exports = swaggerSpec