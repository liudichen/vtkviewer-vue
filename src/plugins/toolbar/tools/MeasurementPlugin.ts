/**
 * 测量插件
 * 支持点拾取、距离测量、角度测量
 *
 * UI 布局：
 *   - 工具栏图标：测量功能开关
 *   - 扩展区（测量启用时显示）：测量模式选择下拉菜单（点、距离、角度）
 *
 * 测量模式：
 *   - 点模式：1个点1组，最多4组，记录满后清空重新开始
 *   - 距离模式：2个点1组，最多2组，记录满后清空重新开始
 *   - 角度模式：3个点1组，最多1组，记录满后清空重新开始
 *
 * 颜色方案：
 *   - 第1组：红色
 *   - 第2组：绿色
 *   - 第3组：蓝色
 *   - 第4组：黄色
 */

import { defineComponent, h, ref, markRaw, watch, type Component } from 'vue'

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker'
import vtkLineSource from '@kitware/vtk.js/Filters/Sources/LineSource'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource'
import vtkTubeFilter from '@kitware/vtk.js/Filters/General/TubeFilter'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { MeasurementDistanceIcon, MeasurementPointIcon, MeasurementAngleIcon } from '@/icons'
import { safeDeleteVtkObject } from '@/utils'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createIconConfig,
  renderToolbarIcon,
  normalizeShortcutConfig
} from '@/plugins/toolbar/utils'

/** 测量类型 */
export type MeasurementType = 'point' | 'distance' | 'angle'

/** 测量模式配置 */
interface MeasurementModeConfig {
  /** 每组需要的点数 */
  pointsPerGroup: number
  /** 最大组数 */
  maxGroups: number
  /** 模式图标 */
  icon: any
  /** 模式名称 */
  label: string
}

/** 测量模式配置映射 */
const MEASUREMENT_MODES: Record<MeasurementType, MeasurementModeConfig> = {
  point: { pointsPerGroup: 1, maxGroups: 4, icon: MeasurementPointIcon, label: '点' },
  distance: { pointsPerGroup: 2, maxGroups: 2, icon: MeasurementDistanceIcon, label: '距离' },
  angle: { pointsPerGroup: 3, maxGroups: 1, icon: MeasurementAngleIcon, label: '角度' }
}

/** 颜色方案（不同组使用不同颜色） */
const GROUP_COLORS: [number, number, number][] = [
  [1, 0, 0], // 红色
  [0, 1, 0], // 绿色
  [0, 0, 1], // 蓝色
  [1, 1, 0] // 黄色
]

/** 测量组数据 */
interface MeasurementGroup {
  /** 组索引 */
  index: number
  /** 已拾取的点 */
  points: [number, number, number][]
  /** 球体标记 Actor 列表 */
  markers: any[]
  /** 连线 Actor 列表 */
  lineActors: any[]
  /** 预览线 Actor */
  previewLineActor: any
  /** 颜色 */
  color: [number, number, number]
  /** 是否完成 */
  completed: boolean
}

/** 测量结果 */
interface MeasurementResult {
  id: string
  type: MeasurementType
  value: number
  unit: string
  points: [number, number, number][]
  groupIndex: number
}

/** 测量插件配置 */
export interface MeasurementPluginConfig extends ToolbarPluginConfig {
  /** 默认测量类型 */
  defaultType?: MeasurementType
  /** 测量模式配置 */
  modeConfig?: Record<MeasurementType, MeasurementModeConfig>
  /** 颜色方案，依次为第1组、第2组、第3组、第4组... */
  colors?: [number, number, number][]
  /** 标记半径比例,默认0.003*/
  markerRadiusRatio?: number
  /** 管线半径比例,默认0.0015*/
  tubeRadiusRatio?: number
}

