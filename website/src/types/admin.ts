export type AdminRole = 'user' | 'support' | 'admin' | 'super_admin'

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  user: 'Usuário',
  support: 'Suporte',
  admin: 'Admin',
  super_admin: 'Super Admin'
}

export interface AdminMe {
  userId: string
  role: AdminRole
  email: string | null
  displayName: string | null
  publicUserId: string | null
}
