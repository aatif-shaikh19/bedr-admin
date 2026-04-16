const express = require('express')
const { body, param } = require('express-validator')
const { validate } = require('../middleware/validate')
const {
  getAllTenants,
  getTenantById,
  createTenant,
  deleteTenant,
} = require('../controllers/tenants.controller')

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Tenants
 *   description: Tenant management
 */

/**
 * @swagger
 * /tenants:
 *   get:
 *     summary: Get all tenants with current assignment status
 *     tags: [Tenants]
 *     responses:
 *       200:
 *         description: List of tenants
 */
router.get('/', getAllTenants)

/**
 * @swagger
 * /tenants/{id}:
 *   get:
 *     summary: Get a tenant with full assignment history
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant details
 *       404:
 *         description: Tenant not found
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Tenant ID must be a valid UUID')],
  validate,
  getTenantById
)

/**
 * @swagger
 * /tenants:
 *   post:
 *     summary: Create a new tenant
 *     tags: [Tenants]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Rahul Sharma
 *               email:
 *                 type: string
 *                 example: rahul@example.com
 *               phone:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: Tenant created
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
    body('email')
      .trim()
      .notEmpty().withMessage('Email is required.')
      .isEmail().withMessage('Must be a valid email address.'),
    body('phone')
      .trim()
      .notEmpty().withMessage('Phone is required.')
      .isLength({ min: 7, max: 15 }).withMessage('Phone must be between 7 and 15 characters.'),
  ],
  validate,
  createTenant
)

/**
 * @swagger
 * /tenants/{id}:
 *   delete:
 *     summary: Delete a tenant (fails if actively assigned)
 *     tags: [Tenants]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tenant deleted
 *       409:
 *         description: Tenant has active assignment
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Tenant ID must be a valid UUID')],
  validate,
  deleteTenant
)

module.exports = router