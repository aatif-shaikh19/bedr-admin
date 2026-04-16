const express = require('express')
const { getDashboard } = require('../controllers/dashboard.controller')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Occupancy overview
 */

/**
 * @swagger
 * /dashboard:
 *   get:
 *     summary: Get full occupancy summary across all flats and rooms
 *     tags: [Dashboard]
 *     responses:
 *       200:
 *         description: Occupancy summary
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totals:
 *                       type: object
 *                     flats:
 *                       type: array
 */
router.get('/', getDashboard)

module.exports = router