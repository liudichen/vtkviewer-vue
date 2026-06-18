/**
 * useUIPlugins 组合式函数
 * 管理UI插件的渲染和状态
 */

import {
  computed,
  defineComponent,
  h,
  unref,
  watch,
  type ComputedRef,
  type Ref,
  type Component
} from 'vue'

import type { ViewerContext } from '@/core'
import type { IUIPlugin, UIPluginType } from '@/plugins'

/** UI插件渲染项 */
export interface UIPluginRenderItem {
  /** 插件ID */
  id: string
  /** 渲染组件 */
  component: Component
  /** UI类型 */
  uiType: UIPluginType
  /** 渲染顺序 */
  order: number
  /** 是否可见 */
  visible: boolean
  /** 位置 */
  position: string
}

/** Portal 插件渲染项 */
export interface UIPortalRenderItem {
  /** 插件ID */
  id: string
  /** 渲染组件 */
  component: Component
  /** 渲染顺序 */
  order: number
  /** 是否可见 */
  visible: boolean
  /** Teleport 目标 */
  portalTarget: string | Element
  /** Teleport 额外属性 */
  portalProps: Record<string, any>
}

/** useUIPlugins 返回值 */
export interface UseUIPluginsReturn {
  /** 所有UI插件 */
  uiPlugins: ComputedRef<IUIPlugin[]>
  /** 覆盖层插件 */
  overlayPlugins: ComputedRef<UIPluginRenderItem[]>
  /** 面板插件 */
  panelPlugins: ComputedRef<UIPluginRenderItem[]>
  /** 通知插件 */
  notificationPlugins: ComputedRef<UIPluginRenderItem[]>
  /** Portal 插件（挂载到外部 DOM） */
  portalPlugins: ComputedRef<UIPortalRenderItem[]>
  /** 获取可见的UI插件 */
  getVisiblePlugins: (type?: UIPluginType) => UIPluginRenderItem[]
}

/**
 * useUIPlugins 组合式函数
 * 管理UI插件的渲染和状态
 * @param ctx ViewerContext 或 ComputedRef<ViewerContext | null>，支持响应式
 */
export function useUIPlugins(
  ctx: ViewerContext | Ref<ViewerContext | null> | null,
  options?: { hideWhenNoModel?: boolean; localeVersion?: Ref<number> }
): UseUIPluginsReturn {
  const uiPlugins = computed(() => {
    const c = unref(ctx)
    if (!c) return []
    // pluginsReady 为 false 时直接返回空数组，避免渲染未初始化的插件
    if (!c.plugins.pluginsReady.value) return []
    return c.plugins.getAll().filter((p): p is IUIPlugin => p.metadata.type === 'ui')
  })

  /** 插件渲染组件缓存（避免每次 computed 重新计算时调用 render() 创建新组件） */
  const renderCache = new Map<string, Component>()

  // locale 变更时清空 renderCache，使所有 UI 插件重新 render() 获取翻译后的字符串
  if (options?.localeVersion) {
    watch(options.localeVersion, () => {
      renderCache.clear()
    })
  }

  function getCachedRender(plugin: IUIPlugin): Component {
    const id = plugin.metadata.id
    if (!renderCache.has(id)) {
      try {
        renderCache.set(id, plugin.render())
      } catch (err) {
        console.error(`[useUIPlugins] Plugin "${id}" render() failed:`, err)
        // 返回一个空的占位组件，避免整个UI崩溃
        renderCache.set(id, defineComponent({ setup: () => () => h('span') }))
      }
    }
    return renderCache.get(id)!
  }

  /**
   * 将UI插件转换为渲染项
   * 全局 hideWhenNoModel 或插件自身 hideWhenNoModel 任一为 true 即在无模型时隐藏
   */
  function toRenderItem(plugin: IUIPlugin): UIPluginRenderItem {
    const c = unref(ctx)!
    const isVisible = plugin.isVisible(c)
    const globalHide = options?.hideWhenNoModel ?? false
    const pluginHide = plugin.getHideWhenNoModel?.() ?? false
    // 使用响应式 modelCount 触发重新计算
    const hasModels = c.scene.modelCount.value > 0

    return {
      id: plugin.metadata.id,
      component: getCachedRender(plugin),
      uiType: plugin.uiType,
      order: plugin.order,
      visible: isVisible && (!(globalHide || pluginHide) || hasModels),
      position: plugin.getPosition?.() ?? 'center'
    }
  }

  const overlayPlugins = computed(() =>
    uiPlugins.value
      .filter(p => p.uiType === 'overlay')
      .map(toRenderItem)
      .sort((a, b) => a.order - b.order)
  )

  const panelPlugins = computed(() =>
    uiPlugins.value
      .filter(p => p.uiType === 'panel')
      .map(toRenderItem)
      .sort((a, b) => a.order - b.order)
  )

  const notificationPlugins = computed(() =>
    uiPlugins.value
      .filter(p => p.uiType === 'notification')
      .map(toRenderItem)
      .sort((a, b) => a.order - b.order)
  )

  const portalPlugins = computed(() => {
    const c = unref(ctx)
    if (!c) return []
    const globalHide = options?.hideWhenNoModel ?? false
    // 使用响应式 modelCount 触发重新计算
    const hasModels = c.scene.modelCount.value > 0

    return uiPlugins.value
      .filter(p => p.uiType === 'portal' && typeof p.getPortalTarget === 'function')
      .map(p => {
        const isVisible = typeof p.isVisible === 'function' ? p.isVisible(c) : true
        const pluginHide = p.getHideWhenNoModel?.() ?? false
        return {
          id: p.metadata.id,
          component: getCachedRender(p),
          order: p.order,
          visible: isVisible && (!(globalHide || pluginHide) || hasModels),
          portalTarget: p.getPortalTarget!()!,
          portalProps: p.getPortalProps?.() ?? {}
        }
      })
      .filter(item => item.portalTarget != null)
      .sort((a, b) => a.order - b.order)
  })

  function getVisiblePlugins(type?: UIPluginType): UIPluginRenderItem[] {
    const items = type
      ? uiPlugins.value.filter(p => p.uiType === type).map(toRenderItem)
      : uiPlugins.value.map(toRenderItem)

    return items.filter(item => item.visible).sort((a, b) => a.order - b.order)
  }

  return {
    uiPlugins,
    overlayPlugins,
    panelPlugins,
    notificationPlugins,
    portalPlugins,
    getVisiblePlugins
  }
}
