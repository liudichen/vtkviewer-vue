/**
 * 插件状态重置管理器
 * 统一调度入口，纯粹委托 ResetRegistry 执行
 *
 * 职责边界：
 *   ResetManager — 对外 API（resetAll / invoke / invokeByScope）、防抖、事件广播、报告生成
 *   ResetRegistry — 内部索引（动作收集、作用域过滤、守卫检查、链式触发）
 */

import { BuiltinEvents } from '@/configs'

import type { EventBus } from './EventBus'
import { i18n } from './I18nManager'
import { ResetScope, type ResetRegistry } from './ResetRegistry'

// ============================================================
// 1. 共享类型
// ============================================================

/** 重置级别 */
export enum ResetLevel {
  /** 软重置：仅重置插件内部状态，保留配置 */
  SOFT = 'soft',
  /** 硬重置：重置所有状态，恢复默认配置 */
  HARD = 'hard',
  /** 完全重置：重置状态并重新初始化 */
  FULL = 'full'
}

/** 重置上下文 */
export interface ResetContext {
  /** 重置级别 */
  level: ResetLevel
  /** 触发重置的来源 */
  source: string
  /** 重置时间戳 */
  timestamp: number
  /** 额外参数 */
  params?: Record<string, any>
}

/** 重置结果 */
export interface ResetResult {
  /** 插件 ID */
  pluginId: string
  /** 是否成功 */
  success: boolean
  /** 耗时（毫秒） */
  duration: number
  /** 错误信息 */
  error?: Error
}

/** 重置报告 */
export interface ResetReport {
  /** 总插件数 */
  total: number
  /** 成功数 */
  succeeded: number
  /** 失败数 */
  failed: number
  /** 跳过数（未实现重置） */
  skipped: number
  /** 总耗时（毫秒） */
  totalDuration: number
  /** 各插件结果 */
  results: ResetResult[]
}

// ============================================================
// 2. 重置管理器配置
// ============================================================

/** 重置管理器配置 */
export interface ResetManagerConfig {
  /** 单个插件重置超时时间（毫秒） */
  pluginTimeout: number
  /** 是否在单个插件失败时继续执行 */
  continueOnError: boolean
  /** 是否记录详细日志 */
  verbose: boolean
  /** 重置前延迟（毫秒），用于防抖 */
  debounceMs: number
}

const DEFAULT_CONFIG: ResetManagerConfig = {
  pluginTimeout: 5000,
  continueOnError: true,
  verbose: false,
  debounceMs: 0
}

// ============================================================
// 3. 重置管理器实现
// ============================================================

/**
 * 重置管理器
 * 对外提供统一的重置 API，内部完全委托 ResetRegistry
 */
export class ResetManager {
  private config: ResetManagerConfig
  private eventBus: EventBus
  private resetRegistry: ResetRegistry
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(
    eventBus: EventBus,
    resetRegistry: ResetRegistry,
    config?: Partial<ResetManagerConfig>
  ) {
    this.eventBus = eventBus
    this.resetRegistry = resetRegistry
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  // ============================================================
  // 公开 API
  // ============================================================

  /**
   * 执行全局重置
   * 只执行 scope 包含 GLOBAL 的动作，INDEPENDENT 动作不受影响
   */
  async resetAll(
    level: ResetLevel = ResetLevel.SOFT,
    source: string = 'user',
    params?: Record<string, any>
  ): Promise<ResetReport> {
    if (this.config.debounceMs > 0) {
      return this.debounceReset(level, source, params)
    }
    return this.executeReset(level, source, params)
  }

  /**
   * 精准触发指定插件的指定重置动作
   * 与全局 resetAll 完全解耦
   *
   * @param pluginId 目标插件 ID
   * @param actionName 动作名称（省略则使用默认动作）
   * @param level 重置级别
   * @param source 触发来源
   *
   * @example
   * // 清除测量数据（不触发全局重置）
   * resetManager.invoke('measurement', 'clear')
   *
   * // 使用插件默认动作
   * resetManager.invoke('cuttingPlane')
   */
  async invoke(
    pluginId: string,
    actionName?: string,
    level: ResetLevel = ResetLevel.SOFT,
    source: string = 'direct'
  ): Promise<ResetResult> {
    return this.resetRegistry.invoke(pluginId, actionName, level, source)
  }

  /**
   * 按作用域批量触发重置
   *
   * @example
   * // 清理所有"非全局"的插件状态（如切换模型时）
   * resetManager.invokeByScope(ResetScope.INDEPENDENT)
   */
  async invokeByScope(
    scope: ResetScope,
    level: ResetLevel = ResetLevel.SOFT,
    source: string = 'scope'
  ): Promise<ResetResult[]> {
    return this.resetRegistry.invokeByScope(scope, level, source)
  }

  /**
   * 获取指定插件的所有可用重置动作
   * 用于 UI 展示"可重置"菜单
   */
  getAvailableActions(
    pluginId: string
  ): Array<{ name: string; description?: string; scope: ResetScope }> {
    return this.resetRegistry.getActions(pluginId).map(a => ({
      name: a.name,
      description: a.description,
      scope: a.scope
    }))
  }

  /**
   * 获取所有已注册重置动作的插件列表
   */
  getResettablePluginIds(): string[] {
    return this.resetRegistry.getRegisteredPluginIds()
  }

  // ============================================================
  // 内部实现
  // ============================================================

  /**
   * 执行重置（带防抖）
   */
  private debounceReset(
    level: ResetLevel,
    source: string,
    params?: Record<string, any>
  ): Promise<ResetReport> {
    return new Promise(resolve => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer)
      }
      this.debounceTimer = setTimeout(async () => {
        const report = await this.executeReset(level, source, params)
        resolve(report)
      }, this.config.debounceMs)
    })
  }

  /**
   * 执行实际重置逻辑
   * 通过 ResetRegistry 执行所有全局作用域动作
   */
  private async executeReset(
    level: ResetLevel,
    source: string,
    params?: Record<string, any>
  ): Promise<ResetReport> {
    const startTime = performance.now()
    const context: ResetContext = {
      level,
      source,
      timestamp: Date.now(),
      params
    }

    // 1. 广播重置开始事件
    this.eventBus.emit(BuiltinEvents.RESET_START, context)

    // 2. 通过 ResetRegistry 执行全局作用域动作
    const globalActions = this.resetRegistry.getGlobalResetActions()
    const results: ResetResult[] = []

    for (const entry of globalActions) {
      const result = await this.resetRegistry.invoke(
        entry.pluginId,
        entry.action.name,
        level,
        source
      )
      results.push(result)

      // 遇错停止
      if (!result.success && !this.config.continueOnError) {
        console.error(
          `[ResetManager] ${i18n.translate('vtkviewer.reset.stoppingDueToFailure')}${entry.key}"`
        )
        break
      }
    }

    // 3. 构建报告
    const succeeded = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalRegistered = this.resetRegistry.getRegisteredPluginIds().length

    const report: ResetReport = {
      total: results.length,
      succeeded,
      failed,
      skipped: totalRegistered - results.length,
      totalDuration: performance.now() - startTime,
      results
    }

    // 4. 广播重置完成事件
    this.eventBus.emit(BuiltinEvents.RESET_COMPLETE, report)

    // 5. 记录日志
    if (this.config.verbose) {
      console.log(`[ResetManager] Reset complete:`, report)
    }

    return report
  }
}
