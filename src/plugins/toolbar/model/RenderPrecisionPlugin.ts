/**
 * 渲染精度插件
 * 调节模型渲染精度（LOD级别、边缘细化等）
 * 通过滑块控制渲染质量与性能的平衡
 */

import { defineComponent, h, ref } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { RenderPrecisionIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createDropdownAlignment,
  getDropdownAlignStyle,
  renderToolbarIcon
} from '@/plugins/toolbar/utils'

/** 渲染精度级别 */
export type PrecisionLevel = 'low' | 'medium' | 'high' | 'ultra'

/** 精度级别配置 */
interface PrecisionConfig {
  labelKey: string
  /** 多边形细分数（全局） */
  polygonDivision: number
  /** 边缘检测阈值（角度，度） */
  edgeAngle: number
  /** 是否启用抗锯齿 */
  antiAliasing: boolean
  /** 最大三角形数限制（0=无限制） */
  maxTriangles: number
}

/** 精度级别配置映射 */
const PRECISION_LEVELS: Record<PrecisionLevel, PrecisionConfig> = {
  low: {
    labelKey: 'vtkviewer.plugin.renderPrecision.level.low',
    polygonDivision: 4,
    edgeAngle: 30,
    antiAliasing: false,
    maxTriangles: 50000
  },
  medium: {
    labelKey: 'vtkviewer.plugin.renderPrecision.level.medium',
    polygonDivision: 8,
    edgeAngle: 20,
    antiAliasing: true,
    maxTriangles: 200000
  },
  high: {
    labelKey: 'vtkviewer.plugin.renderPrecision.level.high',
    polygonDivision: 16,
    edgeAngle: 10,
    antiAliasing: true,
    maxTriangles: 500000
  },
  ultra: {
    labelKey: 'vtkviewer.plugin.renderPrecision.level.ultra',
    polygonDivision: 32,
    edgeAngle: 5,
    antiAliasing: true,
    maxTriangles: 0
  }
}

/** 渲染精度插件配置 */
export interface RenderPrecisionPluginConfig extends ToolbarPluginConfig {
  /** 默认精度级别 */
  defaultLevel?: PrecisionLevel
  /** 是否默认在信息面板显示精度信息 */
  defaultShowInfo?: boolean
}

