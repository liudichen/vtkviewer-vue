/**
 * 图层/场景树插件
 * 以树形列表展示所有 Actor / Volume，支持显隐切换、透明度滑块、颜色拾取
 * 以右侧面板形式展示在查看器中
 */

import { defineComponent, h, ref, watch, type Component } from 'vue'

import type { vtkActor } from '@kitware/vtk.js/Rendering/Core/Actor'
import type { vtkVolume } from '@kitware/vtk.js/Rendering/Core/Volume'

import { ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import {
  type IUIPlugin,
  type PluginConfig,
  PluginType,
  type UIPluginPosition
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

// ============================================================
// 类型定义
// ============================================================

/** 场景树条目类型 */
type SceneItemType = 'actor' | 'volume'

/** 场景树条目 */
interface SceneTreeItem {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 条目类型 */
  type: SceneItemType
  /** VTK 对象引用 */
  ref: vtkActor | vtkVolume
  /** 是否可见 */
  visible: boolean
  /** 不透明度 (0-1) */
  opacity: number
  /** 颜色 [r, g, b] 归一化 (0-1)，仅对 Actor 有效 */
  color?: [number, number, number]
}

/** 场景树插件配置 */
export interface SceneTreePluginConfig extends PluginConfig {
  /** 面板宽度（px），默认 280 */
  panelWidth?: number
  /** 是否在无模型时隐藏，默认 true */
  hideWhenNoModel?: boolean
  /** 面板位置，默认 'left' */
  position?: 'left' | 'right'
}

// ============================================================
/** Actor 内部编号计数器，用于生成显示名称 */
let actorNameCounter = 1
/** Volume 内部编号计数器 */
let volumeNameCounter = 1

/**
 * 生成唯一的条目 ID
 */
function generateItemId(): string {
  return `scene_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 根据条目的 ref 查找初始状态中对应的条目 */
function findMatchingInitialState(
  itemRef: vtkActor | vtkVolume,
  initialStates: SceneTreeItem[]
): SceneTreeItem | undefined {
  return initialStates.find(s => s.ref === itemRef)
}

// ============================================================
// 插件实现
// ============================================================

export class SceneTreePlugin
  extends PluginBase<SceneTreePluginConfig>
  implements IUIPlugin, IResettableActions
{
  readonly metadata = {
    id: 'sceneTree',
    name: '图层/场景树',
    type: PluginType.UI,
    description: '以树形列表展示所有 Actor / Volume，支持显隐切换、透明度滑块、颜色拾取'
  }

  readonly uiType = 'panel' as const
  readonly order = 10
  readonly defaultConfig: SceneTreePluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    panelWidth: 280,
    position: 'left'
  }

  // ============================================================
  // 响应式状态
  // ============================================================

  /** 场景树条目列表 */
  private items = ref<SceneTreeItem[]>([])

  /** 面板是否展开 */
  private isExpanded = ref(false)

  /** 颜色拾取中条目的 ID（打开颜色选择器的条目） */
  private pickingColorId = ref<string | null>(null)

  /**
   * 初始状态快照
   * 每次场景加载时记录所有 actor/volume 的初始 visible/opacity/color，
   * resetAll 时恢复到此状态
   */
  private initialStates: SceneTreeItem[] = []

  // ============================================================
  // 事件清理列表
  // ============================================================

  // ============================================================
  // 生命周期
  // ============================================================

  protected onInit(): void {
    // 初始刷新
    this.refreshSceneItems()
    this.saveInitialStates()

    // 监听场景加载/清除事件
    const onSceneLoaded = () => {
      // 场景加载后重置计数器，确保名称从 1 开始
      actorNameCounter = 1
      volumeNameCounter = 1
      this.refreshSceneItems()
      this.saveInitialStates()
    }
    this.onEvent(BuiltinEvents.SCENE_LOADED, onSceneLoaded)

    const onSceneCleared = () => {
      this.items.value = []
      this.isExpanded.value = false
      this.pickingColorId.value = null
      this.initialStates = []
      actorNameCounter = 1
      volumeNameCounter = 1
    }
    this.onEvent(BuiltinEvents.SCENE_CLEARED, onSceneCleared)

    // 监听模型数量变化，自动刷新
    const unwatchModelCount = watch(this.ctx.scene.modelCount, () => {
      this.refreshSceneItems()
    })
    this.ctx.disposal.register(unwatchModelCount)
  }

  /**
   * 保存当前场景对象的状态作为初始状态快照
   * 用于 resetAll 时恢复
   */
  private saveInitialStates(): void {
    this.initialStates = this.items.value.map(item => ({
      id: item.id,
      name: item.name,
      type: item.type,
      ref: item.ref,
      visible: item.visible,
      opacity: item.type === 'actor' ? item.opacity : 1,
      color: item.color ? [...item.color] : undefined
    }))
  }

  /**
   * 刷新场景树条目
   * 扫描场景中的 Actor 和 Volume，同步到树列表
   */
  private refreshSceneItems(): void {
    const actors = this.ctx.scene.getActors()
    const volumes = this.ctx.scene.getVolumes()

    const newItems: SceneTreeItem[] = []

    // 处理 Actors
    for (const actor of actors) {
      const prop = actor.getProperty()
      const color = prop.getColor()
      newItems.push({
        id: generateItemId(),
        name: `Actor ${actorNameCounter++}`,
        type: 'actor',
        ref: actor,
        visible: actor.getVisibility(),
        opacity: prop.getOpacity(),
        color: [color[0], color[1], color[2]]
      })
    }

    // 处理 Volumes（VolumeProperty 使用 PiecewiseFunction 控制透明度，没有单一的 opacity 值）
    // 这里仅记录可见性，不提供透明度/颜色控制
    for (const volume of volumes) {
      newItems.push({
        id: generateItemId(),
        name: `Volume ${volumeNameCounter++}`,
        type: 'volume',
        ref: volume,
        visible: volume.getVisibility(),
        opacity: 1 // Volume 暂不提供透明度控制
      })
    }

    // 尝试保持已打开的颜色选择器状态（如果条目仍在列表中）
    const pickingId = this.pickingColorId.value
    const stillExists = pickingId && newItems.some(i => i.id === pickingId)
    if (!stillExists) {
      this.pickingColorId.value = null
    }

    this.items.value = newItems
  }

  protected onDispose(): void {
    this.items.value = []
    this.isExpanded.value = false
    this.pickingColorId.value = null
    this.initialStates = []
  }

  // ============================================================
  // 操作
  // ============================================================

  /** 切换面板展开/收起 */
  private togglePanel(): void {
    this.isExpanded.value = !this.isExpanded.value
    if (!this.isExpanded.value) {
      this.pickingColorId.value = null
    }
  }

  /** 切换条目显隐 */
  private toggleVisibility(item: SceneTreeItem): void {
    const newVisible = !item.visible
    item.ref.setVisibility(newVisible)
    item.visible = newVisible
    this.ctx.render.render()
  }

  /** 设置条目透明度 */
  private setOpacity(item: SceneTreeItem, value: number): void {
    if (item.type !== 'actor') return // Volume 暂不支持透明度控制
    const opacity = Math.max(0, Math.min(1, value))
    ;(item.ref.getProperty() as any).setOpacity(opacity)
    item.opacity = opacity
    this.ctx.render.render()
  }

  /** 设置 Actor 颜色 */
  private setColor(item: SceneTreeItem, r: number, g: number, b: number): void {
    if (item.type !== 'actor') return
    const color: [number, number, number] = [
      Math.max(0, Math.min(1, r)),
      Math.max(0, Math.min(1, g)),
      Math.max(0, Math.min(1, b))
    ]
    ;(item.ref.getProperty() as any).setColor(...color)
    item.color = color
    this.pickingColorId.value = null
    this.ctx.render.render()
  }

  // ============================================================
  // 重置接口
  // ============================================================

  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetSceneTree',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: '将场景树各对象的可见性、透明度、颜色恢复到场景加载时的初始状态',
        execute: () => {
          const items = this.items.value
          if (items.length === 0) return

          let changed = false
          for (const item of items) {
            const initialState = findMatchingInitialState(item.ref, this.initialStates)
            if (!initialState) continue

            // 恢复可见性
            if (item.visible !== initialState.visible) {
              item.ref.setVisibility(initialState.visible)
              item.visible = initialState.visible
              changed = true
            }

            // 恢复透明度（仅 Actor）
            if (item.type === 'actor' && item.opacity !== initialState.opacity) {
              ;(item.ref.getProperty() as any).setOpacity(initialState.opacity)
              item.opacity = initialState.opacity
              changed = true
            }

            // 恢复颜色（仅 Actor）
            if (item.type === 'actor' && initialState.color && item.color) {
              const [cr, cg, cb] = initialState.color
              const [ir, ig, ib] = item.color
              if (cr !== ir || cg !== ig || cb !== ib) {
                ;(item.ref.getProperty() as any).setColor(cr, cg, cb)
                item.color = [cr, cg, cb]
                changed = true
              }
            }
          }

          if (changed) {
            this.ctx.render.render()
          }
        }
      }
    ]
  }

  // ============================================================
  // UI 插件接口
  // ============================================================

  isVisible(): boolean {
    return true // 始终可见，面板自身管理展开/收起
  }

  getPosition(): UIPluginPosition {
    return this.config.position ?? 'left'
  }

  // ============================================================
  // 渲染
  // ============================================================

  render(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const hasModels = self.ctx.scene.modelCount.value > 0
          const isExpanded = self.isExpanded.value
          const items = self.items.value
          const panelWidth = self.config.panelWidth ?? 280

          // 无模型时隐藏
          if (!hasModels) return null

          // ============================================================
          // 渲染单个条目
          // ============================================================
          function renderItem(item: SceneTreeItem): any {
            const isPickingColor = self.pickingColorId.value === item.id

            // ---- 可见性复选框 ----
            const checkbox = h('input', {
              type: 'checkbox',
              class: 'iimm-vtk-scene-item-checkbox',
              checked: item.visible,
              title: item.visible ? '隐藏' : '显示',
              onChange: () => self.toggleVisibility(item)
            })

            // ---- 类型图标 ----
            const typeLabel = h('span', {
              class: ['iimm-vtk-scene-item-type', `is-${item.type}`],
              innerHTML: item.type === 'actor' ? '&#9632;' : '&#9638;', // ■ / █
              title: item.type === 'actor' ? '几何体 (Actor)' : '体数据 (Volume)'
            })

            // ---- 名称 ----
            const nameEl = h('span', { class: 'iimm-vtk-scene-item-name' }, item.name)

            // ---- 不透明度滑块 ----
            const opacitySlider = h('div', { class: 'iimm-vtk-scene-item-opacity' }, [
              h('input', {
                type: 'range',
                class: 'iimm-vtk-scene-item-opacity-slider',
                min: 0,
                max: 100,
                value: Math.round(item.opacity * 100),
                title: `不透明度: ${Math.round(item.opacity * 100)}%`,
                onInput: (e: Event) => {
                  const val = parseInt((e.target as HTMLInputElement).value) / 100
                  self.setOpacity(item, val)
                }
              }),
              h(
                'span',
                { class: 'iimm-vtk-scene-item-opacity-value' },
                `${Math.round(item.opacity * 100)}%`
              )
            ])

            // ---- 颜色色块（仅 Actor） ----
            let colorSwatch: any = null
            if (item.type === 'actor' && item.color) {
              const [r, g, b] = item.color
              const hex = rgbToHex(r, g, b)
              colorSwatch = h('span', {
                class: 'iimm-vtk-scene-item-color',
                style: { backgroundColor: hex },
                title: `颜色: ${hex}`,
                onClick: (e: Event) => {
                  e.stopPropagation()
                  self.pickingColorId.value = isPickingColor ? null : item.id
                }
              })

              // ---- 颜色选择器弹出 ----
              if (isPickingColor) {
                colorSwatch = h(
                  'span',
                  {
                    class: ['iimm-vtk-scene-item-color', 'is-picking'],
                    style: { backgroundColor: hex },
                    title: `颜色: ${hex}`
                  },
                  [
                    // 颜色选择器弹窗
                    h(
                      'div',
                      {
                        class: 'iimm-vtk-scene-color-picker',
                        onClick: (e: Event) => e.stopPropagation()
                      },
                      [
                        // RGB 滑块
                        ...renderColorSlider('R', r, (v: number) => {
                          const c = item.color!
                          self.setColor(item, v, c[1], c[2])
                        }),
                        ...renderColorSlider('G', g, (v: number) => {
                          const c = item.color!
                          self.setColor(item, c[0], v, c[2])
                        }),
                        ...renderColorSlider('B', b, (v: number) => {
                          const c = item.color!
                          self.setColor(item, c[0], c[1], v)
                        }),
                        // 色块预览
                        h('span', {
                          class: 'iimm-vtk-scene-color-preview',
                          style: {
                            backgroundColor: rgbToHex(
                              item.color![0],
                              item.color![1],
                              item.color![2]
                            )
                          }
                        }),
                        // 关闭按钮
                        h(
                          'button',
                          {
                            class: 'iimm-vtk-scene-color-close',
                            onClick: () => {
                              self.pickingColorId.value = null
                            }
                          },
                          '确定'
                        )
                      ]
                    )
                  ]
                )
              }
            }

            return h(
              'div',
              {
                class: ['iimm-vtk-scene-item', `is-${item.type}`, { 'is-hidden': !item.visible }]
              },
              [
                h('div', { class: 'iimm-vtk-scene-item-row' }, [checkbox, typeLabel, nameEl]),
                h(
                  'div',
                  { class: 'iimm-vtk-scene-item-row' },
                  [opacitySlider, colorSwatch].filter(Boolean)
                )
              ]
            )
          }

          // ---- 面板主体 ----
          let panelContent: any[] = []

          if (isExpanded) {
            // ---- 头部 ----
            const header = h('div', { class: 'iimm-vtk-scene-header' }, [
              h('span', { class: 'iimm-vtk-scene-title' }, `场景树 (${items.length})`),
              h(
                'button',
                {
                  class: 'iimm-vtk-scene-close',
                  title: '收起面板',
                  onClick: () => self.togglePanel()
                },
                '\u2715'
              )
            ])

            // ---- 列表 ----
            let listContent: any
            if (items.length === 0) {
              listContent = h('div', { class: 'iimm-vtk-scene-empty' }, '暂无场景对象')
            } else {
              listContent = h('div', { class: 'iimm-vtk-scene-list' }, items.map(renderItem))
            }

            panelContent = [header, listContent]
          }

          // ---- 面板容器 ----
          const panel = h(
            'div',
            {
              class: ['iimm-vtk-scene-panel', { 'is-expanded': isExpanded }],
              style: {
                width: isExpanded ? `${panelWidth}px` : 'auto'
              }
            },
            isExpanded ? panelContent : []
          )

          // ---- 切换按钮（面板收起时显示在边缘） ----
          const isLeft = (self.config.position ?? 'left') === 'left'
          const toggleArrow = isExpanded
            ? isLeft
              ? '\u25C0'
              : '\u25B6' // ◀ (左面板展开→指向左) / ▶ (右面板展开→指向右)
            : isLeft
              ? '\u25B6'
              : '\u25C0' // ▶ (左面板收起→指向右) / ◀ (右面板收起→指向左)
          const toggleTitle = isExpanded ? '收起场景树' : '展开场景树'
          const toggleBtn = h(
            'button',
            {
              class: ['iimm-vtk-scene-toggle', { 'is-expanded': isExpanded }],
              title: toggleTitle,
              onClick: () => self.togglePanel()
            },
            toggleArrow
          )

          return h(
            'div',
            {
              class: [
                'iimm-vtk-scene-tree',
                `iimm-vtk-scene-tree--${self.config.position ?? 'left'}`
              ]
            },
            [panel, toggleBtn]
          )
        }
      }
    })
  }
}

// ============================================================
// 工具函数
// ============================================================

/**
 * 将归一化的 RGB (0-1) 转换为十六进制颜色字符串
 */
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * 渲染单个颜色通道滑块
 * @param label 通道标签（R/G/B）
 * @param value 当前值 (0-1)
 * @param onChange 值变化回调
 */
function renderColorSlider(label: string, value: number, onChange: (v: number) => void): any[] {
  return [
    h('div', { class: 'iimm-vtk-scene-color-slider-group' }, [
      h('label', { class: 'iimm-vtk-scene-color-slider-label' }, label),
      h('input', {
        type: 'range',
        class: 'iimm-vtk-scene-color-slider',
        min: 0,
        max: 255,
        value: Math.round(value * 255),
        onInput: (e: Event) => {
          onChange(parseInt((e.target as HTMLInputElement).value) / 255)
        }
      }),
      h('span', { class: 'iimm-vtk-scene-color-slider-value' }, String(Math.round(value * 255)))
    ])
  ]
}
