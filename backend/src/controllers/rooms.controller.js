const prisma = require('../lib/prisma')
const { AppError } = require('../middleware/errorHandler')

// ─── GET /api/flats/:flatId/rooms ──────────────────────────────────────────────
const getRoomsByFlat = async (req, res, next) => {
  try {
    const flat = await prisma.flat.findUnique({
      where: { id: req.params.flatId },
    })

    if (!flat) {
      throw new AppError(404, 'FLAT_NOT_FOUND', 'Flat not found.')
    }

    const rooms = await prisma.room.findMany({
      where: { flatId: req.params.flatId },
      include: {
        beds: {
          include: {
            assignments: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Add computed fields to each room
    const roomsWithStats = rooms.map(room => ({
      ...room,
      bedCount: room.beds.length,
      occupiedBeds: room.beds.filter(b => b.status === 'occupied').length,
      availableBeds: room.beds.filter(b => b.status === 'available').length,
      isAtCapacity: room.beds.length >= room.maxCapacity,
    }))

    res.json({ success: true, data: roomsWithStats })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/rooms/:id ────────────────────────────────────────────────────────
const getRoomById = async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        flat: true,
        beds: {
          include: {
            assignments: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found.')
    }

    res.json({
      success: true,
      data: {
        ...room,
        bedCount: room.beds.length,
        occupiedBeds: room.beds.filter(b => b.status === 'occupied').length,
        availableBeds: room.beds.filter(b => b.status === 'available').length,
        isAtCapacity: room.beds.length >= room.maxCapacity,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/flats/:flatId/rooms ─────────────────────────────────────────────
const createRoom = async (req, res, next) => {
  try {
    const { name, max_capacity } = req.body

    // Verify parent flat exists
    const flat = await prisma.flat.findUnique({
      where: { id: req.params.flatId },
    })

    if (!flat) {
      throw new AppError(404, 'FLAT_NOT_FOUND', 'Flat not found.')
    }

    const room = await prisma.room.create({
      data: {
        name: name.trim(),
        maxCapacity: parseInt(max_capacity),
        flatId: req.params.flatId,
      },
    })

    res.status(201).json({ success: true, data: room })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /api/rooms/:id ─────────────────────────────────────────────────────
const deleteRoom = async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        beds: {
          include: {
            assignments: {
              where: { isActive: true },
            },
          },
        },
      },
    })

    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found.')
    }

    const activeAssignmentCount = room.beds.reduce((sum, bed) => {
      return sum + bed.assignments.length
    }, 0)

    if (activeAssignmentCount > 0) {
      throw new AppError(
        409,
        'ROOM_HAS_ACTIVE_ASSIGNMENTS',
        `Cannot delete room. It has ${activeAssignmentCount} active tenant assignment(s). Please unassign all tenants first.`
      )
    }

    await prisma.room.delete({ where: { id: req.params.id } })

    res.json({
      success: true,
      data: { message: `Room "${room.name}" deleted successfully.` },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getRoomsByFlat, getRoomById, createRoom, deleteRoom }