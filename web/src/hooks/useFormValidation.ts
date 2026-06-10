import { useState, useCallback } from 'react'

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export interface FormValidator<T> {
  validate: (form: T) => ValidationResult
  validateField: (fieldName: keyof T, value: unknown) => string | undefined
  errors: Record<string, string>
  setErrors: (errors: Record<string, string>) => void
  clearErrors: () => void
}

export function useFormValidation<T extends Record<string, unknown>>(): FormValidator<T> {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateField = useCallback((fieldName: keyof T, value: unknown): string | undefined => {
    // 基本验证规则
    if (value === undefined || value === null || value === '') {
      return '此字段为必填项'
    }

    // 数字验证
    if (typeof value === 'number') {
      if (isNaN(value)) {
        return '请输入有效数字'
      }
    }

    // 字符串长度验证
    if (typeof value === 'string') {
      if (value.length > 500) {
        return '输入内容过长'
      }
    }

    return undefined
  }, [])

  const validate = useCallback((form: T): ValidationResult => {
    const newErrors: Record<string, string> = {}

    for (const [key, value] of Object.entries(form)) {
      const error = validateField(key as keyof T, value)
      if (error) {
        newErrors[key] = error
      }
    }

    setErrors(newErrors)

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    }
  }, [validateField])

  const clearErrors = useCallback(() => {
    setErrors({})
  }, [])

  return {
    validate,
    validateField,
    errors,
    setErrors,
    clearErrors,
  }
}

// 元数据表单专用验证
export interface MetadataFormData {
  title: string
  orig_title: string
  year: number
  overview: string
  rating: number
  genres: string
  country: string
  language: string
  tagline: string
  studio: string
}

export function useMetadataFormValidation(): FormValidator<MetadataFormData> {
  const { validate: baseValidate, validateField: baseValidateField, errors, setErrors, clearErrors } = useFormValidation<MetadataFormData>()

  const validateField = useCallback((fieldName: keyof MetadataFormData, value: unknown): string | undefined => {
    // 使用基础验证
    const baseError = baseValidateField(fieldName, value)
    if (baseError) return baseError

    // 特定字段验证
    switch (fieldName) {
      case 'year':
        if (typeof value === 'number' && (value < 1900 || value > new Date().getFullYear() + 5)) {
          return '请输入有效的年份'
        }
        break
      case 'rating':
        if (typeof value === 'number' && (value < 0 || value > 10)) {
          return '评分必须在 0-10 之间'
        }
        break
    }

    return undefined
  }, [baseValidateField])

  const validate = useCallback((form: MetadataFormData): ValidationResult => {
    const newErrors: Record<string, string> = {}

    for (const [key, value] of Object.entries(form)) {
      const error = validateField(key as keyof MetadataFormData, value)
      if (error) {
        newErrors[key] = error
      }
    }

    setErrors(newErrors)

    return {
      isValid: Object.keys(newErrors).length === 0,
      errors: newErrors,
    }
  }, [validateField, setErrors])

  return {
    validate,
    validateField,
    errors,
    setErrors,
    clearErrors,
  }
}