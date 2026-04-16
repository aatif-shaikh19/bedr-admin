'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { roomsApi, bedsApi, tenantsApi, assignmentsApi } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { BedStatusBadge } from '@/components/BedStatusBadge'
import { LoadingSpinner } from '@/components/LoadingSpinner'
import { ErrorMessage } from '@/components/ErrorMessage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Plus, Trash2, ArrowLeft, UserPlus, UserMinus, ArrowRightLeft, Wrench } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function RoomDetailPage() {
  const { id: flatId, roomId } = useParams()
  const queryClient = useQueryClient()

  const [addBedOpen, setAddBedOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [moveOpen, setMoveOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState(null)
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [bedLabel, setBedLabel] = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [selectedNewBedId, setSelectedNewBedId] = useState('')

  // ── Fetch room with beds ─────────────────────────────────────────────────────
  const { data: room, isLoading, error } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomsApi.getById(roomId),
  })

  // ── Fetch unassigned tenants for the assign dropdown ─────────────────────────
  const { data: allTenants = [] } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.getAll,
    enabled: assignOpen,
  })
  const unassignedTenants = allTenants.filter(t => !t.isAssigned)

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['room', roomId] })
    queryClient.invalidateQueries({ queryKey: ['flat', flatId] })
    queryClient.invalidateQueries({ queryKey: ['flats'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    queryClient.invalidateQueries({ queryKey: ['tenants'] })
  }

  const addBedMutation = useMutation({
    mutationFn: (data) => bedsApi.create(roomId, data),
    onSuccess: () => { invalidate(); setAddBedOpen(false); setBedLabel(''); toast.success('Bed added!') },
    onError: (err) => toast.error(err.displayMessage),
  })

  const deleteBedMutation = useMutation({
    mutationFn: bedsApi.delete,
    onSuccess: () => { invalidate(); toast.success('Bed deleted!') },
    onError: (err) => toast.error(err.displayMessage),
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => bedsApi.updateStatus(id, status),
    onSuccess: () => { invalidate(); toast.success('Bed status updated!') },
    onError: (err) => toast.error(err.displayMessage),
  })

  const assignMutation = useMutation({
    mutationFn: (data) => assignmentsApi.create(data),
    onSuccess: () => {
      invalidate()
      setAssignOpen(false)
      setSelectedBed(null)
      setSelectedTenantId('')
      toast.success('Tenant assigned!')
    },
    onError: (err) => toast.error(err.displayMessage),
  })

  const unassignMutation = useMutation({
    mutationFn: assignmentsApi.delete,
    onSuccess: () => { invalidate(); toast.success('Tenant unassigned!') },
    onError: (err) => toast.error(err.displayMessage),
  })

  const moveMutation = useMutation({
    mutationFn: ({ assignmentId, newBedId }) => assignmentsApi.move(assignmentId, newBedId),
    onSuccess: () => {
      invalidate()
      setMoveOpen(false)
      setSelectedAssignment(null)
      setSelectedNewBedId('')
      toast.success('Tenant moved to new bed!')
    },
    onError: (err) => toast.error(err.displayMessage),
  })

  if (isLoading) return <LoadingSpinner text="Loading room..." />
  if (error) return <ErrorMessage message={error.displayMessage} />

  const availableBedsForMove = room.beds.filter(
    b => b.status === 'available' && b.id !== selectedAssignment?.bedId
  )

  return (
    <div>
      <Link
        href={`/flats/${flatId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-4 transition-colors"
      >
        <ArrowLeft size={14} /> Back to {room.flat.name}
      </Link>

      <PageHeader
        title={room.name}
        description={`${room.flat.name} · Max capacity: ${room.maxCapacity} beds`}
        action={
          room.beds.length < room.maxCapacity ? (
            <Dialog open={addBedOpen} onOpenChange={setAddBedOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus size={16} /> Add Bed
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Bed to {room.name}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div className="space-y-1.5">
                    <Label>Bed Label</Label>
                    <Input
                      placeholder="e.g. Bed A"
                      value={bedLabel}
                      onChange={e => setBedLabel(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setAddBedOpen(false)}>Cancel</Button>
                    <Button
                      onClick={() => addBedMutation.mutate({ label: bedLabel })}
                      disabled={!bedLabel.trim() || addBedMutation.isPending}
                    >
                      {addBedMutation.isPending ? 'Adding...' : 'Add Bed'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          ) : (
            <span className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg font-medium">
              Room at capacity
            </span>
          )
        }
      />

      {/* Capacity indicator */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          {room.beds.length} of {room.maxCapacity} beds added
        </span>
        <div className="flex gap-2 text-xs">
          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
            {room.beds.filter(b => b.status === 'available').length} available
          </span>
          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            {room.beds.filter(b => b.status === 'occupied').length} occupied
          </span>
          <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
            {room.beds.filter(b => b.status === 'under_maintenance').length} maintenance
          </span>
        </div>
      </div>

      {/* Beds grid */}
      {room.beds.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <p className="text-gray-500 font-medium">No beds yet</p>
          <p className="text-gray-400 text-sm mt-1">Add beds up to the room capacity</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {room.beds.map(bed => {
            const activeAssignment = bed.assignments?.[0]
            return (
              <div key={bed.id} className="bg-white rounded-xl border border-gray-200 p-5">
                {/* Bed header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{bed.label}</span>
                    <BedStatusBadge status={bed.status} />
                  </div>
                  <button
                    onClick={() => deleteBedMutation.mutate(bed.id)}
                    disabled={bed.status === 'occupied'}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title={bed.status === 'occupied' ? 'Unassign tenant first' : 'Delete bed'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {/* Current tenant */}
                {activeAssignment ? (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3">
                    <p className="text-xs text-gray-500 mb-0.5">Current Tenant</p>
                    <p className="text-sm font-medium text-gray-900">{activeAssignment.tenant.name}</p>
                    <p className="text-xs text-gray-500">{activeAssignment.tenant.email}</p>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                    <p className="text-xs text-gray-400">No tenant assigned</p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2">
                  {bed.status === 'available' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setSelectedBed(bed)
                        setAssignOpen(true)
                      }}
                    >
                      <UserPlus size={12} className="mr-1" /> Assign
                    </Button>
                  )}

                  {bed.status === 'occupied' && activeAssignment && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => unassignMutation.mutate(activeAssignment.id)}
                        disabled={unassignMutation.isPending}
                      >
                        <UserMinus size={12} className="mr-1" /> Unassign
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setSelectedAssignment(activeAssignment)
                          setMoveOpen(true)
                        }}
                      >
                        <ArrowRightLeft size={12} className="mr-1" /> Move
                      </Button>
                    </>
                  )}

                  {bed.status === 'available' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs text-yellow-700 border-yellow-200 hover:bg-yellow-50"
                      onClick={() => updateStatusMutation.mutate({ id: bed.id, status: 'under_maintenance' })}
                    >
                      <Wrench size={12} className="mr-1" /> Maintenance
                    </Button>
                  )}

                  {bed.status === 'under_maintenance' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs text-green-700 border-green-200 hover:bg-green-50"
                      onClick={() => updateStatusMutation.mutate({ id: bed.id, status: 'available' })}
                    >
                      Mark Available
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Assign Tenant Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tenant to {selectedBed?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {unassignedTenants.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No unassigned tenants available.{' '}
                <Link href="/tenants" className="text-blue-600 underline">
                  Create a tenant first.
                </Link>
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Select Tenant</Label>
                  <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a tenant..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedTenants.map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name} · {t.phone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
                  <Button
                    disabled={!selectedTenantId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({
                      tenant_id: selectedTenantId,
                      bed_id: selectedBed.id,
                    })}
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Move Tenant Dialog */}
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Tenant to Different Bed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {availableBedsForMove.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">
                No available beds in this room to move to.
              </p>
            ) : (
              <>
                <div className="space-y-1.5">
                  <Label>Select New Bed</Label>
                  <Select value={selectedNewBedId} onValueChange={setSelectedNewBedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a bed..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBedsForMove.map(b => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.label} (available)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setMoveOpen(false)}>Cancel</Button>
                  <Button
                    disabled={!selectedNewBedId || moveMutation.isPending}
                    onClick={() => moveMutation.mutate({
                      assignmentId: selectedAssignment.id,
                      newBedId: selectedNewBedId,
                    })}
                  >
                    {moveMutation.isPending ? 'Moving...' : 'Move Tenant'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}