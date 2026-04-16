const express = require('express')
const { body, param } = require('express-validator')
const { validate } = require('../middleware/validate')
const {
  getAllFlats,
  getFlatById,
  createFlat,
  deleteFlat,
} = require('../controllers/flats.controllers')

const router = express.Router()
const { getRoomsByFlat, createRoom } = require('../controllers/rooms.controller')

/**
 * @swagger
 * tags:
 *   name: Flats
 *   description: Flat management
 */

/**
 * @swagger
 * /flats:
 *   get:
 *     summary: Get all flats with occupancy summary
 *     tags: [Flats]
 *     responses:
 *       200:
 *         description: List of flats
 */
router.get('/', getAllFlats)

/**
 * @swagger
 * /flats/{id}:
 *   get:
 *     summary: Get a single flat with rooms and beds
 *     tags: [Flats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flat details
 *       404:
 *         description: Flat not found
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Flat ID must be a valid UUID')],
  validate,
  getFlatById
)

/**
 * @swagger
 * /flats:
 *   post:
 *     summary: Create a new flat
 *     tags: [Flats]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, address]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Sunrise Apartments
 *               address:
 *                 type: string
 *                 example: 123 MG Road, Bengaluru
 *     responses:
 *       201:
 *         description: Flat created
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  [
    body('name')
      .trim()
      .notEmpty().withMessage('Flat name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
    body('address')
      .trim()
      .notEmpty().withMessage('Address is required.')
      .isLength({ min: 5, max: 300 }).withMessage('Address must be between 5 and 300 characters.'),
  ],
  validate,
  createFlat
)

/**
 * @swagger
 * /flats/{id}:
 *   delete:
 *     summary: Delete a flat (fails if active assignments exist)
 *     tags: [Flats]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Flat deleted
 *       404:
 *         description: Flat not found
 *       409:
 *         description: Flat has active assignments
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Flat ID must be a valid UUID')],
  validate,
  deleteFlat
)

/**
 * @swagger
 * /flats/{flatId}/rooms:
 *   get:
 *     summary: Get all rooms in a flat
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: flatId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of rooms
 *       404:
 *         description: Flat not found
 */
router.get(
  '/:flatId/rooms',
  [param('flatId').isUUID().withMessage('Flat ID must be a valid UUID')],
  validate,
  getRoomsByFlat
)

/**
 * @swagger
 * /flats/{flatId}/rooms:
 *   post:
 *     summary: Create a room inside a flat
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: flatId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, max_capacity]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Room 101
 *               max_capacity:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Room created
 *       404:
 *         description: Flat not found
 */
router.post(
  '/:flatId/rooms',
  [
    param('flatId').isUUID().withMessage('Flat ID must be a valid UUID'),
    body('name')
      .trim()
      .notEmpty().withMessage('Room name is required.')
      .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters.'),
    body('max_capacity')
      .notEmpty().withMessage('Max capacity is required.')
      .isInt({ min: 1, max: 20 }).withMessage('Max capacity must be a number between 1 and 20.'),
  ],
  validate,
  createRoom
)

module.exports = router