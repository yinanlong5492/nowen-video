import { useCallback } from 'react'
import { useToast } from '@/components/Toast'
import { useTranslation } from '@/i18n'

export interface ApiErrorHandler {
  handleError: <T>(error: unknown, defaultMessage?: string) => T | undefined
  wrapApiCall: <T>(fn: () => Promise<T>, successMessage?: string, errorMessage?: string) => Promise<T | undefined>
}

export function useApiErrorHandler(): ApiErrorHandler {
  const toast = useToast()
  const { t } = useTranslation()

  const handleError = useCallback(<T>(error: unknown, defaultMessage?: string): T | undefined => {
    console.error('API Error:', error)

    let errorMessage = defaultMessage || t('common.error.default')

    // 根据错误类型提取消息
    if (error instanceof Error) {
      errorMessage = error.message || errorMessage
    } else if (typeof error === 'object' && error !== null) {
      const errObj = error as Record<string, unknown>
      errorMessage = String(errObj.message || errObj.error || errorMessage)
    } else if (typeof error === 'string') {
      errorMessage = error
    }

    toast.error(errorMessage)
    return undefined
  }, [toast, t])

  const wrapApiCall = useCallback(async <T>(
    fn: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | undefined> => {
    try {
      const result = await fn()
      if (successMessage) {
        toast.success(successMessage)
      }
      return result
    } catch (error) {
      return handleError(error, errorMessage)
    }
  }, [handleError, toast])

  return {
    handleError,
    wrapApiCall,
  }
}