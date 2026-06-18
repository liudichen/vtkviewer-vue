/**
 * 工具栏扩展区注册表
 * 管理工具栏插件的动态扩展区域
 *
 * 设计原则：
 *   1. 支持多个扩展区同时活跃显示
 *   2. 插件通过 register()/unregister() 管理自己的扩展区
 *   3. 扩展区支持激活/停用状态切换
 *   4. 支持响应式状态追踪
 */

import { ref, markRaw, type Ref, type Component } from 'vue'

import { i18n } from './I18nManager'

/**
 * 工具栏扩展区项
 */
export interface ToolbarExtensionItem {
  /** 唯一标识（通常使用插件 ID） */
  id: string
  /** 要渲染的 Vue 组件 */
  component: Component
  /** 是否激活 */
  active: boolean
  /** 显示优先级（数值越小越靠前），默认 0 */
  priority?: number
}

/**
 * 工具栏扩展区注册表接口
 */
export interface IToolbarExtensionRegistry {
  /**
   * 注册扩展区
   * @param item 扩展区配置
   */
  register(item: ToolbarExtensionItem): void

  /**
   * 更新扩展区状态
   * @param id 扩展区 ID
   * @param updates 要更新的属性
   */
  update(id: string, updates: Partial<Omit<ToolbarExtensionItem, 'id'>>): void

  /**
   * 注销扩展区
   * @param id 扩展区 ID
   */
  unregister(id: string): void

  /**
   * 激活指定扩展区（支持多个同时活跃）
   * @param id 扩展区 ID
   */
  activate(id: string): void

  /**
   * 停用指定扩展区
   * @param id 扩展区 ID
   */
  deactivate(id: string): void

  /**
   * 切换扩展区激活状态
   * @param id 扩展区 ID
   */
  toggle(id: string): void

  /**
   * 停用所有扩展区
   */
  deactivateAll(): void

  /**
   * 检查是否存在指定 ID 的扩展区
   * @param id 扩展区 ID
   */
  has(id: string): boolean

  /**
   * 获取当前活跃的扩展区（响应式，单个 - 向后兼容）
   */
  readonly activeExtension: Ref<ToolbarExtensionItem | null>

  /**
   * 获取所有活跃的扩展区（响应式，多个）
   */
  readonly activeExtensions: Ref<ToolbarExtensionItem[]>

  /**
   * 响应式扩展区列表
   */
  readonly extensions: Ref<ToolbarExtensionItem[]>

  /**
   * 清除所有扩展区
   */
  clear(): void
}

/**
 * 工具栏扩展区注册表实现
 */
export class ToolbarExtensionRegistryImpl implements IToolbarExtensionRegistry {
  /** 内部存储 */
  private extensionMap = new Map<string, ToolbarExtensionItem>()
  /** 当前活跃的扩展区（单个，向后兼容） */
  readonly activeExtension: Ref<ToolbarExtensionItem | null> = ref(null)
  /** 所有活跃的扩展区 */
  readonly activeExtensions: Ref<ToolbarExtensionItem[]> = ref([])
  /** 响应式扩展区列表 */
  readonly extensions: Ref<ToolbarExtensionItem[]> = ref([])

  register(item: ToolbarExtensionItem): void {
    if (this.extensionMap.has(item.id)) {
      this.extensionMap.delete(item.id)
    }
    // 使用 markRaw 标记组件，避免 Vue 响应式代理
    this.extensionMap.set(item.id, {
      ...item,
      component: markRaw(item.component),
      priority: item.priority ?? 0
    })
    this.refreshExtensions()

    // 如果注册时标记为激活，则激活它
    if (item.active) {
      this.activate(item.id)
    }
  }

  update(id: string, updates: Partial<Omit<ToolbarExtensionItem, 'id'>>): void {
    const existing = this.extensionMap.get(id)
    if (!existing) {
      console.warn(
        `[ToolbarExtensionRegistry] ${i18n.translate('vtkviewer.toolbar.extensionNotFound')}: update`
      )
      return
    }
    const merged = { ...existing, ...updates }
    if (updates.component) merged.component = markRaw(updates.component)
    this.extensionMap.set(id, merged)
    this.refreshExtensions()

    // 更新活跃状态
    if (this.activeExtension.value?.id === id) {
      this.activeExtension.value = merged.active ? merged : null
    }
  }

  unregister(id: string): void {
    if (!this.extensionMap.has(id)) return
    this.extensionMap.delete(id)

    // 刷新活跃扩展列表（会自动更新 activeExtensions 和 activeExtension）
    this.refreshActiveExtensions()
    this.refreshExtensions()
  }

  activate(id: string): void {
    const ext = this.extensionMap.get(id)
    if (!ext) {
      console.warn(
        `[ToolbarExtensionRegistry] ${i18n.translate('vtkviewer.toolbar.extensionNotFound')}: activate`
      )
      return
    }

    // 激活目标扩展区（不停用其他扩展区）
    ext.active = true
    this.activeExtension.value = ext
    this.refreshActiveExtensions()
    this.refreshExtensions()
  }

  deactivate(id: string): void {
    const ext = this.extensionMap.get(id)
    if (!ext) return

    ext.active = false
    if (this.activeExtension.value?.id === id) {
      this.activeExtension.value = null
    }
    this.refreshActiveExtensions()
    this.refreshExtensions()
  }

  toggle(id: string): void {
    const ext = this.extensionMap.get(id)
    if (!ext) return

    if (ext.active) {
      this.deactivate(id)
    } else {
      this.activate(id)
    }
  }

  deactivateAll(): void {
    for (const ext of this.extensionMap.values()) {
      ext.active = false
    }
    this.activeExtension.value = null
    this.activeExtensions.value = []
    this.refreshExtensions()
  }

  has(id: string): boolean {
    return this.extensionMap.has(id)
  }

  clear(): void {
    this.extensionMap.clear()
    this.activeExtension.value = null
    this.activeExtensions.value = []
    this.extensions.value = []
  }

  /**
   * 刷新响应式列表
   */
  private refreshExtensions(): void {
    this.extensions.value = Array.from(this.extensionMap.values()).sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    )
  }

  /**
   * 刷新活跃扩展区列表
   */
  private refreshActiveExtensions(): void {
    this.activeExtensions.value = Array.from(this.extensionMap.values())
      .filter(ext => ext.active)
      .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    // 更新 activeExtension 为第一个活跃的（向后兼容）
    this.activeExtension.value = this.activeExtensions.value[0] ?? null
  }
}
