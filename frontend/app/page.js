'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { OccupancyBar } from '@/components/OccupancyBar'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Building2, BedDouble, Users, Wrench } from 'lucide-react'

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })

  if (isLoading) return <LoadingSpinner text="Loading dashboard..." />
  if (error) return <ErrorMessage message={error.displayMessage} />

  const { totals, flats } = data

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Occupancy overview across all properties"
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Building2} label="Total Flats" value={totals.totalFlats} color="blue" />
        <StatCard icon={BedDouble} label="Total Beds" value={totals.totalBeds} color="gray" />
        <StatCard icon={Users} label="Occupied" value={totals.occupiedBeds} color="red" />
        <StatCard icon={Wrench} label="Maintenance" value={totals.maintenanceBeds} color="yellow" />
      </div>

      {/* Overall Occupancy */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-500 mb-3">Overall Occupancy</h2>
        <OccupancyBar occupied={totals.occupiedBeds} total={totals.totalBeds} />
      </div>

      {/* Per-flat breakdown */}
      <div className="space-y-4">
        {flats.map(flat => (
          <div key={flat.id} className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{flat.name}</h3>
                <p className="text-sm text-gray-500">{flat.address}</p>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {flat.occupancyPercent}% occupied
              </span>
            </div>

            <OccupancyBar occupied={flat.occupiedBeds} total={flat.totalBeds} />

            {/* Room breakdown */}
            {flat.rooms.length > 0 && (
              <div className="mt-4 space-y-2">
                {flat.rooms.map(room => (
                  <div key={room.id} className="flex items-center justify-between text-sm py-2 border-t border-gray-100">
                    <span className="text-gray-600">{room.name}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 text-xs">
                        {room.totalBeds}/{room.maxCapacity} beds
                      </span>
                      <span className={`font-medium ${
                        room.occupiedBeds === room.totalBeds && room.totalBeds > 0
                          ? 'text-red-600'
                          : 'text-gray-700'
                      }`}>
                        {room.occupiedBeds} occupied
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    gray: 'bg-gray-100 text-gray-600',
    red: 'bg-red-50 text-red-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon size={18} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}