/**
 * 主题上下文
 * 管理查看器的主题状态，作为单一数据源
 * 所有插件通过 ctx.theme 访问和修改主题
 */

import type { Ref } from 'vue'

import { getThemeManager, ThemeManager } from '@/utils'

import { i18n } from './I18nManager'
import type { ThemeConfig } from './ViewerContext'

/**
 * 主题上下文接口
 * 所有插件通过此接口访问和修改主题状态
 */
export interface ThemeContext {
  /** 当前主题 ID（响应式） */
  readonly currentThemeId: Ref<string>

  /** 切换主题（只更新状态，DOM 操作由 VtkViewer 监听后执行） */
  setTheme(themeId: string): void

  /** 获取主题配置 */
  getTheme(themeId: string): ThemeConfig | undefined

  /** 获取所有已注册的主题 */
  getAllThemes(): Record<string, ThemeConfig>
}

/**
 * ThemeContext 实现类
 * 注意：
 * 1. currentThemeId ref 由外部（VtkViewer）创建并传入
 * 2. 此类不负责 DOM 操作，DOM 操作由 VtkViewer 监听状态变化后执行
 */
export class ThemeContextImpl implements ThemeContext {
  private themeManager: ThemeManager

  /** 当前主题 ID（响应式，由外部传入） */
  readonly currentThemeId: Ref<string>

  constructor(currentThemeId: Ref<string>) {
    this.themeManager = getThemeManager()
    this.currentThemeId = currentThemeId
  }

  /**
   * 切换主题（只更新状态，不操作 DOM）
   * DOM 操作由 VtkViewer 监听 currentThemeId 变化后执行
   */
  setTheme(themeId: string): void {
    if (themeId === this.currentThemeId.value) return

    // 验证主题是否存在
    const theme = this.themeManager.getTheme(themeId)
    if (!theme) {
      console.warn(`[ThemeContext] ${i18n.translate('vtkviewer.theme.notRegistered')}: ${themeId}"`)
      return
    }

    this.currentThemeId.value = themeId
  }

  /** 获取主题配置 */
  getTheme(themeId: string): ThemeConfig | undefined {
    return this.themeManager.getTheme(themeId)
  }

  /** 获取所有已注册的主题 */
  getAllThemes(): Record<string, ThemeConfig> {
    return this.themeManager.getAllThemes()
  }
}
