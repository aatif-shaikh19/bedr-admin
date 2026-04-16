const express = require('express')
const { body, param } = require('express-validator')
const { validate } = require('../middleware/validate')
const {
  getRoomsByFlat,
  getRoomById,
  createRoom,
  deleteRoom,
} = require('../controllers/rooms.controller')

const router = express.Router()
const { getBedsByRoom, createBed } = require('../controllers/beds.controller')
/**
 * @swagger
 * tags:
 *   name: Rooms
 *   description: Room management
 */

/**
 * @swagger
 * /rooms/{id}:
 *   get:
 *     summary: Get a room by ID with its beds
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room details
 *       404:
 *         description: Room not found
 */
router.get(
  '/:id',
  [param('id').isUUID().withMessage('Room ID must be a valid UUID')],
  validate,
  getRoomById
)

/**
 * @swagger
 * /rooms/{id}:
 *   delete:
 *     summary: Delete a room (fails if active assignments exist)
 *     tags: [Rooms]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room deleted
 *       409:
 *         description: Room has active assignments
 */
router.delete(
  '/:id',
  [param('id').isUUID().withMessage('Room ID must be a valid UUID')],
  validate,
  deleteRoom
)

/**
 * @swagger
 * /rooms/{roomId}/beds:
 *   get:
 *     summary: Get all beds in a room
 *     tags: [Beds]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of beds
 */
router.get(
  '/:roomId/beds',
  [param('roomId').isUUID().withMessage('Room ID must be a valid UUID')],
  validate,
  getBedsByRoom
)

/**
 * @swagger
 * /rooms/{roomId}/beds:
 *   post:
 *     summary: Create a bed in a room (enforces max capacity)
 *     tags: [Beds]
 *     parameters:
 *       - in: path
 *         name: roomId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [label]
 *             properties:
 *               label:
 *                 type: string
 *                 example: Bed A
 *     responses:
 *       201:
 *         description: Bed created
 *       409:
 *         description: Room at capacity
 */
router.post(
  '/:roomId/beds',
  [
    param('roomId').isUUID().withMessage('Room ID must be a valid UUID'),
    body('label')
      .trim()
      .notEmpty().withMessage('Bed label is required.')
      .isLength({ min: 1, max: 50 }).withMessage('Label must be between 1 and 50 characters.'),
  ],
  validate,
  createBed
)

module.exports = router