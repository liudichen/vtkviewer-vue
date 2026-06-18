/**
 * 统一插件注册表
 * 支持延迟收集+智能排序（依赖关系 > initOrder > 注册顺序）
 */

import { ref, type Ref } from 'vue'

import { EventBusImpl, type ViewerContext } from '@/core'
import { BuiltinEvents } from '@/configs'

import type { IFormatPlugin, IViewerPlugin, PluginConfig, PluginType, PluginsConfig } from './types'

/** 插件类型默认 initOrder（数值小的优先初始化） */
const DEFAULT_PLUGIN_INIT_ORDER: Record<PluginType, number> = {
  ['format']: 200,
  ['toolbar']: 300,
  ['ui']: 400,
  ['service']: 100
}

export class PluginRegistry {
  private plugins = new Map<string, IViewerPlugin>()
  private initialized = new Set<string>()
  private configs = new Map<string, PluginConfig>()
  private registrationOrder: string[] = []
  private events: EventBusImpl
  /** useViewer 默认插件配置（最低优先级） */
  private _defaultPluginConfig: PluginsConfig = {}
  /** 响应式就绪标记：所有插件初始化完成后为 true，replaceAll/disposeAll 后为 false */
  readonly pluginsReady: Ref<boolean> = ref(false)
  /** 格式插件索引缓存（懒构建，插件变更时失效） */
  private _formatCache: { index: Map<string, IFormatPlugin>; extensions: string[] } | null = null

  constructor(events?: EventBusImpl) {
    this.events = events ?? new EventBusImpl()
  }

  /**
   * 清除所有已注册插件并重新注册
   * 用于 VtkViewer props.plugins 覆盖 useViewer 默认插件的场景
   * @param plugins 要注册的插件列表（扁平格式）
   * @param configs 插件配置映射
   */
  replaceAll(plugins: IViewerPlugin[], configs?: Map<string, any>): void {
    // 1. 销毁并清除所有已初始化的插件
    for (const plugin of Array.from(this.plugins.values()).reverse()) {
      const { id } = plugin.metadata
      if (this.initialized.has(id)) {
        plugin.dispose()
      }
    }
    this.plugins.clear()
    this.initialized.clear()
    this.configs.clear()
    this.registrationOrder = []

    // 2. 注册新插件
    for (const plugin of plugins) {
      const { id } = plugin.metadata
      const config = configs?.get(id)
      const merged = { ...plugin.defaultConfig, ...config }
      this.plugins.set(id, plugin)
      this.configs.set(id, merged)
      this.registrationOrder.push(id)
    }
    // 标记插件未就绪，等待后续 initAll() 完成后设为 true
    this.pluginsReady.value = false
    this._invalidateFormatCache()
  }

  /**
   * 设置 useViewer 默认插件配置（最低优先级）
   * VtkViewer 可通过 getDefaultPluginConfig() 读取并合并
   */
  setDefaultPluginConfig(config: PluginsConfig): void {
    this._defaultPluginConfig = config ?? {}
  }

  /** 获取 useViewer 默认插件配置 */
  getDefaultPluginConfig(): PluginsConfig {
    return this._defaultPluginConfig
  }

  register(plugin: IViewerPlugin, config?: PluginConfig): void {
    const { id } = plugin.metadata
    const merged = { ...plugin.defaultConfig, ...this.configs.get(id), ...config }
    this.plugins.set(id, plugin)
    this.configs.set(id, merged)
    this.registrationOrder.push(id)
    this._invalidateFormatCache()
  }

  unregister(id: string): void {
    if (this.initialized.has(id)) {
      this.plugins.get(id)?.dispose()
      this.initialized.delete(id)
    }
    this.plugins.delete(id)
    this.configs.delete(id)
    this.registrationOrder = this.registrationOrder.filter(i => i !== id)
    this._invalidateFormatCache()
  }

  /**
   * 初始化所有已注册的插件
   * @param ctx 查看器上下文（必须提供，用于插件初始化）
   */
  async initAll(ctx: ViewerContext): Promise<void> {
    const initOrder = this.resolveInitOrder()
    for (const plugin of initOrder) {
      const { id } = plugin.metadata
      if (this.initialized.has(id)) continue

      const config = this.configs.get(id)
      try {
        await plugin.init(ctx, config)
        this.initialized.add(id)
      } catch (error) {
        console.error(`[PluginRegistry] Failed to initialize plugin "${id}":`, error)
        throw error
      }
    }
    // 所有插件初始化完成，标记就绪并触发事件
    this.pluginsReady.value = true
    this.events.emit(BuiltinEvents.PLUGINS_INITIALIZED)
  }

