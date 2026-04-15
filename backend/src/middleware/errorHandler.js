/**
 * Custom application error class.
 * Throw this anywhere in a controller to send a structured error response.
 *
 * Example:
 *   throw new AppError(409, 'BED_OCCUPIED', 'This bed is currently occupied.')
 */
class AppError extends Error {
    constructor(statusCode, code, message) {
      super(message)
      this.statusCode = statusCode
      this.code = code
    }
  }
  
  /**
   * Global error handler middleware.
   * Express calls this automatically when you call next(error) or throw inside async.
   * It must have exactly 4 parameters — (err, req, res, next) — for Express to recognize it.
   */
  const errorHandler = (err, req, res, next) => {
    // Log the error in development so we can see the full stack trace
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Error:', err)
    }
  
    // If it's our custom AppError, use its status code and code
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message,
        },
      })
    }
  
    // Handle Prisma-specific errors
    if (err.code === 'P2002') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this value already exists.',
        },
      })
    }
  
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'The requested record was not found.',
        },
      })
    }
  
    // Fallback for unexpected errors — never expose stack traces in production
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred.'
          : err.message,
      },
    })
  }
  
  module.exports = { AppError, errorHandler }