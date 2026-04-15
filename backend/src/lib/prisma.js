const { PrismaClient } = require('@prisma/client')

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit on every hot reload.
const globalForPrisma = global

const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

module.exports = prisma