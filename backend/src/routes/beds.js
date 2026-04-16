const express = require('express')
const { body, param } = require('express-validator')
const { validate } = require('../middleware/validate')
const {
  getBedById,
  updateBedStatus,
  deleteBed,
} = require('../controllers/beds.controller')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Beds
 *   description: Bed management
 */

/**
 * @swagger
 * /beds/{id}:
 *   get:
 *     summary: Get a bed by ID with assignment history
 *     tags: [Beds]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bed details
 *       404:
 *         description: Bed not found
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Bed ID must be a valid UUID')],
  validate,
  getBedById
)

/**
 * @swagger
 * /beds/{id}/status:
 *   patch:
 *     summary: Update bed status manually (available or under_maintenance only)
 *     tags: [Beds]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [available, under_maintenance]
 *     responses:
 *       200:
 *         description: Status updated
 *       400:
 *         description: Invalid status change
 *       409:
 *         description: Bed has active tenant
 */
router.patch(
  '/:id/status',
  [
    param('id').isUUID().withMessage('Bed ID must be a valid UUID'),
    body('status')
      .notEmpty().withMessage('Status is required.')
      .isIn(['available', 'occupied', 'under_maintenance'])
      .withMessage('Status must be available, occupied, or under_maintenance.'),
  ],
  validate,
  updateBedStatus
)

/**
 * @swagger
 * /beds/{id}:
 *   delete:
 *     summary: Delete a bed (fails if occupied)
 *     tags: [Beds]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bed deleted
 *       409:
 *         description: Bed is occupied
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Bed ID must be a valid UUID')],
  validate,
  deleteBed
)

module.exports = router