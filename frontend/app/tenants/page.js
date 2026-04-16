'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantsApi } from '@/lib/api'
import { PageHeader } from '@/components/PageHeader'
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
import { Plus, Trash2, Users, MapPin } from 'lucide-react'
import { toast } from 'sonner'

export default function TenantsPage() {
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '' })

  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ['tenants'],
    queryFn: tenantsApi.getAll,
  })

  const createMutation = useMutation({
    mutationFn: tenantsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setCreateOpen(false)
      setForm({ name: '', email: '', phone: '' })
      toast.success('Tenant created!')
    },
    onError: (err) => toast.error(err.displayMessage),
  })

  const deleteMutation = useMutation({
    mutationFn: tenantsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDeleteTarget(null)
      toast.success('Tenant deleted!')
    },
    onError: (err) => {
      setDeleteTarget(null)
      toast.error(err.displayMessage)
    },
  })

  if (isLoading) return <LoadingSpinner text="Loading tenants..." />
  if (error) return <ErrorMessage message={error.displayMessage} />

  const assigned = tenants.filter(t => t.isAssigned).length

  return (
    <div>
      <PageHeader
        title="Tenants"
        description={`${tenants.length} total · ${assigned} assigned · ${tenants.length - assigned} unassigned`}
        action={
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus size={16} /> Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Tenant</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={e => { e.preventDefault(); createMutation.mutate(form) }}
                className="space-y-4 mt-2"
              >
                <div className="space-y-1.5">
                  <Label>Full Name</Label>
                  <Input
                    placeholder="e.g. Rahul Sharma"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    placeholder="e.g. rahul@example.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input
                    placeholder="e.g. 9876543210"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Tenant'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      {tenants.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Users size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No tenants yet</p>
          <p className="text-gray-400 text-sm mt-1">Add your first tenant to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map(tenant => (
            <div
              key={tenant.id}
              className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-blue-700 font-semibold text-sm">
                  {tenant.name.charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-900">{tenant.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    tenant.isAssigned
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {tenant.isAssigned ? 'Assigned' : 'Unassigned'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">{tenant.email} · {tenant.phone}</p>
                {tenant.currentAssignment && (
                  <div className="flex items-center gap-1 mt-1">
                    <MapPin size={11} className="text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {tenant.currentAssignment.flatName} →{' '}
                      {tenant.currentAssignment.roomName} →{' '}
                      {tenant.currentAssignment.bedLabel}
                    </span>
                  </div>
                )}
              </div>

              {/* Delete */}
              <button
                onClick={() => setDeleteTarget(tenant)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tenant</DialogTitle>
          </DialogHeader>
          <div className="mt-2 space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900">{deleteTarget?.name}</span>?
            </p>
            {deleteTarget?.isAssigned && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ⚠ This tenant is currently assigned to a bed. Unassign them first.
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
              <Button
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}