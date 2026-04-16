const prisma = require('../lib/prisma')
const { AppError } = require('../middleware/errorHandler')

// ─── GET /api/flats ────────────────────────────────────────────────────────────
// Returns all flats with occupancy counts
const getAllFlats = async (req, res, next) => {
  try {
    const flats = await prisma.flat.findMany({
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                assignments: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate occupancy for each flat
    const flatsWithOccupancy = flats.map(flat => {
      const totalBeds = flat.rooms.reduce((sum, room) => sum + room.beds.length, 0)
      const occupiedBeds = flat.rooms.reduce((sum, room) => {
        return sum + room.beds.filter(bed => bed.status === 'occupied').length
      }, 0)

      return {
        id: flat.id,
        name: flat.name,
        address: flat.address,
        createdAt: flat.createdAt,
        roomCount: flat.rooms.length,
        totalBeds,
        occupiedBeds,
        occupancyPercent: totalBeds > 0
          ? Math.round((occupiedBeds / totalBeds) * 100)
          : 0,
      }
    })

    res.json({ success: true, data: flatsWithOccupancy })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/flats/:id ────────────────────────────────────────────────────────
// Returns a single flat with its rooms and beds
const getFlatById = async (req, res, next) => {
  try {
    const flat = await prisma.flat.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: {
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
        },
      },
    })

    if (!flat) {
      throw new AppError(404, 'FLAT_NOT_FOUND', 'Flat not found.')
    }

    res.json({ success: true, data: flat })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/flats ───────────────────────────────────────────────────────────
// Creates a new flat
const createFlat = async (req, res, next) => {
  try {
    const { name, address } = req.body

    const flat = await prisma.flat.create({
      data: { name: name.trim(), address: address.trim() },
    })

    res.status(201).json({ success: true, data: flat })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /api/flats/:id ─────────────────────────────────────────────────────
// Deletes a flat — ONLY if no active tenant assignments exist in any of its beds
const deleteFlat = async (req, res, next) => {
  try {
    const flat = await prisma.flat.findUnique({
      where: { id: req.params.id },
      include: {
        rooms: {
          include: {
            beds: {
              include: {
                assignments: {
                  where: { isActive: true },
                },
              },
            },
          },
        },
      },
    })

    if (!flat) {
      throw new AppError(404, 'FLAT_NOT_FOUND', 'Flat not found.')
    }

    // Count all active assignments across all beds in all rooms
    const activeAssignmentCount = flat.rooms.reduce((sum, room) => {
      return sum + room.beds.reduce((bedSum, bed) => {
        return bedSum + bed.assignments.length
      }, 0)
    }, 0)

    if (activeAssignmentCount > 0) {
      throw new AppError(
        409,
        'FLAT_HAS_ACTIVE_ASSIGNMENTS',
        `Cannot delete flat. It has ${activeAssignmentCount} active tenant assignment(s). Please unassign all tenants first.`
      )
    }

    // Safe to delete — Prisma CASCADE handles rooms and beds automatically
    await prisma.flat.delete({ where: { id: req.params.id } })

    res.json({
      success: true,
      data: { message: `Flat "${flat.name}" deleted successfully.` },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAllFlats, getFlatById, createFlat, deleteFlat }