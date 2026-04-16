require('dotenv').config()
const prisma = require('./lib/prisma')

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data in correct order (child → parent)
  await prisma.tenantAssignment.deleteMany()
  await prisma.bed.deleteMany()
  await prisma.room.deleteMany()
  await prisma.tenant.deleteMany()
  await prisma.flat.deleteMany()

  console.log('🗑  Cleared existing data')

  // ── Create Flats ─────────────────────────────────────────────────────────────
  const flat1 = await prisma.flat.create({
    data: { name: 'Green Valley PG', address: '45 Koramangala 5th Block, Bengaluru 560034' },
  })

  const flat2 = await prisma.flat.create({
    data: { name: 'Metro Heights', address: '78 Andheri East, Mumbai 400069' },
  })

  console.log('🏢 Created 2 flats')

  // ── Create Rooms ──────────────────────────────────────────────────────────────
  const [r1, r2, r3] = await Promise.all([
    prisma.room.create({ data: { name: 'Room 101', maxCapacity: 3, flatId: flat1.id } }),
    prisma.room.create({ data: { name: 'Room 102', maxCapacity: 2, flatId: flat1.id } }),
    prisma.room.create({ data: { name: 'Room 201', maxCapacity: 4, flatId: flat2.id } }),
  ])

  console.log('🚪 Created 3 rooms')

  // ── Create Beds ───────────────────────────────────────────────────────────────
  const [b1, b2, b3, b4, b5, b6, b7] = await Promise.all([
    prisma.bed.create({ data: { label: 'Bed A', roomId: r1.id } }),
    prisma.bed.create({ data: { label: 'Bed B', roomId: r1.id } }),
    prisma.bed.create({ data: { label: 'Bed C', roomId: r1.id } }),
    prisma.bed.create({ data: { label: 'Bed A', roomId: r2.id } }),
    prisma.bed.create({ data: { label: 'Bed B', roomId: r2.id } }),
    prisma.bed.create({ data: { label: 'Bed A', roomId: r3.id } }),
    prisma.bed.create({ data: { label: 'Bed B', roomId: r3.id } }),
  ])

  // Mark one bed under maintenance
  await prisma.bed.update({
    where: { id: b7.id },
    data: { status: 'under_maintenance' },
  })

  console.log('🛏  Created 7 beds')

  // ── Create Tenants ────────────────────────────────────────────────────────────
  const [t1, t2, t3, t4] = await Promise.all([
    prisma.tenant.create({ data: { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '9876543210' } }),
    prisma.tenant.create({ data: { name: 'Priya Patel', email: 'priya@example.com', phone: '9123456789' } }),
    prisma.tenant.create({ data: { name: 'Arjun Mehta', email: 'arjun@example.com', phone: '9012345678' } }),
    prisma.tenant.create({ data: { name: 'Sneha Iyer', email: 'sneha@example.com', phone: '8901234567' } }),
  ])

  console.log('👤 Created 4 tenants')

  // ── Create Assignments (with proper bed status updates) ───────────────────────
  await prisma.$transaction(async (tx) => {
    // Assign Rahul → Room 101 Bed A
    await tx.tenantAssignment.create({
      data: { tenantId: t1.id, bedId: b1.id, isActive: true },
    })
    await tx.bed.update({ where: { id: b1.id }, data: { status: 'occupied' } })

    // Assign Priya → Room 101 Bed B
    await tx.tenantAssignment.create({
      data: { tenantId: t2.id, bedId: b2.id, isActive: true },
    })
    await tx.bed.update({ where: { id: b2.id }, data: { status: 'occupied' } })

    // Assign Arjun → Room 102 Bed A
    await tx.tenantAssignment.create({
      data: { tenantId: t3.id, bedId: b4.id, isActive: true },
    })
    await tx.bed.update({ where: { id: b4.id }, data: { status: 'occupied' } })

    // Sneha is unassigned — she exists but has no bed
  })

  console.log('📋 Created 3 assignments')
  console.log('')
  console.log('✅ Seed complete!')
  console.log('   Flats: 2')
  console.log('   Rooms: 3')
  console.log('   Beds: 7 (3 occupied, 3 available, 1 under maintenance)')
  console.log('   Tenants: 4 (3 assigned, 1 unassigned)')
}

main()
  .catch(e => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })