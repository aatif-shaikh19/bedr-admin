const express = require('express')
const { body, param } = require('express-validator')
const { validate } = require('../middleware/validate')
const {
  createAssignment,
  moveAssignment,
  deleteAssignment,
} = require('../controllers/assignments.controller')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Assignments
 *   description: Tenant bed assignments
 */

/**
 * @swagger
 * /assignments:
 *   post:
 *     summary: Assign a tenant to a bed
 *     tags: [Assignments]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenant_id, bed_id]
 *             properties:
 *               tenant_id:
 *                 type: string
 *               bed_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Assignment created
 *       409:
 *         description: Bed occupied, under maintenance, or tenant already assigned
 */
router.post(
  '/',
  [
    body('tenant_id')
      .notEmpty().withMessage('Tenant ID is required.')
      .isUUID().withMessage('Tenant ID must be a valid UUID.'),
    body('bed_id')
      .notEmpty().withMessage('Bed ID is required.')
      .isUUID().withMessage('Bed ID must be a valid UUID.'),
  ],
  validate,
  createAssignment
)

/**
 * @swagger
 * /assignments/{id}/move:
 *   patch:
 *     summary: Move a tenant to a different bed
 *     tags: [Assignments]
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
 *             required: [new_bed_id]
 *             properties:
 *               new_bed_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Tenant moved
 *       409:
 *         description: New bed unavailable
 */
router.patch(
  '/:id/move',
  [
    param('id').isUUID().withMessage('Assignment ID must be a valid UUID'),
    body('new_bed_id')
      .notEmpty().withMessage('New bed ID is required.')
      .isUUID().withMessage('New bed ID must be a valid UUID.'),
  ],
  validate,
  moveAssignment
)

/**
 * @swagger
 * /assignments/{id}:
 *   delete:
 *     summary: Unassign a tenant from their bed
 *     tags: [Assignments]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant unassigned, bed now available
 *       404:
 *         description: Assignment not found
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Assignment ID must be a valid UUID')],
  validate,
  deleteAssignment
)

module.exports = router