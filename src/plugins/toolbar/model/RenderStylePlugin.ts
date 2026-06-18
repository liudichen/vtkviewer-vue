/**
 * 渲染样式插件
 * 控制网格的渲染模式、边缘、透明度等外观属性
 */

import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { RenderStyleIcon, SurfaceIcon, WireframeIcon, PointIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  type ToolbarIconConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 渲染模式 */
type RepresentationMode = 'surface' | 'wireframe' | 'points' | 'surface-with-edges'

/** 插值方式 */
type InterpolationMode = 'flat' | 'gouraud' | 'phong'

/** 渲染样式插件配置 */
export interface RenderStylePluginConfig extends ToolbarPluginConfig {
  /** 默认渲染模式 */
  defaultRepresentation?: RepresentationMode
  /** 默认透明度 (0-1) */
  defaultOpacity?: number
  /** 默认点大小 */
  defaultPointSize?: number
  /** 默认线宽 */
  defaultLineWidth?: number
  /** 是否显示边缘 */
  showEdges?: boolean
  /** 边缘颜色 [r, g, b] (0-255) */
  edgeColor?: [number, number, number]
  /** 是否启用光照 */
  enableLighting?: boolean
  /** 插值方式 */
  interpolation?: InterpolationMode
}

/** 渲染模式选项 */
const REPRESENTATION_OPTIONS: { value: RepresentationMode; label: string }[] = [
  { value: 'surface', label: '实体' },
  { value: 'wireframe', label: '线框' },
  { value: 'points', label: '点云' },
  { value: 'surface-with-edges', label: '实体+边缘' }
]

/** 插值方式选项 */
const INTERPOLATION_OPTIONS: { value: InterpolationMode; label: string }[] = [
  { value: 'flat', label: '平面' },
  { value: 'gouraud', label: '高洛德' },
  { value: 'phong', label: '冯氏' }
]

export class RenderStylePlugin
  extends PluginBase<RenderStylePluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'renderStyle',
    name: 'RenderStylePlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.renderStyle.description')
  }

  readonly order = 3
  readonly defaultConfig: RenderStylePluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    icon: {
      default: RenderStyleIcon,
      states: {
        surface: SurfaceIcon,
        wireframe: WireframeIcon,
        points: PointIcon,
        'surface-with-edges': RenderStyleIcon
      }
    },
    defaultRepresentation: 'surface',
    defaultOpacity: 1.0,
    defaultPointSize: 3,
    defaultLineWidth: 1,
    showEdges: false,
    edgeColor: [0, 0, 0],
    enableLighting: true,
    interpolation: 'gouraud'
  }

  /** 当前渲染模式 */
  private representation = ref<RepresentationMode>('surface')
  /** 当前透明度 */
  private opacity = ref(1.0)
  /** 当前点大小 */
  private pointSize = ref(3)
  /** 当前线宽 */
  private lineWidth = ref(1)
  /** 是否显示边缘 */
  private showEdges = ref(false)
  /** 边缘颜色 */
  private edgeColor = ref<[number, number, number]>([0, 0, 0])
  /** 是否启用光照 */
  private enableLighting = ref(true)
  /** 当前插值方式 */
  private interpolation = ref<InterpolationMode>('gouraud')
  /** 是否展开面板 */
  private panelOpen = ref(false)

  protected onInit(): void {
    // 从配置初始化默认值
    this.representation.value = this.config.defaultRepresentation ?? 'surface'
    this.opacity.value = this.config.defaultOpacity ?? 1.0
    this.pointSize.value = this.config.defaultPointSize ?? 3
    this.lineWidth.value = this.config.defaultLineWidth ?? 1
    this.showEdges.value = this.config.showEdges ?? false
    this.edgeColor.value = this.config.edgeColor ?? [0, 0, 0]
    this.enableLighting.value = this.config.enableLighting ?? true
    this.interpolation.value = this.config.interpolation ?? 'gouraud'

    // 监听场景加载事件，应用当前设置
    this.onEvent(BuiltinEvents.SCENE_LOADED, () => this.applyAllProperties())
    // 监听场景清除事件，重置到默认状态
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => this.resetToDefaults())
    // 监听全局重置事件，确保渲染样式被重置
    this.onEvent(BuiltinEvents.RESET_START, () => {
      this.resetToDefaults()
      this.applyAllProperties()
    })
  }

  /** 应用所有属性到场景中的 Actor */
  private applyAllProperties(): void {
    const actors = this.ctx.scene.getActors()
    for (const actor of actors) {
      this.applyPropertiesToActor(actor)
    }
    this.ctx.render.render()
  }

  /** 应用属性到单个 Actor */
  private applyPropertiesToActor(actor: any): void {
    const property = actor.getProperty()
    if (!property) return

    // 渲染模式
    switch (this.representation.value) {
      case 'surface':
        property.setRepresentationToSurface()
        property.setEdgeVisibility(false)
        break
      case 'wireframe':
        property.setRepresentationToWireframe()
        property.setEdgeVisibility(false)
        break
      case 'points':
        property.setRepresentationToPoints()
        property.setEdgeVisibility(false)
        break
      case 'surface-with-edges':
        property.setRepresentationToSurface()
        property.setEdgeVisibility(true)
        break
    }

    // 透明度
    property.setOpacity(this.opacity.value)

    // 点大小
    property.setPointSize(this.pointSize.value)

    // 线宽
    property.setLineWidth(this.lineWidth.value)

    // 边缘颜色
    if (this.showEdges.value || this.representation.value === 'surface-with-edges') {
      const [r, g, b] = this.edgeColor.value
      property.setEdgeColor(r / 255, g / 255, b / 255)
    }

    // 光照
    property.setLighting(this.enableLighting.value)

    // 插值方式
    switch (this.interpolation.value) {
      case 'flat':
        property.setInterpolationToFlat()
        break
      case 'gouraud':
        property.setInterpolationToGouraud()
        break
      case 'phong':
        property.setInterpolationToPhong()
        break
    }
  }

  /** 设置渲染模式 */
  private setRepresentation(mode: RepresentationMode): void {
    this.representation.value = mode
    this.applyAllProperties()
  }

  /** 设置透明度 */
  private setOpacity(value: number): void {
    this.opacity.value = Math.max(0, Math.min(1, value))
    this.applyAllProperties()
  }

  /** 设置点大小 */
  private setPointSize(value: number): void {
    this.pointSize.value = Math.max(1, Math.min(20, value))
    this.applyAllProperties()
  }

  /** 设置线宽 */
  private setLineWidth(value: number): void {
    this.lineWidth.value = Math.max(1, Math.min(10, value))
    this.applyAllProperties()
  }

  /** 切换边缘显示 */
  private toggleEdges(): void {
    this.showEdges.value = !this.showEdges.value
    if (this.showEdges.value) {
      this.representation.value = 'surface-with-edges'
    } else {
      this.representation.value = 'surface'
    }
    this.applyAllProperties()
  }

  /** 设置光照 */
  private setLighting(enabled: boolean): void {
    this.enableLighting.value = enabled
    this.applyAllProperties()
  }

  /** 设置插值方式 */
  private setInterpolation(mode: InterpolationMode): void {
    this.interpolation.value = mode
    this.applyAllProperties()
  }

  /** 获取当前图标配置（含多状态图标） */
  private getIconConfig(): ToolbarIconConfig {
    return this.config.icon as ToolbarIconConfig
  }

  /** 重置所有设置到默认值 */
  private resetToDefaults(): void {
    this.representation.value = this.config.defaultRepresentation ?? 'surface'
    this.opacity.value = this.config.defaultOpacity ?? 1.0
    this.pointSize.value = this.config.defaultPointSize ?? 3
    this.lineWidth.value = this.config.defaultLineWidth ?? 1
    this.showEdges.value = this.config.showEdges ?? false
    this.edgeColor.value = this.config.edgeColor ?? [0, 0, 0]
    this.enableLighting.value = this.config.enableLighting ?? true
    this.interpolation.value = this.config.interpolation ?? 'gouraud'
    this.panelOpen.value = false
  }

  /** 切换面板展开状态 */
  private togglePanel(): void {
    this.panelOpen.value = !this.panelOpen.value
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetRenderStyle',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.renderStyle.resetDesc'),
        execute: () => {
          this.resetToDefaults()
          this.applyAllProperties()
        }
      }
    ]
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        const containerEl = ref<HTMLElement | null>(null)

        const handleDocumentClick = (e: MouseEvent) => {
          if (!self.panelOpen.value) return
          if (containerEl.value && !containerEl.value.contains(e.target as Node)) {
            self.panelOpen.value = false
          }
        }

        onMounted(() => {
          document.addEventListener('click', handleDocumentClick, true)
        })
        onUnmounted(() => {
          document.removeEventListener('click', handleDocumentClick, true)
        })

        return () => {
          const hasModel = self.ctx.scene.hasModels()
          const repLabelMap: Record<string, string> = {
            surface: i18n.translate('vtkviewer.plugin.renderStyle.mode.surface'),
            wireframe: i18n.translate('vtkviewer.plugin.renderStyle.mode.wireframe'),
            points: i18n.translate('vtkviewer.plugin.renderStyle.mode.points'),
            'surface-with-edges': i18n.translate('vtkviewer.plugin.renderStyle.mode.surfaceEdges')
          }
          const interpLabelMap: Record<string, string> = {
            flat: i18n.translate('vtkviewer.plugin.renderStyle.lighting.flat'),
            gouraud: i18n.translate('vtkviewer.plugin.renderStyle.lighting.gouraud'),
            phong: i18n.translate('vtkviewer.plugin.renderStyle.lighting.phong')
          }

          return h(
            'div',
            {
              ref: containerEl,
              class: 'iimm-vtk-toolbar-item'
            },
            [
              // 主按钮
              h(
                'button',
                {
                  class: ['iimm-vtk-toolbar-btn', { 'is-active': self.panelOpen.value }],
                  title: i18n.translate('vtkviewer.plugin.renderStyle.title'),
                  onClick: () => self.togglePanel()
                },
                renderToolbarIcon(self.getIconConfig(), self.representation.value) ?? ''
              ),

              // 展开面板
              self.panelOpen.value && hasModel
                ? h(
                    'div',
                    {
                      class: 'iimm-vtk-settings-panel'
                    },
                    [
                      // 标题行（复用统一弹窗header样式）
                      h('div', { class: 'iimm-vtk-popup-header' }, [
                        h(
                          'span',
                          { class: 'iimm-vtk-popup-title' },
                          i18n.translate('vtkviewer.plugin.renderStyle.title')
                        )
                      ]),
                      // 渲染模式选择
                      h('div', { class: 'iimm-vtk-popup-section' }, [
                        h(
                          'label',
                          { class: 'iimm-vtk-popup-label' },
                          i18n.translate('vtkviewer.plugin.renderStyle.title')
                        ),
                        h(
                          'select',
                          {
                            class: 'iimm-vtk-popup-select',
                            value: self.representation.value,
                            style: { width: '100%' },
                            onChange: (e: Event) => {
                              self.setRepresentation(
                                (e.target as HTMLSelectElement).value as RepresentationMode
                              )
                            }
                          },
                          REPRESENTATION_OPTIONS.map(opt =>
                            h('option', { value: opt.value }, repLabelMap[opt.value] ?? opt.label)
                          )
                        )
                      ]),

                      // 透明度滑块
                      h('div', { class: 'iimm-vtk-popup-section' }, [
                        h(
                          'label',
                          {
                            class: 'iimm-vtk-popup-label',
                            style: { display: 'flex', justifyContent: 'space-between' }
                          },
                          [
                            h('span', {}, i18n.translate('vtkviewer.plugin.renderStyle.opacity')),
                            h(
                              'span',
                              { style: { opacity: '0.7' } },
                              `${Math.round(self.opacity.value * 100)}%`
                            )
                          ]
                        ),
                        h('input', {
                          class: 'iimm-vtk-popup-slider',
                          type: 'range',
                          min: '0',
                          max: '100',
                          value: String(Math.round(self.opacity.value * 100)),
                          onInput: (e: Event) => {
                            self.setOpacity(Number((e.target as HTMLInputElement).value) / 100)
                          }
                        })
                      ]),

                      // 点大小滑块
                      h('div', { class: 'iimm-vtk-popup-section' }, [
                        h(
                          'label',
                          {
                            class: 'iimm-vtk-popup-label',
                            style: { display: 'flex', justifyContent: 'space-between' }
                          },
                          [
                            h('span', {}, i18n.translate('vtkviewer.plugin.renderStyle.pointSize')),
                            h('span', { style: { opacity: '0.7' } }, `${self.pointSize.value}`)
                          ]
                        ),
                        h('input', {
                          class: 'iimm-vtk-popup-slider',
                          type: 'range',
                          min: '1',
                          max: '20',
                          value: String(self.pointSize.value),
                          onInput: (e: Event) => {
                            self.setPointSize(Number((e.target as HTMLInputElement).value))
                          }
                        })
                      ]),

                      // 线宽滑块
                      h('div', { class: 'iimm-vtk-popup-section' }, [
                        h(
                          'label',
                          {
                            class: 'iimm-vtk-popup-label',
                            style: { display: 'flex', justifyContent: 'space-between' }
                          },
                          [
                            h('span', {}, i18n.translate('vtkviewer.plugin.renderStyle.edgeWidth')),
                            h('span', { style: { opacity: '0.7' } }, `${self.lineWidth.value}`)
                          ]
                        ),
                        h('input', {
                          class: 'iimm-vtk-popup-slider',
                          type: 'range',
                          min: '1',
                          max: '10',
                          value: String(self.lineWidth.value),
                          onInput: (e: Event) => {
                            self.setLineWidth(Number((e.target as HTMLInputElement).value))
                          }
                        })
                      ]),

                      // 边缘显示开关
                      h('div', { class: 'iimm-vtk-popup-row' }, [
                        h(
                          'label',
                          { class: 'iimm-vtk-popup-label' },
                          i18n.translate('vtkviewer.plugin.renderStyle.showEdges')
                        ),
                        h(
                          'button',
                          {
                            class: ['iimm-vtk-popup-btn', { 'is-primary': self.showEdges.value }],
                            onClick: () => self.toggleEdges()
                          },
                          self.showEdges.value
                            ? i18n.translate('vtkviewer.plugin.renderStyle.on')
                            : i18n.translate('vtkviewer.plugin.renderStyle.off')
                        )
                      ]),

                      // 光照开关
                      h('div', { class: 'iimm-vtk-popup-row' }, [
                        h(
                          'label',
                          { class: 'iimm-vtk-popup-label' },
                          i18n.translate('vtkviewer.plugin.renderStyle.lighting')
                        ),
                        h(
                          'button',
                          {
                            class: [
                              'iimm-vtk-popup-btn',
                              { 'is-primary': self.enableLighting.value }
                            ],
                            onClick: () => self.setLighting(!self.enableLighting.value)
                          },
                          self.enableLighting.value
                            ? i18n.translate('vtkviewer.plugin.renderStyle.on')
                            : i18n.translate('vtkviewer.plugin.renderStyle.off')
                        )
                      ]),

                      // 插值方式选择
                      h('div', { class: 'iimm-vtk-popup-section', style: { marginBottom: '0' } }, [
                        h(
                          'label',
                          { class: 'iimm-vtk-popup-label' },
                          i18n.translate('vtkviewer.plugin.renderStyle.interpolation')
                        ),
                        h(
                          'select',
                          {
                            class: 'iimm-vtk-popup-select',
                            value: self.interpolation.value,
                            style: { width: '100%' },
                            onChange: (e: Event) => {
                              self.setInterpolation(
                                (e.target as HTMLSelectElement).value as InterpolationMode
                              )
                            }
                          },
                          INTERPOLATION_OPTIONS.map(opt =>
                            h(
                              'option',
                              { value: opt.value },
                              interpLabelMap[opt.value] ?? opt.label
                            )
                          )
                        )
                      ])
                    ]
                  )
                : null
            ]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'renderStyle',
      i18n.translate('vtkviewer.plugin.renderStyle.name')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.togglePanel(),
      description: s.description
    }))
  }
}
