/**
 * 插件基类
 * 提供 config 管理、事件自动清理、isVisible 默认实现、
 * infoPanel / toolbarExtension 通用注册、点击外部监听器等
 *
 * @module plugins/PluginBase
 */

import type { CommandHandler, ToolbarExtensionItem, ToolbarInfoItem, ViewerContext } from '@/core'
import { debugLog, debugWarn } from '@/utils'

import type { IViewerPlugin, PluginConfig, PluginMetadata, ToolbarPluginGroup } from './types'

/**
 * 插件基类
 */
export abstract class PluginBase<
  TConfig extends PluginConfig = PluginConfig
> implements IViewerPlugin<TConfig> {
  abstract readonly metadata: PluginMetadata
  readonly dependencies?: string[]
  readonly initOrder?: number
  readonly defaultConfig?: TConfig

  protected ctx: ViewerContext = {} as ViewerContext
  protected config: TConfig = {} as TConfig

  /** 事件清理追踪列表（通过 onEvent 注册的事件自动入队） */
  private _eventCleanups: Array<[string, (...args: any[]) => void]> = []

  /** 点击外部监听器引用，dispose 时自动清理 */
  private _outsideClickHandler: ((e: MouseEvent) => void) | null = null
  private _outsideClickCapture = true

  /** 已注册的 infoPanel 项 ID */
  private _infoPanelId: string | null = null

  /** 已注册的扩展区项 ID */
  private _extensionId: string | null = null

  /** 已注册的命令 ID 列表 */
  private _commandIds: string[] = []

  /**
   * 初始化插件
   * 自动合并 defaultConfig 和外部 config
   */
  init(ctx: ViewerContext, config?: TConfig): void {
    this.ctx = ctx
    this.config = { ...this.defaultConfig, ...config } as TConfig
    this.onInit()
  }

  /**
   * 子类重写此方法进行初始化
   * 在 config 合并完成后调用
   */
  protected onInit(): void {}

  /**
   * 释放插件资源。
   * 基类默认实现：自动清理事件监听、点击外部监听器、infoPanel、扩展区，
   * 再调用 onDispose() 钩子。
   * 子类不覆写 dispose()，通过 onDispose() 扩展自定义清理。
   */
  dispose(): void {
    this.cleanupEventListeners()
    this._teardownOutsideClickListener()
    this.unregisterInfoPanel()
    this.unregisterExtension()
    this.unregisterAllCommands()
    this.onDispose()
  }

  /**
   * 子类扩展清理钩子
   * 用于释放 VTK 对象、注销命令、移除 DOM 监听器、重置状态等
   */
  protected onDispose(): void {}

  // ============================================================
  // isVisible 默认实现
  // ============================================================

  /**
   * 插件是否可见。
   * 子类可重写此方法实现自定义可见性逻辑。
   * 默认行为：若 hideWhenNoModel 为 true 则无模型时隐藏。
   */
  isVisible(): boolean {
    if ((this.config as any)?.hideWhenNoModel && this.ctx?.scene?.modelCount?.value === 0) {
      return false
    }
    return true
  }

  // ============================================================
  // 事件管理
  // ============================================================

  /**
   * 注册事件并自动追踪（推荐替代直接调用 ctx.events.on）
   * 注册的事件会在 dispose() 中统一清理
   * @param event 事件名称
   * @param callback 回调函数
   */
  protected onEvent(event: string, callback: (...args: any[]) => void): void {
    this.ctx.events.on(event, callback)
    this._eventCleanups.push([event, callback])
  }

  /**
   * 清理所有通过 onEvent() 注册的事件监听
   */
  private cleanupEventListeners(): void {
    for (const [event, callback] of this._eventCleanups) {
      this.ctx.events.off(event, callback)
    }
    this._eventCleanups = []
  }

  // ============================================================
  // 点击外部监听器（自动清理）
  // ============================================================

  /**
   * 设置点击外部监听器，dispose() 时自动清理
   * @param handler 点击处理函数
   * @param useCapture 是否使用捕获阶段，默认 true
   */
  protected setupOutsideClickListener(handler: (e: MouseEvent) => void, useCapture = true): void {
    this._outsideClickHandler = handler
    this._outsideClickCapture = useCapture
    if (typeof document !== 'undefined') {
      document.addEventListener('click', handler, useCapture)
    }
  }

  /** 内部清理点击外部监听 */
  private _teardownOutsideClickListener(): void {
    if (this._outsideClickHandler && typeof document !== 'undefined') {
      document.removeEventListener('click', this._outsideClickHandler, this._outsideClickCapture)
      this._outsideClickHandler = null
    }
  }

  // ============================================================
  // InfoPanel 注册
  // ============================================================

  /**
   * 注册信息面板项。dispose() 时自动注销。
   * @param item 信息面板配置（id 默认为插件 metadata.id，priority 默认为插件 order）
   */
  protected registerInfoPanelItem(item: Omit<ToolbarInfoItem, 'id'> & { id?: string }): void {
    const fullItem: ToolbarInfoItem = {
      id: this.metadata.id,
      priority: (this as any).order,
      ...item
    }
    this.ctx.infoPanel.register(fullItem)
    this._infoPanelId = fullItem.id
  }

  /** 注销信息面板项 */
  protected unregisterInfoPanel(): void {
    if (this._infoPanelId) {
      this.ctx.infoPanel.unregister(this._infoPanelId)
      this._infoPanelId = null
    }
  }

  // ============================================================
  // 扩展区注册
  // ============================================================

  /**
   * 注册扩展区项。dispose() 时自动注销。
   * @param item 扩展区配置（id 默认为插件 metadata.id，priority 默认为插件 order）
   */
  protected registerExtensionItem(item: Omit<ToolbarExtensionItem, 'id'> & { id?: string }): void {
    const fullItem: ToolbarExtensionItem = {
      id: this.metadata.id,
      priority: (this as any).order,
      ...item
    }
    this.ctx.toolbarExtension.register(fullItem)
    this._extensionId = fullItem.id
  }

  /** 注销扩展区项 */
  protected unregisterExtension(): void {
    if (this._extensionId) {
      this.ctx.toolbarExtension.unregister(this._extensionId)
      this._extensionId = null
    }
  }

  // ============================================================
  // 命令注册
  // ============================================================

  /**
   * 注册命令并自动追踪，dispose() 时自动注销
   * @param id 命令 ID
   * @param handler 命令处理器
   */
  protected registerCommand<T = void>(id: string, handler: CommandHandler<T>): void {
    this.ctx.commands.register(id, handler)
    this._commandIds.push(id)
  }

  /** 注销所有通过 registerCommand 注册的命令 */
  private unregisterAllCommands(): void {
    for (const id of this._commandIds) {
      this.ctx.commands.unregister(id)
    }
    this._commandIds = []
  }

  // ============================================================
  // Config 访问
  // ============================================================

  /**
   * 获取配置值
   * @param key 配置键
   * @returns 配置值
   */
  protected getConfig<K extends keyof TConfig>(key: K): TConfig[K] {
    return this.config[key]
  }

  /**
   * 获取完整配置（浅拷贝）
   */
  protected getConfigAll(): TConfig {
    return { ...this.config }
  }

  /**
   * 检查配置中是否包含指定键
   */
  protected hasConfig(key: keyof TConfig): boolean {
    return key in this.config
  }

  /**
   * 获取 hideWhenNoModel 配置值
   * 默认 false（没有模型时也显示）
   */
  getHideWhenNoModel(): boolean {
    return !!(this.config as any)?.hideWhenNoModel
  }

  /**
   * 获取分组标识（从 config.group 读取）
   * 工具栏插件可通过配置 `{ group: 'core' }` 指定分组
   */
  getGroup(): ToolbarPluginGroup | undefined {
    return (this.config as any)?.group
  }

  // ============================================================
  // 调试日志（受 ctx.config('debug') 控制）
  // ============================================================

  /**
   * 调试日志：仅当 debug=true 时输出 console.log
   * @param args 日志参数
   */
  protected debugLog(...args: any[]): void {
    debugLog(this.ctx, ...args)
  }

  /**
   * 调试警告：仅当 debug=true 时输出 console.warn
   * @param args 警告参数
   */
  protected debugWarn(...args: any[]): void {
    debugWarn(this.ctx, ...args)
  }
}
