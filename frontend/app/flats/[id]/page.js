'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { flatsApi, roomsApi } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { OccupancyBar } from '@/components/OccupancyBar'
import { BedStatusBadge } from '@/components/BedStatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, ChevronRight, ArrowLeft, DoorOpen } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function FlatDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', max_capacity: '' })

  // ── Fetch flat with rooms ────────────────────────────────────────────────────
  const { data: flat, isLoading, error } = useQuery({
    queryKey: ['flat', id],
    queryFn: () => flatsApi.getById(id),
  })

  // ── Create room ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data) => roomsApi.create(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flat', id] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      setCreateOpen(false)
      setForm({ name: '', max_capacity: '' })
      toast.success('Room created successfully!')
    },
    onError: (err) => toast.error(err.displayMessage),
  })

  // ── Delete room ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flat', id] })
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      setDeleteTarget(null)
      toast.success('Room deleted successfully!')
    },
    onError: (err) => {
      setDeleteTarget(null)
      toast.error(err.displayMessage)
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  if (isLoading) return <LoadingSpinner text="Loading flat..." />
  if (error) return <ErrorMessage message={error.displayMessage} />

  const totalBeds = flat.rooms.reduce((s, r) => s + r.beds.length, 0)
  const occupiedBeds = flat.rooms.reduce(
    (s, r) => s + r.beds.filter(b => b.status === 'occupied').length, 0
  )

  return (
    <div>
      {/* Back button */}
      <Link href="/flats" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors">
        <ArrowLeft size={14} /> Back to Flats
      </Link>

      <PageHeader
        title={flat.name}
        description={flat.address}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Room to {flat.name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Room Name</Label>
                  <Input
                    placeholder="e.g. Room 101"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Max Bed Capacity</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="e.g. 3"
                    value={form.max_capacity}
                    onChange={e => setForm(f => ({ ...f, max_capacity: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Room'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Flat summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-500">Overall Occupancy</span>
          <span className="text-sm text-gray-700">{flat.rooms.length} rooms · {totalBeds} beds</span>
        </div>
        <OccupancyBar occupied={occupiedBeds} total={totalBeds} />
      </div>

      {/* Rooms list */}
      {flat.rooms.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <DoorOpen size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No rooms yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first room to this flat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flat.rooms.map(room => {
            const roomOccupied = room.beds.filter(b => b.status === 'occupied').length
            return (
              <div key={room.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-gray-900">{room.name}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        room.beds.length >= room.maxCapacity
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {room.beds.length}/{room.maxCapacity} beds
                      </span>
                    </div>

                    <div className="mb-3">
                      <OccupancyBar occupied={roomOccupied} total={room.beds.length} />
                    </div>

                    {/* Bed status pills */}
                    {room.beds.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {room.beds.map(bed => (
                          <div key={bed.id} className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-500">{bed.label}</span>
                            <BedStatusBadge status={bed.status} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setDeleteTarget(room)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                    <Link href={`/flats/${id}/rooms/${room.id}`}>
                      <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <ChevronRight size={15} />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete Room Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Room'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}