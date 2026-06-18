/**
 * UI子上下文
 * 管理查看器的UI状态（全屏、坐标轴、背景色等）
 */

import type { Ref } from 'vue'

import type { ScreenshotOptions } from './RenderSubContext'

/**
 * UI子上下文接口
 * 提供UI状态查询和控制能力
 */
export interface UISubContext {
  /** 是否全屏 */
  isFullscreen(): boolean
  /** 是否显示坐标轴 */
  showAxes(): boolean
  /** 获取当前背景色 */
  getBackgroundColor(): string
  /** 响应式默认背景色（由 VtkViewer props.background 驱动） */
  readonly defaultBackground: Ref<string>
  /** 设置默认背景色（响应式更新） */
  setDefaultBackground(color: string): void
  /** 截图 */
  captureScreenshot(options?: ScreenshotOptions): Promise<Blob>
  /** 切换全屏 */
  toggleFullscreen(): void
  /** 切换坐标轴显示 */
  toggleAxes(): void
  /** 设置当前背景色 */
  setBackgroundColor(color: string): void
  /** 应用视图预设 */
  applyViewPreset(preset: string): void
  /** 是否紧凑模式 */
  isCompactMode(): boolean
  /** 切换紧凑模式 */
  toggleCompactMode(): void
}
