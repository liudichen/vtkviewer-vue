/**
 * 统一查看器上下文
 * 所有插件通过此接口访问查看器能力
 */

import type { Ref } from 'vue'
import type { PluginRegistry } from '@/plugins'

import type { RenderSubContext } from './RenderSubContext'
import type { SceneSubContext } from './SceneSubContext'
import type { InteractionSubContext } from './InteractionSubContext'
import type { UISubContext } from './UISubContext'
import type { IStateManager } from './StateManager'
import type { CommandRegistry } from './CommandRegistry'
import type { EventBus } from './EventBus'
import type { ConfigAccessor } from './ConfigAccessor'
import type { DisposalRegistry } from './DisposalRegistry'
import type { ResetManager } from './ResetManager'
import type { IToolbarInfoRegistry } from './ToolbarInfoRegistry'
import type { IToolbarExtensionRegistry } from './ToolbarExtensionRegistry'
import type { ThemeContext } from './ThemeContext'

/**
 * 主题配置
 */
export interface ThemeConfig {
  /** 主题唯一标识 */
  id: string
  /** 主题显示名称 */
  name: string
  /** 是否为暗色主题 */
  isDark: boolean
  /** 主题颜色配置 */
  colors: {
    toolbarBg: string
    toolbarBorder: string
    btnBg: string
    btnBgHover: string
    btnBgActive: string
    btnColor: string
    btnColorHover: string
    btnColorActive: string
    separatorColor: string
    popupBg: string
    popupBorder: string
    popupColor: string
    popupLabelColor: string
    inputBg: string
    inputBorder: string
    inputColor: string
    loadingBg: string
    loadingCardBg: string
    loadingText: string
    loadingTextSecondary: string
    infoPanelBg: string
    infoPanelLabel: string
    infoPanelValue: string
    errorBg: string
    errorBorder: string
    errorColor: string
    /** 扩展区背景色 */
    extensionBg: string
    /** 扩展区分隔线颜色 */
    extensionSeparatorColor: string
  }
}

/**
 * 查看器上下文接口
 * 插件通过 init(ctx) 方法接收此上下文
 */
export interface ViewerContext {
  /** 查看器是否已就绪（完成初始化） */
  readonly isReady: Ref<boolean>
  /** VTK.js 渲染能力 */
  readonly render: RenderSubContext
  /** 场景对象管理 */
  readonly scene: SceneSubContext
  /** 用户交互控制 */
  readonly interaction: InteractionSubContext
  /** UI状态和控制 */
  readonly ui: UISubContext
  /** 统一状态管理 */
  readonly stateManager: IStateManager
  /** 命令注册/执行 */
  readonly commands: CommandRegistry
  /** 事件总线 */
  readonly events: EventBus
  /** 配置访问 */
  readonly config: ConfigAccessor
  /** 资源管理 */
  readonly disposal: DisposalRegistry
  /** 插件注册表（用于插件间访问） */
  readonly plugins: PluginRegistry
  /** 插件状态重置管理器 */
  readonly resetManager: ResetManager
  /** 工具栏信息面板注册表 */
  readonly infoPanel: IToolbarInfoRegistry
  /** 工具栏扩展区注册表 */
  readonly toolbarExtension: IToolbarExtensionRegistry
  /** 主题状态管理（单一数据源） */
  readonly theme: ThemeContext
  /** 外部解码器路径配置，供格式插件获取解码器入口（可响应式更新） */
  readonly decoders: Record<string, string>
  /** 是否启用手势控制（触屏交互总开关） */
  readonly enableGesture: Ref<boolean>
  /** 是否启用键盘控制（快捷键总开关） */
  readonly enableKeyboard: Ref<boolean>
}
