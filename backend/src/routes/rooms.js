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

module.exports = router