export class RenderPrecisionPlugin
  extends PluginBase<RenderPrecisionPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'renderPrecision',
    name: 'RenderPrecisionPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.renderPrecision.description')
  }

  readonly order = 6
  readonly defaultConfig: RenderPrecisionPluginConfig = {
    enabled: true,
    icon: RenderPrecisionIcon,
    hideWhenNoModel: false,
    defaultLevel: 'medium',
    defaultShowInfo: true
  }

  /** 当前精度级别 */
  private currentLevel = ref<PrecisionLevel>('medium')
  /** 是否展开面板 */
  private panelOpen = ref(false)

  /** 下拉弹窗对齐管理器（运行时自动根据按钮位置判断向左/向右展开） */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-render-precision')
  /** 自定义精度值（当使用自定义模式时） */
  private customPolygonDivision = ref(16)
  private customEdgeAngle = ref(10)
  private customAntiAliasing = ref(true)
  /** 是否在信息面板显示精度信息 */
  private showInPanel = ref(true)
  /** 是否使用自定义模式 */
  private useCustom = ref(false)
  /** 当前实际应用的三角形数 */
  private appliedTriangles = ref(0)
  /** 当前实际应用的顶点数 */
  private appliedVertices = ref(0)

  private boundHandleClickOutside = this.handleClickOutside.bind(this)

  protected onInit(): void {
    // 初始化默认精度
    const defaultLevel = this.config.defaultLevel ?? 'medium'
    this.currentLevel.value = defaultLevel
    this.applyPrecision(defaultLevel)

    // 注册信息面板
    this.showInPanel.value = this.config.defaultShowInfo !== false
    if (this.showInPanel.value) {
      this.registerInfoPanel()
    }

    // 监听模型加载事件，自动应用当前精度到新模型
    this.onEvent(BuiltinEvents.SCENE_LOADED, () => {
      if (this.useCustom.value) {
        this.applyCustomPrecision()
      } else {
        this.applyPrecision(this.currentLevel.value)
      }
    })

    this.setupOutsideClickListener(this.boundHandleClickOutside, true)
  }

  protected onDispose(): void {
    document.removeEventListener('click', this.boundHandleClickOutside)
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetRenderPrecision',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: '恢复渲染精度为默认级别',
        execute: () => this.resetPrecision()
      }
    ]
  }

  private handleClickOutside(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-render-precision')) {
      this.panelOpen.value = false
    }
  }

  /** 应用精度级别 */
  private applyPrecision(level: PrecisionLevel): void {
    const config = PRECISION_LEVELS[level]
    this.applyToRenderer(config)
    this.currentLevel.value = level
    this.useCustom.value = false
    this.updateAppliedStats()
  }

  /** 应用自定义精度 */
  private applyCustomPrecision(): void {
    const config: PrecisionConfig = {
      labelKey: 'vtkviewer.plugin.renderPrecision.level.custom',
      polygonDivision: this.customPolygonDivision.value,
      edgeAngle: this.customEdgeAngle.value,
      antiAliasing: this.customAntiAliasing.value,
      maxTriangles: 0
    }
    this.applyToRenderer(config)
    this.useCustom.value = true
    this.updateAppliedStats()
  }

  /** 将精度配置应用到渲染器 */
  private applyToRenderer(config: PrecisionConfig): void {
    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return

    // 遍历所有 actor，设置渲染精度
    const actors = this.ctx.scene.getActors()
    for (const actor of actors) {
      const mapper = actor.getMapper()
      if (!mapper) continue

      // 设置全局渲染参数
      // polygonDivision 影响 LOD 精度
      const m = mapper as any
      if (m.setGlobalResolveMultiPolygonLabels) {
        m.setGlobalResolveMultiPolygonLabels(true)
      }

      // 设置边缘角度（影响边缘检测）
      if (actor.getProperty?.()) {
        const prop = actor.getProperty()
        // 设置边缘可见性和角度
        if (prop.setEdgeVisibility) {
          prop.setEdgeVisibility(config.edgeAngle < 15)
        }
      }
    }

    // 设置渲染器抗锯齿
    const r = renderer as any
    if (r.setUseFXAA) {
      r.setUseFXAA(config.antiAliasing)
    }
    if (r.setUseSSAA) {
      r.setUseSSAA(config.antiAliasing && config.polygonDivision >= 16)
    }

    // 重新渲染
    this.ctx.render?.render()
  }

  /** 更新已应用的统计信息 */
  private updateAppliedStats(): void {
    let totalTriangles = 0
    let totalVertices = 0

    const actors = this.ctx.scene.getActors()
    for (const actor of actors) {
      const mapper = actor.getMapper()
      if (!mapper) continue

      const inputData = mapper.getInputData()
      if (!inputData) continue

      // 获取三角形数
      const polyData = inputData
      if (polyData.getNumberOfPolys) {
        totalTriangles += polyData.getNumberOfPolys()
      }
      if (polyData.getNumberOfPoints) {
        totalVertices += polyData.getNumberOfPoints()
      }
    }

    this.appliedTriangles.value = totalTriangles
    this.appliedVertices.value = totalVertices
  }

  /** 重置精度 */
  private resetPrecision(): void {
    const defaultLevel = this.config.defaultLevel ?? 'medium'
    this.applyPrecision(defaultLevel)
    // 恢复信息面板默认显示状态
    this.showInPanel.value = this.config.defaultShowInfo !== false
    if (this.showInPanel.value) {
      this.registerInfoPanel()
    } else {
      this.unregisterInfoPanel()
    }
  }

  /** 切换精度级别 */
  private setLevel(level: PrecisionLevel): void {
    this.applyPrecision(level)
  }

  /** 切换信息面板显示状态 */
  private toggleInfoPanel(): void {
    this.showInPanel.value = !this.showInPanel.value
    if (this.showInPanel.value) {
      this.registerInfoPanel()
    } else {
      this.unregisterInfoPanel()
    }
  }

  /** 注册信息面板 */
  private registerInfoPanel(): void {
    const self = this
    const infoComponent = defineComponent({
      setup() {
        return () => {
          const level = self.useCustom.value
            ? i18n.translate('vtkviewer.plugin.renderPrecision.level.custom')
            : i18n.translate(PRECISION_LEVELS[self.currentLevel.value].labelKey)
          const aa = self.useCustom.value
            ? self.customAntiAliasing.value
            : PRECISION_LEVELS[self.currentLevel.value].antiAliasing
          const aaText = aa
            ? i18n.translate('vtkviewer.plugin.renderPrecision.aa.on')
            : i18n.translate('vtkviewer.plugin.renderPrecision.aa.off')
          return h('div', { class: 'iimm-vtk-info-item' }, [
            h(
              'span',
              { class: 'iimm-vtk-info-label' },
              i18n.translate('vtkviewer.plugin.renderPrecision.info.label') + ':'
            ),
            h('span', { class: 'iimm-vtk-info-value--colored' }, level),
            h(
              'span',
              { class: 'iimm-vtk-info-label' },
              `${i18n.translate('vtkviewer.plugin.renderPrecision.info.aa')}: ${aaText}`
            ),
            h(
              'span',
              { class: 'iimm-vtk-info-label' },
              `${i18n.translate('vtkviewer.plugin.renderPrecision.info.triangles')}: ${(self.appliedTriangles.value / 1000).toFixed(1)}K`
            ),
            h(
              'span',
              { class: 'iimm-vtk-info-label' },
              `${i18n.translate('vtkviewer.plugin.renderPrecision.info.vertices')}: ${(self.appliedVertices.value / 1000).toFixed(1)}K`
            )
          ])
        }
      }
    })

    this.registerInfoPanelItem({
      component: infoComponent,
      priority: 6,
      visibleCheck: () =>
        self.showInPanel.value &&
        (!self.config.hideWhenNoModel || self.ctx.scene.modelCount.value > 0)
    })
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const btn = h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.showInPanel.value }],
              title: `${i18n.translate('vtkviewer.plugin.renderPrecision.info.label')}: ${self.useCustom.value ? i18n.translate('vtkviewer.plugin.renderPrecision.level.custom') : i18n.translate(PRECISION_LEVELS[self.currentLevel.value].labelKey)}`,
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                self.panelOpen.value = !self.panelOpen.value
                if (self.panelOpen.value) {
                  self.dropdownAlignment.update()
                }
              }
            },
            renderToolbarIcon(self.config.icon) ?? ''
          )

          // 仅在展开时渲染面板
          if (!self.panelOpen.value) {
            return h('div', { class: 'iimm-vtk-toolbar-item iimm-vtk-render-precision' }, [btn])
          }

          const currentConfig = self.useCustom.value
            ? {
                polygonDivision: self.customPolygonDivision.value,
                edgeAngle: self.customEdgeAngle.value,
                antiAliasing: self.customAntiAliasing.value
              }
            : PRECISION_LEVELS[self.currentLevel.value]

          const panel = h(
            'div',
            {
              class: 'iimm-vtk-settings-panel',
              style: getDropdownAlignStyle(self.dropdownAlignment.align.value),
              onClick: (e: MouseEvent) => e.stopPropagation()
            },
            [
              // 标题
              h(
                'div',
                {
                  class: 'iimm-vtk-popup-row',
                  style: {
                    borderBottom: '1px solid var(--iimm-vtk-popup-border-color)',
                    paddingBottom: '6px'
                  }
                },
                [
                  h(
                    'span',
                    { class: 'iimm-vtk-popup-title' },
                    i18n.translate('vtkviewer.plugin.renderPrecision.panel.title')
                  )
                ]
              ),

              // 信息显示开关（单独区域）
              h(
                'div',
                {
                  class: 'iimm-vtk-popup-section',
                  style: {
                    borderBottom: '1px solid var(--iimm-vtk-popup-border-color)',
                    paddingBottom: '8px'
                  }
                },
                [
                  h('div', { class: 'iimm-vtk-popup-row' }, [
                    h(
                      'label',
                      { class: 'iimm-vtk-popup-label' },
                      i18n.translate('vtkviewer.plugin.renderPrecision.panel.showInfo')
                    ),
                    h(
                      'button',
                      {
                        class: ['iimm-vtk-popup-btn', { 'is-primary': self.showInPanel.value }],
                        onClick: () => self.toggleInfoPanel()
                      },
                      self.showInPanel.value
                        ? i18n.translate('vtkviewer.plugin.renderPrecision.show.on')
                        : i18n.translate('vtkviewer.plugin.renderPrecision.show.off')
                    )
                  ])
                ]
              ),

              // 精度级别选择
              h('div', { class: 'iimm-vtk-popup-section' }, [
                h('div', { class: 'iimm-vtk-popup-row' }, [
                  h(
                    'label',
                    { class: 'iimm-vtk-popup-label' },
                    i18n.translate('vtkviewer.plugin.renderPrecision.panel.level')
                  )
                ]),
                h(
                  'div',
                  { class: 'iimm-vtk-popup-row', style: { flexWrap: 'wrap', gap: '4px' } },
                  (['low', 'medium', 'high', 'ultra'] as PrecisionLevel[]).map(level =>
                    h(
                      'button',
                      {
                        class: [
                          'iimm-vtk-popup-btn',
                          {
                            'is-primary': !self.useCustom.value && self.currentLevel.value === level
                          }
                        ],
                        onClick: () => self.setLevel(level)
                      },
                      i18n.translate(PRECISION_LEVELS[level].labelKey)
                    )
                  )
                )
              ]),

              // 自定义精度控制
              h('div', { class: 'iimm-vtk-popup-section' }, [
                h('div', { class: 'iimm-vtk-popup-row' }, [
                  h(
                    'label',
                    { class: 'iimm-vtk-popup-label' },
                    i18n.translate('vtkviewer.plugin.renderPrecision.panel.polygonDivision')
                  ),
                  h(
                    'span',
                    { class: 'iimm-vtk-popup-value-accent' },
                    String(
                      self.useCustom.value
                        ? self.customPolygonDivision.value
                        : currentConfig.polygonDivision
                    )
                  )
                ]),
                h('input', {
                  class: 'iimm-vtk-popup-slider',
                  type: 'range',
                  min: '1',
                  max: '64',
                  step: '1',
                  value: String(
                    self.useCustom.value
                      ? self.customPolygonDivision.value
                      : currentConfig.polygonDivision
                  ),
                  onInput: (e: Event) => {
                    self.customPolygonDivision.value = parseInt(
                      (e.target as HTMLInputElement).value
                    )
                    self.applyCustomPrecision()
                  }
                })
              ]),

              h('div', { class: 'iimm-vtk-popup-section' }, [
                h('div', { class: 'iimm-vtk-popup-row' }, [
                  h(
                    'label',
                    { class: 'iimm-vtk-popup-label' },
                    i18n.translate('vtkviewer.plugin.renderPrecision.panel.edgeAngle')
                  ),
                  h(
                    'span',
                    { class: 'iimm-vtk-popup-value-accent' },
                    `${self.useCustom.value ? self.customEdgeAngle.value : currentConfig.edgeAngle}°`
                  )
                ]),
                h('input', {
                  class: 'iimm-vtk-popup-slider',
                  type: 'range',
                  min: '1',
                  max: '45',
                  step: '1',
                  value: String(
                    self.useCustom.value ? self.customEdgeAngle.value : currentConfig.edgeAngle
                  ),
                  onInput: (e: Event) => {
                    self.customEdgeAngle.value = parseInt((e.target as HTMLInputElement).value)
                    self.applyCustomPrecision()
                  }
                })
              ]),

              // 抗锯齿开关
              h('div', { class: 'iimm-vtk-popup-row' }, [
                h(
                  'label',
                  { class: 'iimm-vtk-popup-label' },
                  i18n.translate('vtkviewer.plugin.renderPrecision.panel.antiAliasing')
                ),
                h(
                  'button',
                  {
                    class: [
                      'iimm-vtk-popup-btn',
                      {
                        'is-primary': self.useCustom.value
                          ? self.customAntiAliasing.value
                          : currentConfig.antiAliasing
                      }
                    ],
                    onClick: () => {
                      if (self.useCustom.value) {
                        self.customAntiAliasing.value = !self.customAntiAliasing.value
                      } else {
                        self.customAntiAliasing.value = !currentConfig.antiAliasing
                      }
                      self.applyCustomPrecision()
                    }
                  },
                  (
                    self.useCustom.value
                      ? self.customAntiAliasing.value
                      : currentConfig.antiAliasing
                  )
                    ? i18n.translate('vtkviewer.plugin.renderPrecision.aa.on')
                    : i18n.translate('vtkviewer.plugin.renderPrecision.aa.off')
                )
              ]),

              // 分隔线和重置按钮
              h('hr', { class: 'iimm-vtk-popup-divider' }),
              h(
                'button',
                {
                  class: 'iimm-vtk-popup-btn',
                  style: { width: '100%' },
                  onClick: () => self.resetPrecision()
                },
                i18n.translate('vtkviewer.plugin.renderPrecision.panel.reset')
              )
            ]
          )

          return h('div', { class: 'iimm-vtk-toolbar-item iimm-vtk-render-precision' }, [
            btn,
            panel
          ])
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return []
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return []
  }
}
