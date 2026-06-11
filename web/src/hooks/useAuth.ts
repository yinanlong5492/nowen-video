import { useAuthStore } from '@/stores/auth'

export function usePermissions() {
  const user = useAuthStore((s) => s.user)
  
  const isAdmin = user?.role === 'admin'
  const isUser = !!user
  const canEdit = isAdmin
  const canDelete = isAdmin
  const canMatch = isAdmin
  const canRefreshMetadata = isAdmin
  const canManageLibrary = isAdmin
  
  return {
    user,
    isAdmin,
    isUser,
    canEdit,
    canDelete,
    canMatch,
    canRefreshMetadata,
    canManageLibrary
  }
}

export function useIsAdmin() {
  const { isAdmin } = usePermissions()
  return isAdmin
}