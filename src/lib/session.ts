import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import type { User } from "@prisma/client"

export async function getCurrentUser(): Promise<(User & { role: string }) | null> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return null
  return db.user.findUnique({ where: { id: session.user.id } }) as Promise<(User & { role: string }) | null>
}
export async function requireRole(roles: string[]) {
  const user = await getCurrentUser()
  if (!user || !roles.includes(user.role)) return null
  return user
}
export async function requireAdminOrStaff() { return requireRole(["admin", "staff"]) }
