'use client'

import { useEffect, useState } from 'react'
import { Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { api } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import type { UserT, Role } from '@/lib/types'

const ROLE_COLORS: Record<Role, string> = {
  admin: 'bg-brand-50 text-brand-700',
  staff: 'bg-emerald-50 text-emerald-700',
  customer: 'bg-ink-50 text-ink-600',
}

const ROLES: Role[] = ['customer', 'staff', 'admin']

export function UsersView() {
  const { toast } = useToast()
  const [users, setUsers] = useState<UserT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<UserT[]>('/api/users')
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  async function changeRole(id: string, role: Role) {
    try {
      await api('/api/users', {
        method: 'PATCH',
        body: JSON.stringify({ id, role }),
      })
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
      toast({ title: `Role changed to ${role}` })
    } catch (e: any) {
      toast({ title: e.message || 'Failed', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Users</h1>
        <p className="text-sm text-ink-400">{users.length} users</p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name / Email</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center">
                    <Users size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No users found.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-ink-50/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink-900">{u.fullName || 'Unnamed'}</p>
                      <p className="text-xs text-ink-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-ink-600">
                      {u.phone || <span className="text-ink-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={u.role} onValueChange={(v) => changeRole(u.id, v as Role)}>
                        <SelectTrigger className="h-8 w-32 border-0 bg-transparent p-0 hover:bg-ink-100">
                          <Badge className={ROLE_COLORS[u.role]}>{u.role}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((r) => (
                            <SelectItem key={r} value={r} className="capitalize">
                              {r}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-400">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
