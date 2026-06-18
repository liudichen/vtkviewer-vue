/**
 * 工具栏信息注册表
 * 管理工具栏插件推送到信息面板的显示项
 *
 * 设计原则：
 *   1. 插件通过 register()/update()/unregister() 管理自己的信息项
 *   2. 每个信息项由唯一 ID 标识（通常使用插件 ID）
 *   3. 信息项支持优先级排序，数值越小越靠前
 *   4. 支持响应式可见性控制
 *   5. 多插件并发显示互不冲突
 */

import { ref, markRaw, type Ref, type Component } from 'vue'

import { i18n } from './I18nManager'

/**
 * 工具栏信息项
 * 插件推送到信息面板的单个显示单元
 */
export interface ToolbarInfoItem {
  /** 唯一标识（通常使用插件 ID） */
  id: string
  /** 要渲染的 Vue 组件 */
  component: Component
  /** 显示优先级（数值越小越靠前），默认 0 */
  priority?: number
  /** 响应式可见性检查回调（可选），返回 true 表示可见，默认可见 */
  visibleCheck?: () => boolean
}

/**
 * 工具栏信息注册表接口
 * 提供信息项的注册、更新、注销能力
 */
export interface IToolbarInfoRegistry {
  /**
   * 注册信息项
   * 如果已存在同 ID 项，则替换
   * @param item 信息项
   */
  register(item: ToolbarInfoItem): void

  /**
   * 更新信息项的部分属性
   * @param id 信息项 ID
   * @param updates 要更新的属性（component/priority/visible）
   */
  update(id: string, updates: Partial<Omit<ToolbarInfoItem, 'id'>>): void

  /**
   * 注销信息项
   * @param id 信息项 ID
   */
  unregister(id: string): void

  /**
   * 检查是否存在指定 ID 的信息项
   * @param id 信息项 ID
   */
  has(id: string): boolean

  /**
   * 获取所有信息项（按优先级排序）
   * 返回排序后的副本
   */
  getItems(): ToolbarInfoItem[]

  /**
   * 响应式信息项列表（按优先级排序）
   * Vue 组件应使用此属性进行渲染
   */
  readonly items: Ref<ToolbarInfoItem[]>

  /**
   * 清除所有信息项
   */
  clear(): void
}

/**
 * 工具栏信息注册表实现
 */
export class ToolbarInfoRegistryImpl implements IToolbarInfoRegistry {
  /** 内部存储（保持插入顺序） */
  private itemMap = new Map<string, ToolbarInfoItem>()
  /** 响应式列表（按优先级排序） */
  readonly items: Ref<ToolbarInfoItem[]> = ref([])

  register(item: ToolbarInfoItem): void {
    // 如果已存在，先移除旧的
    if (this.itemMap.has(item.id)) {
      this.itemMap.delete(item.id)
    }
    // 使用 markRaw 标记组件对象，避免 Vue 响应式代理造成不必要的性能开销
    this.itemMap.set(item.id, { priority: 0, ...item, component: markRaw(item.component) })
    this.refreshItems()
  }

  update(id: string, updates: Partial<Omit<ToolbarInfoItem, 'id'>>): void {
    const existing = this.itemMap.get(id)
    if (!existing) {
      console.warn(
        `[ToolbarInfoRegistry] ${i18n.translate('vtkviewer.toolbar.infoItemNotFound')}: update`
      )
      return
    }
    // 合并更新，如果更新了组件也标记为 markRaw
    const merged = { ...existing, ...updates }
    if (updates.component) merged.component = markRaw(updates.component)
    this.itemMap.set(id, merged)
    this.refreshItems()
  }

  unregister(id: string): void {
    if (!this.itemMap.has(id)) return
    this.itemMap.delete(id)
    this.refreshItems()
  }

  has(id: string): boolean {
    return this.itemMap.has(id)
  }

  getItems(): ToolbarInfoItem[] {
    return [...this.items.value]
  }

  clear(): void {
    this.itemMap.clear()
    this.items.value = []
  }

  /**
   * 刷新响应式列表
   * 按优先级排序后更新 items ref
   */
  private refreshItems(): void {
    const sorted = Array.from(this.itemMap.values()).sort(
      (a, b) => (a.priority ?? 0) - (b.priority ?? 0)
    )
    this.items.value = sorted
  }
}
