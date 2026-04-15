const { validationResult } = require('express-validator')

/**
 * Run this after express-validator checks in a route.
 * If any check failed, it returns a 422 with all error messages.
 * If all passed, it calls next() to proceed to the controller.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input data.',
        details: errors.array().map(e => ({
          field: e.path,
          message: e.msg,
        })),
      },
    })
  }

  next()
}

module.exports = { validate }