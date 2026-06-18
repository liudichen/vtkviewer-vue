/**
 * 统一插件接口定义
 * 所有插件类型的基础接口
 */

import type { Component } from 'vue'
import type { ViewerContext } from '../../core/ViewerContext'

/** 插件类型 */
export const PluginType = {
  FORMAT: 'format',
  TOOLBAR: 'toolbar',
  UI: 'ui',
  SERVICE: 'service'
} as const

export type PluginType = (typeof PluginType)[keyof typeof PluginType]

/** 插件元数据 */
export interface PluginMetadata {
  id: string
  name: string
  type: PluginType
  description?: string
  version?: string
  icon?: Component
}

/** 插件配置 */
export interface PluginConfig {
  enabled?: boolean
  [key: string]: any
}

/**
 * 统一插件接口（所有插件基类）
 */
export interface IViewerPlugin<TConfig extends PluginConfig = PluginConfig> {
  readonly metadata: PluginMetadata
  readonly dependencies?: string[]
  readonly initOrder?: number
  readonly defaultConfig?: TConfig

  init(ctx: ViewerContext, config?: TConfig): void | Promise<void>
  dispose(): void
  onConfigChange?(config: TConfig): void
  /** 获取插件配置中 hideWhenNoModel 的值 */
  getHideWhenNoModel?(): boolean
}

/** 格式解析结果 */
export interface FormatParseResult {
  /** 渲染对象（Actor/Volume） */
  actors?: any[]
  volumes?: any[]
  /** 原始数据（如点云、网格） */
  data?: any
  /** 元数据 */
  metadata?: Record<string, any>
  /** 是否为体渲染 */
  isVolume?: boolean
}

/**
 * 格式处理器插件
 * 负责文件解析、数据转换、场景构建
 */
export interface IFormatPlugin<T extends PluginConfig = PluginConfig> extends IViewerPlugin<T> {
  readonly metadata: PluginMetadata & { type: 'format' }
  /** 支持的格式列表 */
  readonly formats: string[]
  /** 优先级（数值越大越优先） */
  readonly priority: number
  /** 是否能处理该格式 */
  canHandle(format: string, buffer?: ArrayBuffer): boolean
  /** 解析文件 */
  parse(
    arrayBuffer: ArrayBuffer,
    format: string,
    options?: Record<string, any>
  ): Promise<FormatParseResult>
  /** 获取文件元数据（可选） */
  getMetadata?(arrayBuffer: ArrayBuffer, format: string): Promise<Record<string, any>>
}

/** 工具栏插件分组 */
export type ToolbarPluginGroup = string

/**
 * 工具栏图标配置
 * 支持单图标、双状态图标、多状态图标
 */
export interface ToolbarIconConfig {
  /** 默认图标（当无状态特定图标时使用） */
  default: Component
  /** 激活状态图标（可选，用于开关类插件） */
  active?: Component
  /** 非激活状态图标（可选，用于开关类插件） */
  inactive?: Component
  /** 多状态图标（用于多状态插件，如坐标轴切换） */
  states?: Record<string, Component>
}

/**
 * 图标配置类型
 * 支持单组件或带状态的图标配置
 */
export type PluginIcon = Component | ToolbarIconConfig

/**
 * 输入映射类型
 * 支持键盘、鼠标、手势三种输入方式
 */
export type InputMappingType = 'keyboard' | 'mouse' | 'gesture'

/**
 * 输入映射
 * 定义一个具体的输入绑定
 */
export interface InputMapping {
  /** 映射类型，默认 'keyboard' */
  type?: InputMappingType
  /** 键盘按键（type='keyboard' 或省略 type 时使用） */
  key?: string
  /** 键盘修饰键 */
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  meta?: boolean
  /** 鼠标按钮（type='mouse' 时使用，0=左键, 1=中键, 2=右键） */
  button?: number
  /** 鼠标事件（type='mouse' 时使用） */
  event?: 'click' | 'dblclick' | 'mousedown' | 'mouseup'
  /** 手势类型（type='gesture' 时使用） */
  gesture?: 'pinch' | 'rotate' | 'swipe' | 'pan'
  /** 手势方向（type='gesture' 时使用） */
  direction?: 'up' | 'down' | 'left' | 'right'
}

/**
 * 键盘快捷键配置项（仅支持键盘按键）
 * 用于工具栏插件的快捷键配置
 */
export interface KeyboardShortcutConfigItem {
  /** 动作标识 */
  action: string
  /** 动作描述 */
  description?: string
  /** 按键（单个按键或组合键，如 'f' 或 'Ctrl+S'） */
  key: string | string[]
}