export class MeasurementPlugin
  extends PluginBase<MeasurementPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'measurement',
    name: 'MeasurementPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.measurement.description')
  }

  readonly order = 0
  readonly defaultConfig: MeasurementPluginConfig = {
    enabled: true,
    shortcut: [
      // { action: 'point', description: '点拾取', key: 'P' },
      // { action: 'distance', description: '距离测量', key: 'M' },
      // { action: 'angle', description: '角度测量', key: 'G' },
    ],
    defaultType: 'point',
    icon: createIconConfig(MeasurementPointIcon, undefined, undefined, {
      point: MeasurementPointIcon,
      distance: MeasurementDistanceIcon,
      angle: MeasurementAngleIcon
    }),
    hideWhenNoModel: true,
    infoPanelPriority: 10,
    toolbarExtensionPriority: 10
  }

  /** 测量是否启用（响应式） */
  private enabled = ref(false)
  /** 当前测量模式（响应式） */
  private activeType = ref<MeasurementType>('point')
  /** 测量结果列表（响应式） */
  private measurements = ref<MeasurementResult[]>([])

  // === VTK 资源 ===
  /** 拾取器 */
  private cellPicker: any = null
  /** 左键点击事件订阅句柄 */
  private clickSubscription: any = null
  /** 鼠标移动事件订阅句柄 */
  private mouseMoveSubscription: any = null
  /** 测量 ID 计数器 */
  private measurementIdCounter = 0

  /** 测量组数据 */
  private groups: MeasurementGroup[] = []

  /** extension watcher 停止函数（locale 变更时先停止旧 watcher 再重新注册） */
  private extensionWatcher: (() => void) | null = null

  protected onInit(): void {
    if (this.getConfig('defaultActive') !== undefined) {
      this.enabled.value = !!this.getConfig('defaultActive')
    }
    // 监听渲染管线就绪事件，初始化拾取器
    this.onEvent(BuiltinEvents.PLUGINS_INITIALIZED, () => {
      this.initMeasurement()
    })

    // 注册命令
    this.registerCommand('measurement:toggle', {
      execute: () => this.toggleMeasurement()
    })
    this.registerCommand('measurement:setType', {
      execute: (type: MeasurementType) => this.setMeasurementType(type)
    })
    this.registerCommand('measurement:clear', {
      execute: () => this.clearMeasurements()
    })

    // 注册测量结果信息面板
    this.registerInfoPanel()

    // 注册扩展区（测量模式选择下拉菜单）
    this.registerExtension()

    // 监听点拾取开始事件，自动关闭测量（互斥）
    this.onEvent(BuiltinEvents.COLORBY_PICKING_START, () => {
      this.disableMeasurement()
    })

    // 监听模型数量变化，无模型时注销扩展区和信息面板
    const unwatchModelCount = watch(
      () => this.ctx.scene.modelCount.value,
      (count: number) => {
        if (count === 0) {
          this.clearMeasurements()
          this.enabled.value = false
        } else {
          if (!this.ctx.infoPanel.has('measurement')) {
            this.registerInfoPanel()
          }
          if (!this.ctx.toolbarExtension.has('measurement')) {
            this.registerExtension()
          }
        }
      }
    )
    this.ctx.disposal.register(unwatchModelCount)
  }

  protected onDispose(): void {
    // 注销信息面板

    // 注销扩展区

    // 退出测量模式并清理 VTK 资源
    this.disableMeasurement()
    safeDeleteVtkObject(this.cellPicker)
    this.cellPicker = null
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'clear',
        scope: ResetScope.INDEPENDENT,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.measurement.resetDesc.clear'),
        priority: 100,
        execute: () => {
          this.clearMeasurements()
          this.activeType.value = this.config.defaultType ?? 'point'
        }
      },
      {
        name: 'deactivate',
        scope: ResetScope.CONDITIONAL,
        description: i18n.translate('vtkviewer.plugin.measurement.resetDesc.deactivate'),
        priority: 150,
        guard: {
          predicate: () => this.enabled.value,
          skipReason: i18n.translate('vtkviewer.plugin.measurement.noSession')
        },
        execute: () => {
          this.disableMeasurement()
        }
      }
    ]
  }

  // ============================================================
  //  初始化
  // ============================================================

  /** 初始化测量工具（渲染管线就绪后调用） */
  private initMeasurement(): void {
    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) {
      this.debugWarn(`[${this.metadata.name}] renderer not available, skip init`)
      return
    }

    // 初始化拾取器
    this.cellPicker = vtkCellPicker.newInstance()
    this.cellPicker.setTolerance(0.001)
  }

  // ============================================================
  //  测量模式切换
  // ============================================================

  /** 切换测量启用状态 */
  private toggleMeasurement(): void {
    if (this.enabled.value) {
      this.disableMeasurement()
    } else {
      this.enableMeasurement()
    }
  }

  /** 启用测量模式 */
  private enableMeasurement(): void {
    const interactor = this.ctx.render?.getInteractor()
    const container = this.ctx.render?.getContainer()
    if (!interactor) {
      this.debugWarn(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.measurement.interactorNotAvailable')}`
      )
      return
    }

    // 清空现有数据
    this.clearAllGroups()
    this.measurements.value = []

    // 注册信息面板（如果尚未注册）
    if (!this.ctx.infoPanel.has('measurement')) {
      this.registerInfoPanel()
    }

    this.enabled.value = true

    // 触发测量开始事件（用于与其他功能互斥）
    this.ctx.events.emit(BuiltinEvents.MEASUREMENT_START)

    // 订阅鼠标事件
    this.clickSubscription = interactor.onLeftButtonPress(this.handleClickPick)
    // this.mouseMoveSubscription = interactor.onMouseMove(this.handleMouseMove)

    // 光标变十字
    if (container) {
      container.style.cursor = 'crosshair'
    }
  }

  /** 禁用测量模式 */
  private disableMeasurement(): void {
    // 移除事件订阅
    if (this.clickSubscription) {
      this.clickSubscription.unsubscribe()
      this.clickSubscription = null
    }
    if (this.mouseMoveSubscription) {
      this.mouseMoveSubscription.unsubscribe()
      this.mouseMoveSubscription = null
    }

    // 恢复光标
    const container = this.ctx.render?.getContainer()
    if (container) {
      container.style.cursor = 'default'
    }

    // 清理所有组的临时标记
    this.clearAllGroups()

    // 清除测量结果并注销信息面板
    this.measurements.value = []
    this.measurementIdCounter = 0

    this.enabled.value = false
    this.ctx.render?.render()
  }

  /** 设置测量类型 */
  private setMeasurementType(type: MeasurementType): void {
    if (this.activeType.value === type) return

    // 切换模式时清空数据
    this.clearMeasurements()
    this.measurements.value = []

    this.activeType.value = type
  }

  /** 清除所有测量结果 */
  private clearMeasurements(): void {
    this.clearAllGroups()
    this.measurements.value = []
    this.measurementIdCounter = 0

    this.ctx.events.emit(BuiltinEvents.MEASUREMENT_CLEAR)
    this.ctx.render?.render()
  }

  // ============================================================
  //  测量组管理
  // ============================================================

  /** 获取当前模式配置 */
  private getModeConfig(): MeasurementModeConfig {
    const type = this.activeType.value as MeasurementType
    return MEASUREMENT_MODES[type]
  }

  /** 获取当前组 */
  private getCurrentGroup(): MeasurementGroup | null {
    const config = this.getModeConfig()
    const maxGroups = config.maxGroups

    // 查找未完成的组
    let currentGroup = this.groups.find(g => !g.completed)

    // 如果没有未完成的组
    if (!currentGroup) {
      // 如果组数已满，清空重新开始
      if (this.groups.length >= maxGroups) {
        this.clearAllGroups()
        this.measurements.value = []
      }

      // 创建新组
      const groupIndex = this.groups.length
      const colors = this.config.colors?.length ? this.config.colors : GROUP_COLORS
      const color = colors[groupIndex % colors.length]
      currentGroup = {
        index: groupIndex,
        points: [],
        markers: [],
        lineActors: [],
        previewLineActor: null,
        color,
        completed: false
      }
      this.groups.push(currentGroup)
    }

    return currentGroup
  }

  /** 递归释放 Actor 及其内部 VTK 对象（mapper/inputData/property/source/filter） */
  private deepDeleteActor(renderer: any, actor: any): void {
    try {
      if (renderer) renderer.removeActor(actor)
      const mapper = actor.getMapper?.()
      if (mapper) {
        // 释放 mapper 的输入数据（可能是 Source/Filter 的输出 PolyData）
        const inputData = mapper.getInputData?.()
        if (inputData) {
          try {
            inputData.delete()
          } catch {}
        }
        // 释放 lookup table
        const lut = mapper.getLookupTable?.()
        if (lut) {
          try {
            lut.delete()
          } catch {}
        }
        try {
          mapper.delete()
        } catch {}
      }
      const prop = actor.getProperty?.()
      if (prop) {
        try {
          prop.delete()
        } catch {}
      }
      const textures = actor.getTextures?.()
      if (Array.isArray(textures)) {
        for (const tex of textures) {
          try {
            tex?.delete?.()
          } catch {}
        }
      }
      actor.delete()
    } catch {}
  }

  /** 清理所有组的临时标记 */
  private clearAllGroups(): void {
    const renderer = this.ctx.render?.getRenderer()

    for (const group of this.groups) {
      // 移除球体标记（含 SphereSource → Mapper → Actor 链）
      for (const marker of group.markers) {
        this.deepDeleteActor(renderer, marker)
      }
      group.markers = []

      // 移除连线（含 LineSource → TubeFilter → Mapper → Actor 链）
      for (const lineActor of group.lineActors) {
        this.deepDeleteActor(renderer, lineActor)
      }
      group.lineActors = []

      // 移除预览线
      if (group.previewLineActor) {
        this.deepDeleteActor(renderer, group.previewLineActor)
        group.previewLineActor = null
      }
    }

    this.groups = []
  }

  /** 完成一个组的测量 */
  private completeGroup(group: MeasurementGroup): void {
    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return

    group.completed = true
    const sceneSize = this.getSceneDiagonal(renderer)
    const type = this.activeType.value

    // 移除预览线
    if (group.previewLineActor) {
      this.deepDeleteActor(renderer, group.previewLineActor)
      group.previewLineActor = null
    }

    let value = 0
    let unit = 'mm'

    if (type === 'point') {
      // 点模式：记录点坐标
      value = 0
      unit = ''
    } else if (type === 'distance') {
      // 距离模式：计算两点距离，绘制连线
      const point1 = group.points[0]
      const point2 = group.points[1]
      const dx = point2[0] - point1[0]
      const dy = point2[1] - point1[1]
      const dz = point2[2] - point1[2]
      value = Math.sqrt(dx * dx + dy * dy + dz * dz)
      unit = 'mm'

      // 绘制连线
      const lineActor = this.createLine(point1, point2, sceneSize, group.color)
      if (lineActor) {
        renderer.addActor(lineActor)
        group.lineActors.push(lineActor)
      }
    } else if (type === 'angle') {
      // 角度模式：计算三点角度，绘制两条连线
      const point1 = group.points[0]
      const point2 = group.points[1] // 顶点
      const point3 = group.points[2]

      // 计算向量
      const v1 = [point1[0] - point2[0], point1[1] - point2[1], point1[2] - point2[2]]
      const v2 = [point3[0] - point2[0], point3[1] - point2[1], point3[2] - point2[2]]

      // 计算角度
      const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
      const len1 = Math.sqrt(v1[0] ** 2 + v1[1] ** 2 + v1[2] ** 2)
      const len2 = Math.sqrt(v2[0] ** 2 + v2[1] ** 2 + v2[2] ** 2)
      value = Math.acos(Math.max(-1, Math.min(1, dot / (len1 * len2)))) * (180 / Math.PI)
      unit = '°'

      // 绘制两条连线
      const line1 = this.createLine(point2, point1, sceneSize, group.color)
      const line2 = this.createLine(point2, point3, sceneSize, group.color)
      if (line1) {
        renderer.addActor(line1)
        group.lineActors.push(line1)
      }
      if (line2) {
        renderer.addActor(line2)
        group.lineActors.push(line2)
      }
    }

    // 记录测量结果
    const result: MeasurementResult = {
      id: `${type}-${++this.measurementIdCounter}`,
      type,
      value,
      unit,
      points: [...group.points],
      groupIndex: group.index
    }
    this.measurements.value = [...this.measurements.value, result]
  }

  // ============================================================
  //  信息面板管理
  // ============================================================

  /** 注册测量结果到信息面板 */
  private registerInfoPanel(): void {
    const self = this
    const infoComponent = defineComponent({
      setup() {
        return () => {
          const results = self.measurements.value
          if (results.length === 0) return null

          const children = results.map((m: MeasurementResult) => {
            let colors = self.config.colors?.length ? self.config.colors : GROUP_COLORS
            const color = colors[m.groupIndex % colors.length]
            const colorHex = `rgb(${color[0] * 255}, ${color[1] * 255}, ${color[2] * 255})`

            let label = ''
            if (m.type === 'point') {
              label =
                i18n.translate('vtkviewer.plugin.measurement.mode.point') + ' ' + (m.groupIndex + 1)
            } else if (m.type === 'distance') {
              label =
                i18n.translate('vtkviewer.plugin.measurement.mode.distance') +
                ' ' +
                (m.groupIndex + 1)
            } else if (m.type === 'angle') {
              label =
                i18n.translate('vtkviewer.plugin.measurement.mode.angle') + ' ' + (m.groupIndex + 1)
            }

            // 生成坐标字符串
            const coordStrs = m.points.map(
              (p: [number, number, number]) =>
                `(${p[0].toFixed(1)}, ${p[1].toFixed(1)}, ${p[2].toFixed(1)})`
            )

            return h(
              'span',
              {
                key: m.id
              },
              [
                h(
                  'span',
                  { class: 'iimm-vtk-info-value--colored', style: { color: colorHex } },
                  `${label}: `
                ),
                h('span', { class: 'iimm-vtk-info-value' }, [
                  // 显示测量值
                  m.type === 'point' ? coordStrs[0] : `${m.value.toFixed(2)} ${m.unit}`,
                  // 距离和角度模式显示所有点坐标
                  ...(m.type !== 'point'
                    ? [
                        h(
                          'span',
                          { style: { marginLeft: '6px', opacity: 0.7 } },
                          coordStrs.join(' → ')
                        )
                      ]
                    : [])
                ])
              ]
            )
          })

          return children
        }
      }
    })

    this.registerInfoPanelItem({
      component: markRaw(infoComponent),
      priority: self.config.infoPanelPriority ?? 0,
      visibleCheck: () => self.measurements.value.length > 0
    })
  }

  /** 注销信息面板 */

  // ============================================================
  //  扩展区管理
  // ============================================================

  /** 注册测量模式选择扩展区 */
  private registerExtension(): void {
    const self = this
    this.registerExtensionItem({
      component: this.renderExtension(),
      active: false,
      priority: self.config.toolbarExtensionPriority ?? 0
    })

    // 监听 enabled 状态变化，自动激活/停用扩展区
    const unwatch = watch(
      () => self.enabled.value,
      (active: boolean) => {
        if (active) {
          self.ctx.toolbarExtension.activate('measurement')
        } else {
          self.ctx.toolbarExtension.deactivate('measurement')
        }
      },
      { immediate: true }
    )
    this.ctx.disposal.register(unwatch)
    this.extensionWatcher = unwatch
  }

  /** 注销测量模式选择扩展区 */

  /** 渲染扩展区内容（测量模式选择下拉菜单） */
  renderExtension(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const modeLabelKeys: Record<string, string> = {
            point: 'vtkviewer.plugin.measurement.mode.point',
            distance: 'vtkviewer.plugin.measurement.mode.distance',
            angle: 'vtkviewer.plugin.measurement.mode.angle'
          }
          const modeOptions = (['point', 'distance', 'angle'] as MeasurementType[]).map(type => {
            return h('option', { value: type }, i18n.translate(modeLabelKeys[type]))
          })

          const selectEl = h(
            'select',
            {
              class: 'iimm-vtk-view-select',
              value: self.activeType.value,
              title: i18n.translate('vtkviewer.plugin.measurement.tooltip'),
              onChange: (e: Event) => {
                const target = e.target as HTMLSelectElement
                self.setMeasurementType(target.value as MeasurementType)
              }
            },
            modeOptions
          )

          return h('div', { class: 'iimm-vtk-extension-item-with-label-wrapper' }, [
            h(
              'span',
              { class: 'iimm-vtk-extension-label' },
              i18n.translate('vtkviewer.plugin.measurement.extensionLabel') + ':'
            ),
            selectEl
          ])
        }
      }
    })
  }

  // ============================================================
  //  鼠标事件处理
  // ============================================================

  /** 处理鼠标左键点击（拾取测量点） */
  private handleClickPick = (event: any): void => {
    if (!this.cellPicker || !this.enabled.value) return

    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return

    const position = event.position
    if (!position) return

    this.cellPicker.pick([position.x, position.y, 0], renderer)

    const pickedActors = this.cellPicker.getActors()
    if (!pickedActors || pickedActors.length === 0) return

    const worldPos = this.cellPicker.getPickPosition() as [number, number, number]
    const sceneSize = this.getSceneDiagonal(renderer)
    const config = this.getModeConfig()
    const group = this.getCurrentGroup()
    if (!group) return

    // 如果当前组已满，不应该到达这里（getCurrentGroup 会清空）
    // 但为了安全，检查一下
    if (group.points.length >= config.pointsPerGroup) {
      return
    }

    // 添加点
    group.points.push(worldPos)

    // 添加球体标记
    const marker = this.createMarker(worldPos, sceneSize, group.color)
    renderer.addActor(marker)
    group.markers.push(marker)

    // 检查是否完成
    if (group.points.length >= config.pointsPerGroup) {
      this.completeGroup(group)
    }

    this.ctx.render?.render()
  }

  // ============================================================
  //  VTK Actor 创建
  // ============================================================

  /** 计算场景对角线长度（用于自适应标记/连线大小） */
  private getSceneDiagonal(renderer: any): number {
    const bounds = renderer.computeVisiblePropBounds()
    if (!bounds || bounds.length < 6) return 1
    return (
      Math.sqrt(
        (bounds[1] - bounds[0]) ** 2 + (bounds[3] - bounds[2]) ** 2 + (bounds[5] - bounds[4]) ** 2
      ) || 1
    )
  }

  /**
   * 创建测量点标记（小球）
   * 半径根据场景尺寸自适应：sceneSize * 0.005
   */
  private createMarker(
    position: [number, number, number],
    sceneSize: number,
    color: [number, number, number]
  ): any {
    const radius = sceneSize * (this.config.markerRadiusRatio ?? 0.005)
    const sphereSource = vtkSphereSource.newInstance({
      radius,
      thetaResolution: 32,
      phiResolution: 32
    })

    const mapper = vtkMapper.newInstance()
    mapper.setInputConnection(sphereSource.getOutputPort())

    const actor = vtkActor.newInstance()
    actor.setMapper(mapper)
    actor.getProperty().setColor(...color)
    actor.getProperty().setLighting(false)
    actor.getProperty().setOpacity(1.0)
    actor.setPickable(false)
    actor.setForceOpaque(true)
    actor.setPosition(...position)

    return actor
  }

  /**
   * 创建测量连线（管状线）
   * 使用 vtkLineSource + vtkTubeFilter 渲染为 3D 管道
   */
  private createLine(
    point1: [number, number, number],
    point2: [number, number, number],
    sceneSize: number,
    color: [number, number, number]
  ): any | null {
    // 检查两点是否太接近（避免零长度线）
    const dx = point2[0] - point1[0]
    const dy = point2[1] - point1[1]
    const dz = point2[2] - point1[2]
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)

    // 阈值：如果距离小于场景尺寸的 0.1%，跳过创建（视为零长度）
    if (distance < sceneSize * 0.001) {
      return null
    }

    const lineSource = vtkLineSource.newInstance()
    lineSource.setPoint1(...point1)
    lineSource.setPoint2(...point2)

    const tubeRadius = sceneSize * (this.config.tubeRadiusRatio ?? 0.0015)
    const tubeFilter = vtkTubeFilter.newInstance()
    tubeFilter.setInputConnection(lineSource.getOutputPort())
    tubeFilter.setRadius(tubeRadius)
    tubeFilter.setNumberOfSides(12)
    tubeFilter.setCapping(true)

    const mapper = vtkMapper.newInstance()
    mapper.setInputConnection(tubeFilter.getOutputPort())

    const actor = vtkActor.newInstance()
    actor.setMapper(mapper)
    actor.getProperty().setColor(...color)
    actor.getProperty().setLighting(false)
    actor.getProperty().setOpacity(1.0)
    actor.setPickable(false)

    return actor
  }

  // ============================================================
  //  UI 渲染
  // ============================================================

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          // 测量开关按钮
          const toggleBtn = h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.enabled.value }],
              title: self.enabled.value
                ? i18n.translate('vtkviewer.plugin.measurement.tooltipDisable')
                : i18n.translate('vtkviewer.plugin.measurement.tooltipEnable'),
              onClick: () => self.toggleMeasurement()
            },
            renderToolbarIcon(self.config.icon, self.activeType.value) ?? ''
          )

          return h(
            'div',
            {
              class: 'iimm-vtk-toolbar-item'
            },
            [toggleBtn]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(this.config.shortcut, 'measurement')
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig()
      .filter(x => x.key)
      .map(s => ({
        name: s.action,
        key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
        action: () => {
          if (s.action === 'point') {
            this.setMeasurementType('point')
          } else if (s.action === 'distance') {
            this.setMeasurementType('distance')
          } else if (s.action === 'angle') {
            this.setMeasurementType('angle')
          }
        },
        description: s.description
      }))
  }
}
