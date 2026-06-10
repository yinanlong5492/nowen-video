import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'
import { useIsAdmin } from './useIsAdmin'

export interface DetailPageContext {
  navigate: ReturnType<typeof useNavigate>
  toast: ReturnType<typeof useToast>
  t: ReturnType<typeof useTranslation>['t']
  isAdmin: boolean
}

export function useDetailPageContext(): DetailPageContext {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const isAdmin = useIsAdmin()

  return {
    navigate,
    toast,
    t,
    isAdmin,
  }
}