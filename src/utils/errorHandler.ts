/**
 * 错误处理工具函数
 * 提供统一的错误捕获、分类和上报机制
 */

/** VTK 标准化错误对象 */
export interface VtkError {
  type: string
  message: string
  severity: string
  recoverable: boolean
  details?: any
  code?: string
  [key: string]: any
}

/** 错误严重级别 */
export type ErrorSeverity = 'info' | 'warning' | 'error' | 'fatal'

/** 标准化错误对象 */
export function normalizeError(error: unknown): VtkError {
  if (error && typeof error === 'object' && 'type' in error) {
    return error as VtkError
  }

  if (error instanceof Error) {
    // 根据错误类型自动分类
    let type = 'unknown'
    if (error.name === 'TypeError') type = 'type'
    else if (error.name === 'RangeError') type = 'range'
    else if (error.message.includes('network') || error.message.includes('fetch')) type = 'network'
    else if (error.message.includes('memory')) type = 'memory'
    else if (error.message.includes('webgl') || error.message.includes('context')) type = 'webgl'

    return {
      type,
      message: error.message,
      severity: 'error',
      recoverable: false,
      originalError: error
    }
  }

  return {
    type: 'unknown',
    message: String(error),
    severity: 'error',
    recoverable: false
  }
}

/** 包装异步函数，捕获错误 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: (error: VtkError) => void
): T {
  return ((...args: any[]) => {
    return fn(...args).catch((error: unknown) => {
      const vtkError = normalizeError(error)
      onError?.(vtkError)
      throw vtkError
    })
  }) as T
}

/** 安全执行函数，不抛出错误 */
export function safeExecute<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch {
    return fallback
  }
}

/** 格式化错误消息 */
export function formatErrorMessage(error: VtkError): string {
  const parts: string[] = []

  if (error.severity) {
    const icons: Record<ErrorSeverity, string> = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '❌',
      fatal: '💀'
    }
    parts.push(icons[error.severity as ErrorSeverity] || '❌')
  }

  if (error.type) {
    parts.push(`[${error.type}]`)
  }

  if (error.message) {
    parts.push(error.message)
  }

  return parts.join(' ') || '发生未知错误'
}

/** 判断错误是否可恢复 */
export function isRecoverable(error: VtkError): boolean {
  if (error.recoverable !== undefined) {
    return error.recoverable
  }

  // 默认可恢复的错误类型
  const recoverableTypes = ['network', 'timeout', 'webgl', 'context-lost']
  return recoverableTypes.includes(error.type)
}

/** 创建带上下文的错误 */
export function createError(type: string, message: string, options?: Partial<VtkError>): VtkError {
  return {
    type,
    message,
    severity: 'error',
    recoverable: false,
    ...options
  }
}