  disposeAll(): void {
    const plugins = Array.from(this.plugins.values()).reverse()
    for (const plugin of plugins) {
      const { id } = plugin.metadata
      if (this.initialized.has(id)) {
        plugin.dispose()
        this.initialized.delete(id)
      }
    }
    // 所有插件已销毁，标记为未就绪
    this.pluginsReady.value = false
    this._invalidateFormatCache()
  }

  get<T extends IViewerPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined
  }

  has(id: string): boolean {
    return this.plugins.has(id)
  }

  getAll(): IViewerPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * 构建格式名称 → 格式插件的索引映射（O(1) 查找）
   * 结果被缓存，插件变更时自动失效重建。
   * 同一格式被多个插件支持时，priority 高的胜出。
   */
  getFormatPluginIndex(): Map<string, IFormatPlugin> {
    return this._ensureFormatCache().index
  }

  /**
   * 获取所有支持的扩展名列表（去重、排序，缓存结果）
   */
  getSupportedExtensions(): string[] {
    return this._ensureFormatCache().extensions
  }

  /** 失效格式缓存，下次访问时懒重建 */
  private _invalidateFormatCache(): void {
    this._formatCache = null
  }

  /** 懒构建格式缓存 */
  private _ensureFormatCache(): { index: Map<string, IFormatPlugin>; extensions: string[] } {
    if (this._formatCache) return this._formatCache

    const map = new Map<string, IFormatPlugin>()
    for (const plugin of this.plugins.values()) {
      if (plugin.metadata.type !== 'format') continue
      const formatPlugin = plugin as unknown as IFormatPlugin
      for (const fmt of formatPlugin.formats) {
        const key = fmt.toLowerCase()
        const existing = map.get(key)
        if (!existing || formatPlugin.priority > existing.priority) {
          map.set(key, formatPlugin)
        }
      }
    }

    const extensions = [...map.keys()].sort()
    this._formatCache = { index: map, extensions }
    return this._formatCache
  }

  isInitialized(id: string): boolean {
    return this.initialized.has(id)
  }

  /**
   * 解析插件初始化顺序
   * 排序规则：依赖关系（拓扑排序） > initOrder > 注册顺序
   */
  private resolveInitOrder(): IViewerPlugin[] {
    const pluginList = Array.from(this.plugins.values())
    const getInitOrder = (plugin: IViewerPlugin): number => {
      if (plugin.initOrder !== undefined) return plugin.initOrder
      return DEFAULT_PLUGIN_INIT_ORDER[plugin.metadata.type] ?? 999
    }
    return this.topologicalSortWithOrder(pluginList, getInitOrder)
  }

  /**
   * 带优先级的拓扑排序
   * 保证依赖关系的同时，同层插件按 initOrder 和注册顺序排序
   */
  private topologicalSortWithOrder(
    pluginList: IViewerPlugin[],
    getInitOrder: (p: IViewerPlugin) => number
  ): IViewerPlugin[] {
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const result: IViewerPlugin[] = []
    const pluginMap = new Map(pluginList.map(p => [p.metadata.id, p]))

    const visit = (plugin: IViewerPlugin, path: string[] = []) => {
      const { id } = plugin.metadata

      if (visiting.has(id)) {
        const cycleStart = path.indexOf(id)
        const cycle = path.slice(cycleStart).concat(id)
        throw new Error(`Circular dependency detected: ${cycle.join(' → ')}`)
      }

      if (visited.has(id)) return

      visiting.add(id)
      const currentPath = [...path, id]

      // 先按 initOrder 排序依赖插件，再递归访问
      const deps = (plugin.dependencies ?? [])
        .map(dep => pluginMap.get(dep))
        .filter((p): p is IViewerPlugin => p !== undefined)
        .sort((a, b) => {
          const orderDiff = getInitOrder(a) - getInitOrder(b)
          if (orderDiff !== 0) return orderDiff
          return (
            this.registrationOrder.indexOf(a.metadata.id) -
            this.registrationOrder.indexOf(b.metadata.id)
          )
        })

      for (const depPlugin of deps) {
        if (!pluginMap.has(depPlugin.metadata.id)) {
          console.warn(
            `[PluginRegistry] Plugin "${id}" depends on "${depPlugin.metadata.id}" which is not registered`
          )
          continue
        }
        visit(depPlugin, currentPath)
      }

      visiting.delete(id)
      visited.add(id)
      result.push(plugin)
    }

    // 按 initOrder 和注册顺序排序起始遍历顺序
    const sortedPlugins = [...pluginList].sort((a, b) => {
      const orderDiff = getInitOrder(a) - getInitOrder(b)
      if (orderDiff !== 0) return orderDiff
      return (
        this.registrationOrder.indexOf(a.metadata.id) -
        this.registrationOrder.indexOf(b.metadata.id)
      )
    })

    for (const plugin of sortedPlugins) {
      if (!visited.has(plugin.metadata.id)) {
        visit(plugin)
      }
    }

    return result
  }
}
