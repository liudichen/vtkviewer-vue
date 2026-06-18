/**
 * 交互子上下文
 * 管理用户交互工具（旋转、缩放、平移等）
 */

/** 交互配置 */
export interface InteractionConfig {
  rotate?: boolean
  zoom?: boolean
  pan?: boolean
  keyboardControl?: boolean
  gesture?: boolean
}

/** 操纵器类型 */
export type ManipulatorType = 'rotate' | 'zoom' | 'pan' | 'gesture' | 'keyboard'

/** 操纵器配置 */
export interface ManipulatorConfig {
  /** 鼠标按钮（0=左键, 1=中键, 2=右键, -1=滚轮） */
  button?: number
  /** 是否启用拖拽 */
  dragEnabled?: boolean
  /** 是否启用滚动 */
  scrollEnabled?: boolean
  /** 键盘按键列表 */
  keys?: string[]
  /** 手势类型 */
  gestureType?: 'pinch' | 'rotate' | 'pan'
  /** 自定义配置 */
  [key: string]: any
}

/**
 * 交互子上下文接口
 * 提供交互工具的开关、状态查询和高级配置能力
 */
export interface InteractionSubContext {
  /** 初始化 VTK.js 交互管线（在渲染窗口可用后调用） */
  init(): void
  /** 获取所有工具的启用状态 */
  getEnabledTools(): { rotate: boolean; zoom: boolean; pan: boolean }
  /** 查询指定工具是否启用 */
  isEnabled(tool: string): boolean
  /** 切换工具启用状态 */
  toggleTool(tool: string): void
  /** 设置工具启用状态 */
  setToolEnabled(tool: string, enabled: boolean): void
  /** 批量更新交互配置 */
  updateInteraction(config: InteractionConfig): void
  /** 键盘控制是否启用 */
  isKeyboardControlEnabled(): boolean
  /** 切换键盘控制 */
  toggleKeyboardControl(): void
  /** 手势是否启用 */
  isGestureEnabled(): boolean
  /** 是否为触屏设备 */
  isTouchDevice(): boolean

  // === 增强功能：操纵器访问和配置 ===

  /** 获取指定类型的操纵器实例 */
  getManipulator(type: ManipulatorType): any | null
  /** 配置指定类型的操纵器参数 */
  configureManipulator(type: ManipulatorType, config: ManipulatorConfig): void
  /** 重置操纵器到默认配置 */
  resetManipulator(type: ManipulatorType): void
  /** 重置所有操纵器到默认配置 */
  resetAllManipulators(): void
  /** 获取当前交互配置快照 */
  getInteractionSnapshot(): InteractionConfig & {
    manipulators: Record<ManipulatorType, ManipulatorConfig>
  }

  /** 释放所有 VTK.js 交互资源 */
  dispose(): void
}
