'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { flatsApi } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
import { OccupancyBar } from '@/components/OccupancyBar'
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
import { Plus, Trash2, ChevronRight, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function FlatsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null) // flat object to delete
  const [form, setForm] = useState({ name: '', address: '' })

  // ── Fetch all flats ──────────────────────────────────────────────────────────
  const { data: flats = [], isLoading, error } = useQuery({
    queryKey: ['flats'],
    queryFn: flatsApi.getAll,
  })

  // ── Create flat ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: flatsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setCreateOpen(false)
      setForm({ name: '', address: '' })
      toast.success('Flat created successfully!')
    },
    onError: (err) => toast.error(err.displayMessage),
  })

  // ── Delete flat ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: flatsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setDeleteTarget(null)
      toast.success('Flat deleted successfully!')
    },
    onError: (err) => {
      setDeleteTarget(null)
      toast.error(err.displayMessage)
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.address.trim()) return
    createMutation.mutate(form)
  }

  if (isLoading) return <LoadingSpinner text="Loading flats..." />
  if (error) return <ErrorMessage message={error.displayMessage} />

  return (
    <div>
      <PageHeader
        title="Flats"
        description="Manage all your properties"
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> Add Flat
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Flat</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Flat Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Sunrise Apartments"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    placeholder="e.g. 123 MG Road, Bengaluru"
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Flat'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {/* Flats List */}
      {flats.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No flats yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first flat to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {flats.map(flat => (
            <div
              key={flat.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              {/* Icon */}
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                <Building2 size={20} className="text-blue-600" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{flat.name}</h3>
                  <span className="text-sm text-gray-500 ml-4 shrink-0">
                    {flat.roomCount} room{flat.roomCount !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate mb-2">{flat.address}</p>
                <OccupancyBar
                  occupied={flat.occupiedBeds}
                  total={flat.totalBeds}
                  showLabel={flat.totalBeds > 0}
                />
                {flat.totalBeds === 0 && (
                  <p className="text-xs text-gray-400">No beds added yet</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setDeleteTarget(flat)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete flat"
                >
                  <Trash2 size={16} />
                </button>
                <Link href={`/flats/${flat.id}`}>
                  <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Flat</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-gray-600 text-sm">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
              This will also delete all rooms and beds inside it.
            </p>
            {deleteTarget?.occupiedBeds > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠ This flat has{' '}
                <strong>{deleteTarget.occupiedBeds} active tenant assignment(s)</strong>.
                You must unassign all tenants before deleting.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Flat'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}