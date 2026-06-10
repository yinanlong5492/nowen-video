import { useAuthStore } from '@/stores/auth'

export function useIsAdmin() {
  const user = useAuthStore((s) => s.user)
  return user?.role === 'admin'
}