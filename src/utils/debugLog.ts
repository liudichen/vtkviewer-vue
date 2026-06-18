/**
 * 调试日志工具函数
 *
 * 提供受 debug 开关控制的 console.log / console.warn 封装，
 * 统一通过 ctx.config.get('debug') 或 ConfigAccessor 控制输出。
 *
 * @module utils/debugLog
 */

import type { ConfigAccessor, ViewerContext } from '@/core'

/**
 * 从 ViewerContext 或 ConfigAccessor 中提取 ConfigAccessor
 */
function getConfigAccessor(
  ctxOrConfig: ViewerContext | ConfigAccessor | null | undefined
): ConfigAccessor | null {
  if (!ctxOrConfig) return null
  // ConfigAccessor 有 get 方法但 ViewerContext 也有 config 属性
  if ('config' in ctxOrConfig) {
    return (ctxOrConfig as ViewerContext).config
  }
  // 直接传入 ConfigAccessor
  if (typeof (ctxOrConfig as ConfigAccessor).get === 'function') {
    return ctxOrConfig as ConfigAccessor
  }
  return null
}

/**
 * 调试日志（仅当 debug=true 时输出）
 * @param ctxOrConfig ViewerContext 或 ConfigAccessor
 * @param args 日志参数（同 console.log）
 */
export function debugLog(
  ctxOrConfig: ViewerContext | ConfigAccessor | null | undefined,
  ...args: any[]
): void {
  const config = getConfigAccessor(ctxOrConfig) as any
  if (config?.debug ?? config?.get?.('debug')) {
    console.log(...args)
  }
}

/**
 * 调试警告（仅当 debug=true 时输出）
 * @param ctxOrConfig ViewerContext 或 ConfigAccessor
 * @param args 警告参数（同 console.warn）
 */
export function debugWarn(
  ctxOrConfig: ViewerContext | ConfigAccessor | null | undefined,
  ...args: any[]
): void {
  const config = getConfigAccessor(ctxOrConfig) as any
  if (config?.debug ?? config?.get?.('debug')) {
    console.warn(...args)
  }
}
