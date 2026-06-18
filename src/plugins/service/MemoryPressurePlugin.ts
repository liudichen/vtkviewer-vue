/**
 * 内存压力管理插件
 * 监控JavaScript堆内存，提供三级压力评估和自动清理
 */

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { PluginType, type PluginConfig, type IServicePlugin } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** 内存压力等级 */
export type MemoryPressureLevel = 'normal' | 'warning' | 'danger'

/** 内存压力配置 */
export interface MemoryPressurePluginConfig extends PluginConfig {
  /** 警告阈值（MB） */
  warningThresholdMB?: number
  /** 危险阈值（MB） */
  dangerThresholdMB?: number
  /** 监控间隔（ms） */
  checkInterval?: number
}

/** 内存统计信息 */
export interface MemoryStats {
  usedMB: number
  totalMB: number
  limitMB: number
  pressureLevel: MemoryPressureLevel
}

/**
 * 内存压力管理插件
 * 使用 performance.memory API 监控JavaScript堆内存
 * 提供三级压力评估：normal/warning/danger
 */
export class MemoryPressurePlugin
  extends PluginBase<MemoryPressurePluginConfig>
  implements IServicePlugin
{
  readonly metadata = {
    id: 'memory-pressure',
    name: 'MemoryPressurePlugin',
    type: PluginType.SERVICE,
    description: i18n.translate('vtkviewer.plugin.memoryPressure.description')
  }

  readonly defaultConfig: MemoryPressurePluginConfig = {
    enabled: true,
    warningThresholdMB: 400,
    dangerThresholdMB: 500,
    checkInterval: 5000
  }

  private checkTimer: ReturnType<typeof setInterval> | null = null
  private currentLevel: MemoryPressureLevel = 'normal'

  protected onInit(): void {
    if (this.config.enabled) {
      this.startMonitoring()
    }
  }

  /**
   * 开始内存监控
   */
  private startMonitoring(): void {
    this.checkTimer = setInterval(() => {
      this.checkMemory()
    }, this.config.checkInterval)
  }

  /**
   * 检查内存使用情况
   */
  private checkMemory(): void {
    const memoryInfo = (performance as any).memory
    if (!memoryInfo) {
      // performance.memory 不可用（非Chrome浏览器）
      return
    }

    const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024)
    const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024)

    const stats: MemoryStats = {
      usedMB,
      totalMB: limitMB,
      limitMB,
      pressureLevel: this.calculatePressureLevel(usedMB)
    }

    // 压力等级变化时触发事件
    if (stats.pressureLevel !== this.currentLevel) {
      const prevLevel = this.currentLevel
      this.currentLevel = stats.pressureLevel

      this.ctx.events.emit(BuiltinEvents.MEMORY_PRESSURE_CHANGED, {
        level: stats.pressureLevel,
        previousLevel: prevLevel,
        stats
      })

      this.debugLog(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.memoryPressure.levelChanged')}: ${prevLevel} → ${stats.pressureLevel} (${usedMB.toFixed(1)}MB)`
      )
    }

    // 根据压力等级执行清理
    if (stats.pressureLevel === 'danger') {
      this.performAggressiveCleanup()
    } else if (stats.pressureLevel === 'warning') {
      this.performConservativeCleanup()
    }
  }

  /**
   * 计算压力等级
   */
  private calculatePressureLevel(usedMB: number): MemoryPressureLevel {
    if (usedMB >= (this.config.dangerThresholdMB ?? 500)) {
      return 'danger'
    }
    if (usedMB >= (this.config.warningThresholdMB ?? 400)) {
      return 'warning'
    }
    return 'normal'
  }

  /**
   * 保守清理策略
   * 清理未使用纹理、不可见几何体
   */
  private performConservativeCleanup(): void {
    this.debugLog(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.memoryPressure.conservativeCleanup')}`
    )
    // 保守清理：通知各插件清理非必要资源
    this.ctx.events.emit(BuiltinEvents.MEMORY_CLEANUP, { level: 'conservative' })
  }

  /**
   * 激进清理策略
   * 清理所有缓存、强制GC
   */
  private performAggressiveCleanup(): void {
    this.debugLog(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.memoryPressure.aggressiveCleanup')}`
    )
    // 激进清理：通知各插件清理所有可清理资源
    this.ctx.events.emit(BuiltinEvents.MEMORY_CLEANUP, { level: 'aggressive' })

    // 尝试触发垃圾回收（仅在支持的环境中）
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        ;(window as any).gc()
      } catch {
        // gc 不可用
      }
    }
  }

  /**
   * 获取当前内存统计
   */
  getStats(): MemoryStats | null {
    const memoryInfo = (performance as any).memory
    if (!memoryInfo) return null

    const usedMB = memoryInfo.usedJSHeapSize / (1024 * 1024)
    const limitMB = memoryInfo.jsHeapSizeLimit / (1024 * 1024)

    return {
      usedMB,
      totalMB: limitMB,
      limitMB,
      pressureLevel: this.currentLevel
    }
  }

  /**
   * 获取当前压力等级
   */
  getPressureLevel(): MemoryPressureLevel {
    return this.currentLevel
  }

  protected onDispose(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer)
      this.checkTimer = null
    }
  }
}
