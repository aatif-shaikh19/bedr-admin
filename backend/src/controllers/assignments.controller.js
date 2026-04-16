const prisma = require('../lib/prisma')
const { AppError } = require('../middleware/errorHandler')

// ─── POST /api/assignments ─────────────────────────────────────────────────────
// Assigns a tenant to a bed. Uses a transaction — all steps succeed or none do.
const createAssignment = async (req, res, next) => {
  try {
    const { tenant_id, bed_id } = req.body

    // ── Pre-transaction checks ─────────────────────────────────────────────────
    // We do these BEFORE the transaction to give clear error messages.
    // Transactions should only contain writes — reads before are fine.

    // Check bed exists and get its status
    const bed = await prisma.bed.findUnique({
      where: { id: bed_id },
      include: { room: { include: { flat: true } } },
    })

    if (!bed) {
      throw new AppError(404, 'BED_NOT_FOUND', 'Bed not found.')
    }

    // BUSINESS RULE 1: bed must be available
    if (bed.status === 'occupied') {
      throw new AppError(
        409,
        'BED_OCCUPIED',
        'This bed is currently occupied. Choose a different bed.'
      )
    }

    if (bed.status === 'under_maintenance') {
      throw new AppError(
        409,
        'BED_UNDER_MAINTENANCE',
        'This bed is under maintenance and cannot be assigned.'
      )
    }

    // Check tenant exists
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenant_id },
    })

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found.')
    }

    // BUSINESS RULE 2: tenant must not already have an active assignment
    const existingAssignment = await prisma.tenantAssignment.findFirst({
      where: { tenantId: tenant_id, isActive: true },
      include: { bed: true },
    })

    if (existingAssignment) {
      throw new AppError(
        409,
        'TENANT_ALREADY_ASSIGNED',
        `Tenant is already assigned to bed "${existingAssignment.bed.label}". Unassign them first or use the move endpoint.`
      )
    }

    // ── Transaction ────────────────────────────────────────────────────────────
    // Both operations must succeed together.
    // If the assignment is created but the bed update fails (or vice versa),
    // Prisma rolls back everything — the DB stays consistent.
    const assignment = await prisma.$transaction(async (tx) => {
      // Step 1: Create the assignment record
      const newAssignment = await tx.tenantAssignment.create({
        data: {
          tenantId: tenant_id,
          bedId: bed_id,
          isActive: true,
        },
        include: {
          tenant: true,
          bed: {
            include: { room: { include: { flat: true } } },
          },
        },
      })

      // Step 2: Mark the bed as occupied
      await tx.bed.update({
        where: { id: bed_id },
        data: { status: 'occupied' },
      })

      return newAssignment
    })

    res.status(201).json({ success: true, data: assignment })
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /api/assignments/:id/move ──────────────────────────────────────────
// Moves a tenant from their current bed to a new bed.
// BUSINESS RULE: old bed becomes 'available', new bed becomes 'occupied'.
const moveAssignment = async (req, res, next) => {
  try {
    const { new_bed_id } = req.body

    // Find the current assignment
    const currentAssignment = await prisma.tenantAssignment.findUnique({
      where: { id: req.params.id },
      include: { bed: true, tenant: true },
    })

    if (!currentAssignment) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.')
    }

    if (!currentAssignment.isActive) {
      throw new AppError(
        400,
        'ASSIGNMENT_NOT_ACTIVE',
        'This assignment is no longer active.'
      )
    }

    // Check new bed exists and is available
    const newBed = await prisma.bed.findUnique({
      where: { id: new_bed_id },
    })

    if (!newBed) {
      throw new AppError(404, 'BED_NOT_FOUND', 'New bed not found.')
    }

    if (newBed.id === currentAssignment.bedId) {
      throw new AppError(
        400,
        'SAME_BED',
        'Tenant is already assigned to this bed.'
      )
    }

    if (newBed.status === 'occupied') {
      throw new AppError(409, 'BED_OCCUPIED', 'The new bed is already occupied.')
    }

    if (newBed.status === 'under_maintenance') {
      throw new AppError(
        409,
        'BED_UNDER_MAINTENANCE',
        'The new bed is under maintenance and cannot be assigned.'
      )
    }

    // Transaction: 4 operations, all-or-nothing
    const newAssignment = await prisma.$transaction(async (tx) => {
      // Step 1: Deactivate old assignment
      await tx.tenantAssignment.update({
        where: { id: currentAssignment.id },
        data: { isActive: false },
      })

      // Step 2: Free the old bed
      await tx.bed.update({
        where: { id: currentAssignment.bedId },
        data: { status: 'available' },
      })

      // Step 3: Create new assignment
      const created = await tx.tenantAssignment.create({
        data: {
          tenantId: currentAssignment.tenantId,
          bedId: new_bed_id,
          isActive: true,
        },
        include: {
          tenant: true,
          bed: { include: { room: { include: { flat: true } } } },
        },
      })

      // Step 4: Mark new bed as occupied
      await tx.bed.update({
        where: { id: new_bed_id },
        data: { status: 'occupied' },
      })

      return created
    })

    res.json({ success: true, data: newAssignment })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /api/assignments/:id ───────────────────────────────────────────────
// Unassigns a tenant from their bed. Bed becomes 'available'.
const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await prisma.tenantAssignment.findUnique({
      where: { id: req.params.id },
      include: { bed: true, tenant: true },
    })

    if (!assignment) {
      throw new AppError(404, 'ASSIGNMENT_NOT_FOUND', 'Assignment not found.')
    }

    if (!assignment.isActive) {
      throw new AppError(
        400,
        'ASSIGNMENT_NOT_ACTIVE',
        'This assignment is already inactive.'
      )
    }

    // Transaction: deactivate assignment + free the bed
    await prisma.$transaction(async (tx) => {
      await tx.tenantAssignment.update({
        where: { id: req.params.id },
        data: { isActive: false },
      })

      await tx.bed.update({
        where: { id: assignment.bedId },
        data: { status: 'available' },
      })
    })

    res.json({
      success: true,
      data: {
        message: `Tenant "${assignment.tenant.name}" unassigned from bed "${assignment.bed.label}" successfully.`,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = { createAssignment, moveAssignment, deleteAssignment }