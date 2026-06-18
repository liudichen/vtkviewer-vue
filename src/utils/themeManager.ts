/**
 * 主题管理器
 * 集中管理内置主题和自定义主题，提供统一的主题访问和应用接口
 */

import type { ThemeConfig } from '@/core'

/**
 * 主题管理器类
 * 负责合并、查询和应用主题
 */
export class ThemeManager {
  /** 内置主题 */
  private builtinThemes: Record<string, ThemeConfig> = {}

  /** 自定义主题（优先级高于内置主题） */
  private customThemes: Record<string, ThemeConfig> = {}

  /**
   * 注册内置主题
   * @param themes 内置主题配置映射
   */
  registerBuiltinThemes(themes: Record<string, ThemeConfig>): void {
    this.builtinThemes = { ...themes }
  }

  /**
   * 设置自定义主题
   * @param themes 自定义主题配置映射（会与内置主题合并，同名覆盖）
   */
  setCustomThemes(themes: Record<string, ThemeConfig>): void {
    this.customThemes = { ...themes }
  }

  /**
   * 添加单个自定义主题
   * @param id 主题ID
   * @param theme 主题配置
   */
  addCustomTheme(id: string, theme: ThemeConfig): void {
    this.customThemes[id] = theme
  }

  /**
   * 移除自定义主题
   * @param id 主题ID
   */
  removeCustomTheme(id: string): void {
    delete this.customThemes[id]
  }

  /**
   * 获取最终生效的主题（合并内置和自定义，自定义优先）
   * @param id 主题ID
   * @returns 主题配置，不存在返回 undefined
   */
  getTheme(id: string): ThemeConfig | undefined {
    // 自定义主题优先
    if (this.customThemes[id]) {
      return this.customThemes[id]
    }
    return this.builtinThemes[id]
  }

  /**
   * 获取所有生效的主题列表（合并后）
   * @returns 主题配置映射
   */
  getAllThemes(): Record<string, ThemeConfig> {
    // 合并内置和自定义主题，自定义覆盖内置
    return {
      ...this.builtinThemes,
      ...this.customThemes
    }
  }

  /**
   * 获取所有生效的主题ID列表
   * @returns 主题ID数组
   */
  getThemeIds(): string[] {
    return Object.keys(this.getAllThemes())
  }

  /**
   * 应用主题到 DOM 容器
   * @param container 目标容器元素
   * @param themeId 主题ID
   * @returns 是否应用成功
   */
  applyTheme(container: HTMLElement | null, themeId: string): boolean {
    if (!container) return false

    const theme = this.getTheme(themeId)
    if (!theme) {
      console.warn(`[ThemeManager] 主题不存在: ${themeId}`)
      return false
    }

    // 移除所有内置主题类
    const allThemeIds = this.getThemeIds()
    const themeClasses = allThemeIds.map(id => `iimm-vtk-theme-${id}`)
    container.classList.remove(...themeClasses)

    // 添加新主题类
    container.classList.add(`iimm-vtk-theme-${themeId}`)

    // 应用自定义颜色到 CSS 变量
    if (theme.colors) {
      this.applyThemeColors(container, theme.colors)
    }

    return true
  }

  /**
   * 应用主题颜色到 CSS 变量
   * @param container 目标容器元素
   * @param colors 主题颜色配置
   */
  private applyThemeColors(container: HTMLElement, colors: ThemeConfig['colors']): void {
    const colorMap: Record<keyof ThemeConfig['colors'], string> = {
      toolbarBg: '--iimm-vtk-toolbar-bg',
      toolbarBorder: '--iimm-vtk-toolbar-border-color',
      btnBg: '--iimm-vtk-btn-bg',
      btnBgHover: '--iimm-vtk-btn-bg-hover',
      btnBgActive: '--iimm-vtk-btn-bg-active',
      btnColor: '--iimm-vtk-btn-color',
      btnColorHover: '--iimm-vtk-btn-color-hover',
      btnColorActive: '--iimm-vtk-btn-color-active',
      separatorColor: '--iimm-vtk-toolbar-separator-color',
      popupBg: '--iimm-vtk-popup-bg',
      popupBorder: '--iimm-vtk-popup-border-color',
      popupColor: '--iimm-vtk-popup-color',
      popupLabelColor: '--iimm-vtk-popup-label-color',
      inputBg: '--iimm-vtk-input-bg',
      inputBorder: '--iimm-vtk-input-border-color',
      inputColor: '--iimm-vtk-input-color',
      loadingBg: '--iimm-vtk-loading-bg',
      loadingCardBg: '--iimm-vtk-loading-card-bg',
      loadingText: '--iimm-vtk-loading-text-color',
      loadingTextSecondary: '--iimm-vtk-loading-text-secondary',
      infoPanelBg: '--iimm-vtk-info-panel-bg',
      infoPanelLabel: '--iimm-vtk-info-panel-label-color',
      infoPanelValue: '--iimm-vtk-info-panel-value-color',
      errorBg: '--iimm-vtk-error-bg',
      errorBorder: '--iimm-vtk-error-border-color',
      errorColor: '--iimm-vtk-error-color',
      extensionBg: '--iimm-vtk-extension-bg',
      extensionSeparatorColor: '--iimm-vtk-extension-separator-color'
    }

    for (const [key, cssVar] of Object.entries(colorMap)) {
      const color = colors[key as keyof ThemeConfig['colors']]
      if (color) {
        container.style.setProperty(cssVar, color)
      }
    }
  }

  /**
   * 清空自定义主题
   */
  clearCustomThemes(): void {
    this.customThemes = {}
  }

  /**
   * 重置为主题管理器的初始状态
   */
  reset(): void {
    this.builtinThemes = {}
    this.customThemes = {}
  }
}

/**
 * 全局主题管理器实例
 * 用于在 VtkViewer 实例间共享主题配置
 */
let globalThemeManager: ThemeManager | null = null

/**
 * 获取全局主题管理器实例（单例）
 * @returns 主题管理器实例
 */
export function getThemeManager(): ThemeManager {
  if (!globalThemeManager) {
    globalThemeManager = new ThemeManager()
  }
  return globalThemeManager
}

/**
 * 重置全局主题管理器（主要用于测试）
 */
export function resetThemeManager(): void {
  globalThemeManager = null
}
