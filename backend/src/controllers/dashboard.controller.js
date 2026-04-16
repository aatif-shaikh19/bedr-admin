const prisma = require('../lib/prisma')

// ─── GET /api/dashboard ────────────────────────────────────────────────────────
// Returns occupancy summary for all flats and their rooms
const getDashboard = async (req, res, next) => {
  try {
    // Single query — fetch everything we need in one round trip
    const flats = await prisma.flat.findMany({
      include: {
        rooms: {
          include: {
            beds: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Build the summary structure
    const summary = flats.map(flat => {
      const roomSummaries = flat.rooms.map(room => {
        const totalBeds = room.beds.length
        const occupiedBeds = room.beds.filter(b => b.status === 'occupied').length
        const availableBeds = room.beds.filter(b => b.status === 'available').length
        const maintenanceBeds = room.beds.filter(b => b.status === 'under_maintenance').length

        return {
          id: room.id,
          name: room.name,
          maxCapacity: room.maxCapacity,
          totalBeds,
          occupiedBeds,
          availableBeds,
          maintenanceBeds,
          occupancyPercent: totalBeds > 0
            ? Math.round((occupiedBeds / totalBeds) * 100)
            : 0,
          isAtCapacity: totalBeds >= room.maxCapacity,
        }
      })

      // Flat-level totals are derived from room summaries
      const flatTotalBeds = roomSummaries.reduce((s, r) => s + r.totalBeds, 0)
      const flatOccupiedBeds = roomSummaries.reduce((s, r) => s + r.occupiedBeds, 0)
      const flatAvailableBeds = roomSummaries.reduce((s, r) => s + r.availableBeds, 0)
      const flatMaintenanceBeds = roomSummaries.reduce((s, r) => s + r.maintenanceBeds, 0)

      return {
        id: flat.id,
        name: flat.name,
        address: flat.address,
        totalRooms: flat.rooms.length,
        totalBeds: flatTotalBeds,
        occupiedBeds: flatOccupiedBeds,
        availableBeds: flatAvailableBeds,
        maintenanceBeds: flatMaintenanceBeds,
        occupancyPercent: flatTotalBeds > 0
          ? Math.round((flatOccupiedBeds / flatTotalBeds) * 100)
          : 0,
        rooms: roomSummaries,
      }
    })

    // Overall system-wide totals
    const totals = {
      totalFlats: flats.length,
      totalRooms: summary.reduce((s, f) => s + f.totalRooms, 0),
      totalBeds: summary.reduce((s, f) => s + f.totalBeds, 0),
      occupiedBeds: summary.reduce((s, f) => s + f.occupiedBeds, 0),
      availableBeds: summary.reduce((s, f) => s + f.availableBeds, 0),
      maintenanceBeds: summary.reduce((s, f) => s + f.maintenanceBeds, 0),
    }

    totals.overallOccupancyPercent = totals.totalBeds > 0
      ? Math.round((totals.occupiedBeds / totals.totalBeds) * 100)
      : 0

    res.json({
      success: true,
      data: { totals, flats: summary },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { getDashboard }