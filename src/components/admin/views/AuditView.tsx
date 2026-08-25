'use client'

import { useEffect, useState } from 'react'
import { History } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import type { AuditLogT } from '@/lib/types'

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-50 text-emerald-700',
  update: 'bg-amber-50 text-amber-700',
  delete: 'bg-red-50 text-red-700',
  role_change: 'bg-purple-50 text-purple-700',
  approve: 'bg-emerald-50 text-emerald-700',
  reject: 'bg-red-50 text-red-700',
}

function actionVerb(action: string): { verb: string; color: string } {
  if (action.endsWith('.create')) return { verb: 'create', color: ACTION_COLORS.create }
  if (action.endsWith('.update')) return { verb: 'update', color: ACTION_COLORS.update }
  if (action.endsWith('.delete')) return { verb: 'delete', color: ACTION_COLORS.delete }
  if (action.includes('role_change')) return { verb: 'role_change', color: ACTION_COLORS.role_change }
  if (action.endsWith('.approve')) return { verb: 'approve', color: ACTION_COLORS.approve }
  if (action.endsWith('.reject')) return { verb: 'reject', color: ACTION_COLORS.reject }
  return { verb: action, color: 'bg-ink-50 text-ink-600' }
}

export function AuditView() {
  const [logs, setLogs] = useState<AuditLogT[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api<AuditLogT[]>('/api/audit?limit=100')
      .then(setLogs)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink-900 sm:text-2xl">Audit Log</h1>
        <p className="text-sm text-ink-400">
          Last {logs.length} actions (read-only).
        </p>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-ink-100 bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-medium">Timestamp</th>
                <th className="px-4 py-3 font-medium">Actor</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Entity</th>
                <th className="px-4 py-3 font-medium">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-ink-400">Loading...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center">
                    <History size={36} className="mx-auto mb-2 text-ink-200" />
                    <p className="text-sm text-ink-400">No audit entries yet.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const v = actionVerb(log.action)
                  const entity = log.action.split('.')[0]
                  return (
                    <tr key={log.id} className="hover:bg-ink-50/50 align-top">
                      <td className="px-4 py-3 text-xs text-ink-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink-900">
                          {log.actor?.email || 'System'}
                        </p>
                        {log.actor?.fullName && (
                          <p className="text-xs text-ink-400">{log.actor.fullName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={v.color}>{log.action}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs capitalize text-ink-600">{entity}</p>
                        {log.entityId && (
                          <code className="text-[10px] text-ink-400">
                            {log.entityId.slice(-8)}
                          </code>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <pre className="max-w-xs overflow-x-auto rounded bg-ink-50 p-2 text-[10px] text-ink-600">
                            {JSON.stringify(log.metadata, null, 2)}
                          </pre>
                        ) : (
                          <span className="text-ink-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
