const prisma = require('../lib/prisma')
const { AppError } = require('../middleware/errorHandler')

// ─── GET /api/rooms/:roomId/beds ───────────────────────────────────────────────
const getBedsByRoom = async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
    })

    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found.')
    }

    const beds = await prisma.bed.findMany({
      where: { roomId: req.params.roomId },
      include: {
        assignments: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Attach the current tenant directly on each bed for convenience
    const bedsWithTenant = beds.map(bed => ({
      ...bed,
      currentTenant: bed.assignments[0]?.tenant || null,
    }))

    res.json({ success: true, data: bedsWithTenant })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/beds/:id ─────────────────────────────────────────────────────────
const getBedById = async (req, res, next) => {
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: req.params.id },
      include: {
        room: {
          include: { flat: true },
        },
        assignments: {
          include: { tenant: true },
          orderBy: { assignedAt: 'desc' },
        },
      },
    })

    if (!bed) {
      throw new AppError(404, 'BED_NOT_FOUND', 'Bed not found.')
    }

    res.json({
      success: true,
      data: {
        ...bed,
        currentTenant: bed.assignments.find(a => a.isActive)?.tenant || null,
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/rooms/:roomId/beds ──────────────────────────────────────────────
const createBed = async (req, res, next) => {
  try {
    const { label } = req.body

    // Step 1: Verify room exists
    const room = await prisma.room.findUnique({
      where: { id: req.params.roomId },
      include: { _count: { select: { beds: true } } },
    })

    if (!room) {
      throw new AppError(404, 'ROOM_NOT_FOUND', 'Room not found.')
    }

    // Step 2: BUSINESS RULE — enforce capacity
    // _count.beds gives us the current number of beds without fetching all bed records
    if (room._count.beds >= room.maxCapacity) {
      throw new AppError(
        409,
        'ROOM_AT_CAPACITY',
        `Cannot add bed. Room "${room.name}" is at maximum capacity (${room.maxCapacity} beds).`
      )
    }

    // Step 3: Create the bed — status defaults to 'available' per schema
    const bed = await prisma.bed.create({
      data: {
        label: label.trim(),
        roomId: req.params.roomId,
        // status defaults to 'available' — defined in Prisma schema
      },
    })

    res.status(201).json({ success: true, data: bed })
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /api/beds/:id/status ────────────────────────────────────────────────
const updateBedStatus = async (req, res, next) => {
  try {
    const { status } = req.body

    const bed = await prisma.bed.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { where: { isActive: true } },
      },
    })

    if (!bed) {
      throw new AppError(404, 'BED_NOT_FOUND', 'Bed not found.')
    }

    // Cannot manually set to 'occupied' — that only happens via assignment
    if (status === 'occupied') {
      throw new AppError(
        400,
        'INVALID_STATUS_CHANGE',
        'Cannot manually set a bed to occupied. Assign a tenant to the bed instead.'
      )
    }

    // Cannot set to 'available' or 'under_maintenance' if bed has an active tenant
    if (bed.assignments.length > 0 && status !== 'occupied') {
      throw new AppError(
        409,
        'BED_HAS_ACTIVE_TENANT',
        'Cannot change status of an occupied bed. Unassign the tenant first.'
      )
    }

    const updatedBed = await prisma.bed.update({
      where: { id: req.params.id },
      data: { status },
    })

    res.json({ success: true, data: updatedBed })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /api/beds/:id ──────────────────────────────────────────────────────
const deleteBed = async (req, res, next) => {
  try {
    const bed = await prisma.bed.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: { where: { isActive: true } },
      },
    })

    if (!bed) {
      throw new AppError(404, 'BED_NOT_FOUND', 'Bed not found.')
    }

    if (bed.assignments.length > 0) {
      throw new AppError(
        409,
        'BED_IS_OCCUPIED',
        'Cannot delete an occupied bed. Unassign the tenant first.'
      )
    }

    await prisma.bed.delete({ where: { id: req.params.id } })

    res.json({
      success: true,
      data: { message: `Bed "${bed.label}" deleted successfully.` },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getBedsByRoom, getBedById, createBed, updateBedStatus, deleteBed }