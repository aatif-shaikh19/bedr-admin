const prisma = require('../lib/prisma')
const { AppError } = require('../middleware/errorHandler')

// ─── GET /api/tenants ──────────────────────────────────────────────────────────
const getAllTenants = async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      include: {
        assignments: {
          where: { isActive: true },
          include: {
            bed: {
              include: {
                room: {
                  include: { flat: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const tenantsWithStatus = tenants.map(tenant => {
      const activeAssignment = tenant.assignments[0] || null
      return {
        id: tenant.id,
        name: tenant.name,
        email: tenant.email,
        phone: tenant.phone,
        createdAt: tenant.createdAt,
        isAssigned: !!activeAssignment,
        currentAssignment: activeAssignment
          ? {
              assignmentId: activeAssignment.id,
              bedId: activeAssignment.bed.id,
              bedLabel: activeAssignment.bed.label,
              roomName: activeAssignment.bed.room.name,
              flatName: activeAssignment.bed.room.flat.name,
              assignedAt: activeAssignment.assignedAt,
            }
          : null,
      }
    })

    res.json({ success: true, data: tenantsWithStatus })
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/tenants/:id ──────────────────────────────────────────────────────
const getTenantById = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.params.id },
      include: {
        assignments: {
          include: {
            bed: {
              include: {
                room: {
                  include: { flat: true },
                },
              },
            },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    })

    if (!tenant) {
      throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found.')
    }

    res.json({
      success: true,
      data: {
        ...tenant,
        currentAssignment: tenant.assignments.find(a => a.isActive) || null,
        assignmentHistory: tenant.assignments.filter(a => !a.isActive),
      },
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/tenants ─────────────────────────────────────────────────────────
const createTenant = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body

    const tenant = await prisma.tenant.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
      },
    })

    res.status(201).json({ success: true, data: tenant })
  } catch (err) {
    next(err)
  }
}

// ─── DELETE /api/tenants/:id ───────────────────────────────────────────────────
const deleteTenant = async (req, res, next) => {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.params.id },
        include: {
          assignments: { where: { isActive: true } },
        },
      })
  
      if (!tenant) {
        throw new AppError(404, 'TENANT_NOT_FOUND', 'Tenant not found.')
      }
  
      // BUSINESS RULE: cannot delete tenant with active assignment
      if (tenant.assignments.length > 0) {
        throw new AppError(
          409,
          'TENANT_HAS_ACTIVE_ASSIGNMENT',
          'Cannot delete tenant. They currently have an active bed assignment. Unassign them first.'
        )
      }
  
      // Delete all historical assignment records first, then the tenant
      // We must do this because tenant_assignments has a foreign key to tenants
      // Even inactive (historical) records must be cleaned up before deletion
      await prisma.$transaction(async (tx) => {
        await tx.tenantAssignment.deleteMany({
          where: { tenantId: req.params.id },
        })
        await tx.tenant.delete({
          where: { id: req.params.id },
        })
      })
  
      res.json({
        success: true,
        data: { message: `Tenant "${tenant.name}" deleted successfully.` },
      })
    } catch (err) {
      next(err)
    }
}

module.exports = { getAllTenants, getTenantById, createTenant, deleteTenant }