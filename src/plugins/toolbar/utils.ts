/**
 * 工具栏插件工具函数
 */

import { h, ref, nextTick, type Component, type VNode, type Ref } from 'vue'

import type {
  PluginIcon,
  ToolbarIconConfig,
  KeyboardShortcutConfigItem,
  ShortcutConfig
} from '@/plugins/types'

/**
 * 渲染工具栏图标
 * 支持字符串（emoji）、Vue组件、ToolbarIconConfig
 *
 * @param icon 图标配置
 * @param state 当前状态（用于多状态图标）
 * @param active 是否激活状态（用于双状态图标）
 * @returns VNode | string
 */
export function renderToolbarIcon(
  icon: PluginIcon | undefined | null,
  state?: string,
  active?: boolean
): VNode | string {
  if (!icon) {
    return null as any
  }

  // 添加统一的图标类名
  const iconClass = 'iimm-vtk-toolbar-icon'

  // 如果是字符串（emoji），包装在span中
  if (typeof icon === 'string') {
    return h('span', { class: iconClass }, icon)
  }

  // 如果是Vue组件，直接渲染并添加类名
  if (
    typeof icon === 'function' ||
    (typeof icon === 'object' && icon !== null && 'setup' in icon)
  ) {
    return h(icon as Component, { class: iconClass })
  }

  // 如果是ToolbarIconConfig
  const config = icon as ToolbarIconConfig

  // 优先使用多状态图标
  if (state && config.states && config.states[state]) {
    return h(config.states[state], { class: iconClass })
  }

  // 使用双状态图标
  if (active !== undefined) {
    const stateIcon = active ? config.active : config.inactive
    if (stateIcon) {
      return h(stateIcon, { class: iconClass })
    }
  }

  // 使用默认图标
  return h(config.default, { class: iconClass })
}

/**
 * 创建图标配置
 * 用于简化插件中图标配置的创建
 *
 * @param defaultIcon 默认图标
 * @param activeIcon 激活状态图标
 * @param inactiveIcon 非激活状态图标
 * @param states 多状态图标
 * @returns ToolbarIconConfig
 */
export function createIconConfig(
  defaultIcon: Component,
  activeIcon?: Component,
  inactiveIcon?: Component,
  states?: Record<string, Component>
): ToolbarIconConfig {
  return {
    default: defaultIcon,
    ...(activeIcon && { active: activeIcon }),
    ...(inactiveIcon && { inactive: inactiveIcon }),
    ...(states && { states })
  }
}

/**
 * 标准化快捷键配置
 * 将各种简写形式统一解析为 KeyboardShortcutConfigItem[]
 *
 * @param config 快捷键配置（支持多种简写形式）
 * @param defaultAction 默认动作标识（当使用 string/string[] 简写时需要）
 * @param defaultDescription 默认描述（可选）
 * @returns 标准化的 KeyboardShortcutConfigItem[]
 */
export function normalizeShortcutConfig(
  config: ShortcutConfig | undefined,
  defaultAction?: string,
  defaultDescription?: string
): KeyboardShortcutConfigItem[] {
  if (!config) return []

  // KeyboardShortcutConfigItem[]
  if (Array.isArray(config)) {
    if (config.length === 0) return []
    // 判断数组元素类型
    if (typeof config[0] === 'string') {
      // string[]：多个按键绑定同一 action
      return [
        {
          action: defaultAction || 'default',
          description: defaultDescription,
          key: config as string[]
        }
      ]
    }
    // KeyboardShortcutConfigItem[]：直接返回
    return config as KeyboardShortcutConfigItem[]
  }

  // string：单个按键
  if (typeof config === 'string') {
    if (!config) return []
    return [
      {
        action: defaultAction || 'default',
        description: defaultDescription,
        key: config
      }
    ]
  }

  // KeyboardShortcutConfigItem：单个对象
  return [config as KeyboardShortcutConfigItem]
}

// ============================================================
// 下拉弹窗对齐工具（运行时动态判断向左/向右展开）
// ============================================================

/**
 * 下拉弹窗对齐管理对象
 * 通过 ref 跟踪当前对齐方向，并提供 update() 方法在弹窗打开时重新计算
 */
export interface DropdownAlignment {
  /** 当前对齐方向：'left'（弹窗向右展开）或 'right'（弹窗向左展开） */
  align: Ref<'left' | 'right'>
  /** 重新计算对齐方向（应在弹窗打开后、DOM 渲染后调用） */
  update: () => Promise<void>
}

/**
 * 创建下拉弹窗对齐管理器
 * 根据按钮在视口中的位置自动判断弹窗应向左还是向右展开，
 * 确保弹窗始终在可视范围内 —— 无论按钮在工具栏的什么位置。
 *
 * 使用示例：
 * ```ts
 * private dropdownAlignment = createDropdownAlignment('iimm-vtk-screenshot')
 * // 在按钮点击时：
 * if (this.isDropdownOpen.value) this.dropdownAlignment.update()
 * // 在弹窗 div 上：
 * style: getDropdownAlignStyle(this.dropdownAlignment.align.value)
 * ```
 *
 * @param containerClass 插件容器元素的 CSS 类名（不含前导点）
 * @param dropdownMinWidth 弹窗的最小宽度（含边距），默认 280px
 */
export function createDropdownAlignment(
  containerClass: string,
  dropdownMinWidth = 280
): DropdownAlignment {
  const align = ref<'left' | 'right'>('left')

  async function update(): Promise<void> {
    await nextTick()
    if (typeof document === 'undefined') return

    const container = document.querySelector(`.${containerClass}`)
    if (!container) return

    const btn = container.querySelector('.iimm-vtk-toolbar-btn') as HTMLElement | null
    if (!btn) return

    const btnRect = btn.getBoundingClientRect()
    const spaceOnRight = window.innerWidth - btnRect.left

    align.value = spaceOnRight < dropdownMinWidth ? 'right' : 'left'
  }

  return { align, update }
}

/**
 * 根据对齐方向返回对应的内联样式对象
 * @param align 对齐方向（'left' 或 'right'）
 * @returns Vue style 绑定对象
 */
export function getDropdownAlignStyle(align: 'left' | 'right' | undefined): Record<string, string> {
  return align === 'right' ? { right: '0', left: 'auto' } : { left: '0' }
}
