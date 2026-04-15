const requireApiKey = (req, res, next) => {
    // Skip auth for health check and swagger docs
    const publicPaths = ['/health', '/docs']
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next()
    }
  
    const apiKey = req.headers['x-api-key']
  
    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_API_KEY',
          message: 'API key is required. Include x-api-key header.',
        },
      })
    }
  
    if (apiKey !== process.env.API_KEY) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Invalid API key.',
        },
      })
    }
  
    next()
  }
  
  module.exports = { requireApiKey }