/**
 * 快捷键配置类型
 * 支持多种简写形式，最终统一解析为 KeyboardShortcutConfigItem[]
 *
 * 使用规则：
 * - string / string[]：仅当插件只有一种 action 时使用，等价于 { action: metadata.id, key: ... }
 * - KeyboardShortcutConfigItem / KeyboardShortcutConfigItem[]：多 action 或需要自定义描述时使用
 */
export type ShortcutConfig =
  | string // 单个按键，如 'F'
  | string[] // 多个按键绑定同一 action，如 ['F', 'f']
  | KeyboardShortcutConfigItem // 单个快捷键定义
  | KeyboardShortcutConfigItem[] // 多个快捷键定义

export interface KeyboardShortcutAction {
  /** 快捷键名称，对应 KeyboardShortcutConfigItem 的 action */
  name?: string
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
}

/**
 * 工具栏插件基础配置
 * 所有工具栏插件的 config 都应继承此接口
 */
export interface ToolbarPluginConfig extends PluginConfig {
  /** 图标配置 */
  icon?: PluginIcon
  /** 开关类插件的默认激活状态，true=默认开启，false/undefined=默认关闭 */
  defaultActive?: boolean
  /** 没有模型时是否隐藏 */
  hideWhenNoModel?: boolean
  /** 分组标识（可选），通过注册时配置传入，如 `[PluginClass, { group: 'core' }]` */
  group?: ToolbarPluginGroup
  /** 快捷键配置（支持多种简写形式，统一解析为 KeyboardShortcutConfigItem[]） */
  shortcut?: ShortcutConfig
  /** 在信息显示区的显示排序，越小越靠前 */
  infoPanelPriority?: number
  /** 在工具栏拓展功能区域的显示排序越小越靠前 */
  toolbarExtensionPriority?: number
}

/**
 * 工具栏插件
 */
export interface IToolbarPlugin extends IViewerPlugin {
  readonly metadata: PluginMetadata & { type: 'toolbar' }
  readonly order: number
  readonly icon?: PluginIcon
  getIcon?(state?: string): Component | undefined
  /** 获取分组标识（从 config.group 读取） */
  getGroup?(): ToolbarPluginGroup | undefined
  render(): Component
  isVisible(ctx: ViewerContext): boolean
  /** 获取快捷键配置列表（统一解析后的标准格式） */
  getShortcutConfig?(): KeyboardShortcutConfigItem[]

  getKeyboardShortcutActions?(): KeyboardShortcutAction[]

  /**
   * 渲染扩展区内容（可选）
   * 当插件功能激活时，扩展区内容将显示在工具栏下方
   */
  renderExtension?(): Component

  /**
   * 扩展区是否激活（可选）
   * 返回 true 时显示扩展区内容
   */
  isExtensionActive?(): boolean
}

/** UI插件子类型 */
export type UIPluginType = 'overlay' | 'panel' | 'notification' | 'portal'

/** UI插件位置 */
export type UIPluginPosition = 'top' | 'bottom' | 'left' | 'right' | 'center'

/**
 * UI插件
 */
export interface IUIPlugin extends IViewerPlugin {
  readonly metadata: PluginMetadata & { type: 'ui' }
  readonly uiType: UIPluginType
  readonly order: number
  render(): Component
  isVisible(ctx: ViewerContext): boolean
  getPosition?(): UIPluginPosition
  activate?(): void
  deactivate?(): void
  /** 获取 Teleport 目标（仅 uiType='portal' 时生效） */
  getPortalTarget?(): string | Element | null
  /** 获取 Teleport 额外属性（仅 uiType='portal' 时生效） */
  getPortalProps?(): Record<string, any>
}

/**
 * 服务插件（无UI）
 */
export interface IServicePlugin extends IViewerPlugin {
  readonly metadata: PluginMetadata & { type: 'service' }
}

/** 通用插件标识类型 */
export type PluginIdentifier<T extends PluginConfig = PluginConfig> = string | (new (...args: any[]) => IViewerPlugin<T>)

/** 格式插件标识类型（仅类引用） */
export type FormatPluginIdentifier<T extends PluginConfig = PluginConfig> = new (...args: any[]) => IFormatPlugin<T>

/** 通用插件配置项 */
export type PluginItem<T extends PluginConfig = PluginConfig> = PluginIdentifier<T> | [PluginIdentifier<T>, T?]

/** 格式插件配置项 */
export type FormatPluginItem<T extends PluginConfig = PluginConfig> = FormatPluginIdentifier<T> | [FormatPluginIdentifier<T>, T?]

/**
 * 分类插件配置
 * 按插件类型分组配置，支持按分类独立配置和覆盖
 */
export interface PluginsConfig {
  /** 格式插件 */
  format?: FormatPluginItem[]
  /** 工具栏插件 */
  toolbar?: PluginItem[]
  /** UI 插件 */
  ui?: PluginItem[]
  /** 服务插件 */
  service?: PluginItem[]
}
