/**
 * 颜色映射插件
 * 控制颜色映射数组和范围
 */

import { defineComponent, h, ref, markRaw, watch, type Component } from 'vue'

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkCellPicker from '@kitware/vtk.js/Rendering/Core/CellPicker'
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkScalarBarActor from '@kitware/vtk.js/Rendering/Core/ScalarBarActor'
import vtkSphereSource from '@kitware/vtk.js/Filters/Sources/SphereSource'
import { ColorMode, ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinCommands, BuiltinEvents } from '@/configs'
import {
  type ColorByOption,
  type ArrayFeature,
  collectColorableArrays,
  parseColorByValue,
  selectBestColorArray
} from '@/utils'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** 色条位置预设 */
export type ScalarBarPosition = 'right' | 'left' | 'top' | 'bottom'

/**
 * 色条位置预设值
 * 坐标系：[-1, 1]，boxPosition 是左下角，boxSize 是宽高
 * 总范围 2，70% = 1.4，居中起始 = -0.7
 */
const SCALAR_BAR_POSITIONS: Record<
  ScalarBarPosition,
  {
    orientation: 'vertical' | 'horizontal'
    boxPosition: [number, number]
    boxSize: [number, number]
  }
> = {
  // 右侧垂直居中：高度 1.4，起始 y = -0.7
  right: { orientation: 'vertical', boxPosition: [0.88, -0.7], boxSize: [0.1, 1.4] },
  // 左侧垂直居中
  left: { orientation: 'vertical', boxPosition: [0.02, -0.7], boxSize: [0.1, 1.4] },
  // 顶部水平居中：宽度 1.4，起始 x = -0.7
  top: { orientation: 'horizontal', boxPosition: [-0.7, 0.88], boxSize: [1.4, 0.1] },
  // 底部水平居中
  bottom: { orientation: 'horizontal', boxPosition: [-0.7, -0.98], boxSize: [1.4, 0.1] }
}

/** 颜色映射插件配置 */
export interface ColorByPluginConfig extends ToolbarPluginConfig {
  /** 默认颜色预设名称（重置时恢复），默认 'erdc_rainbow_bright' */
  defaultPreset?: string
  /** 色条是否显示刻度数值，默认 true */
  showScalarBarTickLabels?: boolean
  /** 色条是否显示轴标题（数组名称），默认 true */
  showScalarBarTitle?: boolean
  /** 色条轴标题自定义文本（为空时使用数组名称） */
  scalarBarTitle?: string
  /** 色条位置，默认 'right' */
  scalarBarPosition?: ScalarBarPosition
  /** 色条刻度数量，默认 'auto'（根据色条长度自动计算） */
  scalarBarTickCount?: number | 'auto'
  /** 色条刻度数值字号，默认 14 */
  scalarBarTickFontSize?: number
  /** 色条轴标题字号，默认 18 */
  scalarBarTitleFontSize?: number
  /** 色条轴标题与刻度的间距（像素），默认 48 */
  scalarBarTitleOffset?: number
  /** 色条轴标题颜色，默认 '#000000'*/
  scalarBarTitleColor?: string
  /** 点拾取最大保存数量，默认 5 */
  maxPickPoints?: number
  /** 拾取点标记颜色，支持 '#rrggbb' 或 [r, g, b]（0~1），默认 '#00bcd4'（青色） */
  pickPointColor?: [number, number, number][]
  /** 拾取点标记半径占场景对角线比例，默认 0.003 */
  pickPointRadiusRatio?: number
}

/** 拾取点数据 */
interface PickPoint {
  id: string
  position: [number, number, number]
  scalarValue: number
  arrayName: string
  color: [number, number, number]
  actor: any
}

export class ColorByPlugin
  extends PluginBase<ColorByPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'colorBy',
    name: 'ColorByPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.colorBy.description')
  }

  readonly order = 0
  readonly defaultConfig: ColorByPluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    defaultPreset: 'erdc_rainbow_bright',
    showScalarBarTickLabels: true,
    showScalarBarTitle: true,
    scalarBarPosition: 'right',
    scalarBarTickCount: 'auto',
    scalarBarTickFontSize: 14,
    scalarBarTitleFontSize: 18,
    scalarBarTitleOffset: 48,
    scalarBarTitleColor: '#000000',
    maxPickPoints: 5,
    infoPanelPriority: 8,
    toolbarExtensionPriority: 0
  }

  private currentArray = ref('')
  private currentPreset = ref('erdc_rainbow_bright') // onInit 中会用 config.defaultPreset 覆盖
  private colorOptions = ref<ColorByOption[]>([])
  private arrayFeatures = ref<ArrayFeature[]>([])
  private scalarBarActor: ReturnType<typeof vtkScalarBarActor.newInstance> | null = null
  /** 模型加载时自动选择的第一个数据数组（用于 resetToDefault 恢复） */
  private initialArrayValue = ''
  /** 当前加载的格式是否支持颜色映射（由 scene:loaded 事件传入） */
  private supportsColorBy = ref(true)
  /** 扩展区是否激活 */
  private extensionActive = ref(false)
  // (事件清理由基类 PluginBase 管理)

  // === 点拾取功能 ===
  /** 点拾取是否启用 */
  private pickingEnabled = ref(false)
  /** 已拾取的点列表 */
  private pickedPoints = ref<PickPoint[]>([])
  private pickedPointsCount = ref(0)
  /** 拾取点自动分配颜色调色板（与 erdc_rainbow_bright 彩虹色差异较大的深色调） */
  private static readonly PICK_MARKER_PALETTE: [number, number, number][] = [
    [0.1, 0.14, 0.49], // 深蓝 #1a237e
    [0.72, 0.11, 0.11], // 深红 #b71c1c
    [0.0, 0.41, 0.36], // 翠绿 #00695c
    [0.29, 0.08, 0.55], // 深紫 #4a148c
    [0.9, 0.32, 0.0], // 深橙 #e65100
    [0.0, 0.3, 0.25], // 深青 #004d40
    [0.53, 0.06, 0.31], // 深粉 #880e4f
    [0.24, 0.15, 0.14] // 棕褐 #3e2723
  ]
  /** 拾取器 */
  private cellPicker: any = null
  /** 左键点击事件订阅句柄 */
  private clickSubscription: any = null

  protected onInit(): void {
    // 从配置初始化默认预设
    this.currentPreset.value = this.config.defaultPreset ?? 'erdc_rainbow_bright'

    // 创建色条 Actor
    const renderer = this.ctx.render.getRenderer()
    if (renderer) {
      this.scalarBarActor = vtkScalarBarActor.newInstance()
      this.scalarBarActor.setVisibility(false)
      this.applyScalarBarConfig()
      renderer.addActor(this.scalarBarActor)
    }

    // 注册颜色映射命令
    this.registerCommand(BuiltinCommands.SET_COLOR_BY_ARRAY, {
      execute: (arrayName: string) => this.setColorByArray(arrayName)
    })

    // 监听场景加载事件，自动获取可用数组
    this.onEvent(BuiltinEvents.SCENE_LOADED, (data: { supportsColorBy?: boolean }) =>
      this.onSceneLoaded(data)
    )
    // 监听场景清空事件，隐藏色条
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => this.onSceneCleared())

    // 注册扩展区
    this.registerExtension()
    // 注册点拾取信息面板
    this.registerPickInfoPanel()

    // 监听模型数量变化，无模型时注销扩展区
    const unwatchModelCount = watch(
      () => this.ctx.scene.modelCount.value,
      (count: number) => {
        if (count === 0) {
          this.extensionActive.value = false
          this.disablePicking()
        } else if (!this.ctx.toolbarExtension.has('colorBy')) {
          this.registerExtension()
        }
      }
    )
    this.ctx.disposal.register(unwatchModelCount)

    // 监听测量开始事件，自动关闭点拾取（互斥）
    this.onEvent(BuiltinEvents.MEASUREMENT_START, () => {
      this.disablePicking()
    })

    // 初始化拾取器（需要等待渲染管线就绪）
    this.onEvent(BuiltinEvents.PLUGINS_INITIALIZED, () => {
      this.cellPicker = vtkCellPicker.newInstance()
      this.cellPicker.setTolerance(0.001)
    })

    // 如果已经有模型加载且格式支持颜色映射，立即获取数组
    if (this.ctx.scene.hasModels() && this.supportsColorBy.value) {
      this.updateAvailableArrays()
      // 如果收集后发现没有实际颜色数组（纯几何模型），自动标记为不支持
      if (this.colorOptions.value.length <= 1) {
        this.supportsColorBy.value = false
      }
    }
  }

  protected onDispose(): void {
    // 注销扩展区
    // 清理点拾取资源
    this.disablePicking()
    if (this.cellPicker) {
      try {
        this.cellPicker.delete()
      } catch {}
      this.cellPicker = null
    }
    // 清理色条 Actor
    if (this.scalarBarActor) {
      const renderer = this.ctx.render.getRenderer()
      if (renderer) {
        renderer.removeActor(this.scalarBarActor)
      }
      this.scalarBarActor.delete()
      this.scalarBarActor = null
    }
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetColorBy',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: '重置颜色映射为默认预设和 Solid Color 模式',
        priority: 100,
        execute: () => this.resetToDefault()
      }
    ]
  }

  /** 重置颜色映射为默认状态 */
  private resetToDefault(): void {
    // 不支持颜色映射的格式（如 PDB/DRC）无需重置
    if (!this.supportsColorBy.value) return

    // 退出点拾取
    this.disablePicking()

    this.currentPreset.value = this.config.defaultPreset ?? 'erdc_rainbow_bright'

    // 恢复到模型加载时自动选择的数组（而非空字符串）
    if (this.initialArrayValue) {
      this.currentArray.value = this.initialArrayValue
      this.applyColorBy(this.initialArrayValue)
    } else {
      // 无数据数组时回退到 Solid Color
      this.currentArray.value = ''
      this.hideScalarBar()
      const actors = this.ctx.scene.getActors()
      for (const actor of actors) {
        const mapper = actor.getMapper()
        if (!mapper) continue
        mapper.set({
          colorByArrayName: '',
          colorMode: ColorMode.DEFAULT,
          scalarMode: ScalarMode.DEFAULT,
          scalarVisibility: false
        })
      }
      if (this.ctx.render?.render) {
        this.ctx.render.render()
      }
      this.ctx.events.emit(BuiltinEvents.COLOR_ARRAY_CHANGED, { arrayName: '' })
    }
  }

  // ============================================================
  //  扩展区管理
  // ============================================================

  private registerExtension(): void {
    const self = this
    this.registerExtensionItem({
      component: this.renderExtension(),
      active: false,
      priority: self.config.toolbarExtensionPriority ?? 0
    })

    // 监听 isVisible 变化，自动激活/停用扩展区
    // 现在支持多个扩展区同时活跃，无需检查其他扩展区
    const unwatch = watch(
      () => self.isVisible(),
      (visible: boolean) => {
        if (visible) {
          self.extensionActive.value = true
          self.ctx.toolbarExtension.activate('colorBy')
        } else {
          self.extensionActive.value = false
          self.ctx.toolbarExtension.deactivate('colorBy')
        }
      },
      { immediate: true }
    )
    this.ctx.disposal.register(unwatch)
  }

  /** 渲染扩展区内容（颜色映射数组选择 + 预设选择） */
  renderExtension(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const isSolidColor = self.currentArray.value === ':'
          const children: any[] = []

          // 数组选择器
          children.push(
            h('div', { class: 'iimm-vtk-extension-item-with-label-wrapper' }, [
              h(
                'span',
                { class: 'iimm-vtk-extension-label' },
                i18n.translate('vtkviewer.plugin.colorBy.colorBy') + ':'
              ),
              h(
                'select',
                {
                  class: 'iimm-vtk-view-select',
                  title: i18n.translate('vtkviewer.plugin.colorBy.colorBy'),
                  value: self.currentArray.value,
                  onChange: (e: Event) => {
                    const value = (e.target as HTMLSelectElement).value
                    self.currentArray.value = value
                    self.ctx.commands.execute(BuiltinCommands.SET_COLOR_BY_ARRAY, value)
                  }
                },
                self.colorOptions.value.length > 0
                  ? self.colorOptions.value.map((opt: ColorByOption) =>
                      h('option', { value: opt.value }, opt.label)
                    )
                  : h('option', { disabled: true }, '无可用数组')
              )
            ])
          )

          // 预设颜色选择器：仅在选择了数据数组时显示
          if (!isSolidColor) {
            children.push(
              h('div', { class: 'iimm-vtk-extension-item-with-label-wrapper' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-extension-label' },
                  i18n.translate('vtkviewer.plugin.colorBy.preset') + ':'
                ),
                h(
                  'select',
                  {
                    class: 'iimm-vtk-view-select',
                    title: '颜色预设',
                    value: self.currentPreset.value,
                    onChange: (e: Event) => {
                      self.currentPreset.value = (e.target as HTMLSelectElement).value
                      self.applyPreset()
                    }
                  },
                  vtkColorMaps.rgbPresetNames.map((name: string) =>
                    h('option', { value: name }, name)
                  )
                )
              ])
            )

            // 点拾取开关
            children.push(
              h('div', { class: 'iimm-vtk-extension-item-with-label-wrapper' }, [
                h(
                  'label',
                  {
                    class: 'iimm-vtk-extension-label',
                    style: { display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }
                  },
                  [
                    h('input', {
                      class: 'iimm-vtk-popup-checkbox',
                      type: 'checkbox',
                      checked: self.pickingEnabled.value,
                      onChange: () => self.togglePicking()
                    }),
                    h(
                      'span',
                      { class: 'iimm-vtk-extension-label' },
                      i18n.translate('vtkviewer.plugin.colorBy.pickPoint')
                    )
                  ]
                )
              ])
            )
          }

          return children
        }
      }
    })
  }

  private onSceneCleared(): void {
    // 不支持颜色映射的格式（如 PDB/DRC）跳过状态重置
    if (!this.supportsColorBy.value) return

    // 场景清空时隐藏色条并重置状态到默认
    this.hideScalarBar()
    // 清理点拾取
    this.disablePicking()
    // 断开色条对旧 LookupTable 的引用，避免阻止 GC 回收已删除的 ColorTransferFunction
    if (this.scalarBarActor) {
      try {
        this.scalarBarActor.setScalarsToColors(null as any)
      } catch {}
    }
    this.currentArray.value = ''
    this.currentPreset.value = this.config.defaultPreset ?? 'erdc_rainbow_bright'
    this.initialArrayValue = ''
    this.supportsColorBy.value = true
  }

  /** 隐藏色条并从渲染器移除 */
  private hideScalarBar(): void {
    if (this.scalarBarActor) {
      this.scalarBarActor.setVisibility(false)
      const renderer = this.ctx.render.getRenderer()
      if (renderer) {
        renderer.removeActor(this.scalarBarActor)
      }
    }
  }

  /** 应用色条配置（位置、标题、刻度等）
   *  必须在 showScalarBar 中调用（此时 automated=false，手动控制生效） */
  private applyScalarBarConfig(): void {
    if (!this.scalarBarActor) return

    // 关闭自动布局，改为手动控制位置和字号
    this.scalarBarActor.setAutomated(false)

    // 位置
    const pos = this.config.scalarBarPosition ?? 'right'
    const preset = SCALAR_BAR_POSITIONS[pos]
    this.scalarBarActor.setOrientation(preset.orientation)
    this.scalarBarActor.setBoxPosition(preset.boxPosition)
    this.scalarBarActor.setBoxSize(preset.boxSize)

    // 刻度数值（使用等宽字体确保对齐）
    const showTicks = this.config.showScalarBarTickLabels !== false
    const tickFontSize = this.config.scalarBarTickFontSize ?? 14
    this.scalarBarActor.setTickTextStyle({
      fontSize: showTicks ? tickFontSize : 0,
      fontFamily: 'monospace' // 等宽字体确保数字对齐
    })

    // 轴标题
    const showTitle = this.config.showScalarBarTitle !== false
    const titleFontSize = this.config.scalarBarTitleFontSize ?? 18
    this.scalarBarActor.setAxisTextStyle({
      fontSize: showTitle ? titleFontSize : 0,
      fontColor: this.config.scalarBarTitleColor ?? '#ffffff'
    })
    // 标题与刻度的间距
    const titleOffset = this.config.scalarBarTitleOffset ?? 48
    this.scalarBarActor.setAxisTitlePixelOffset(titleOffset)

    // 保存配置到局部变量，避免回调函数中 this 上下文问题
    const tickCountConfig = this.config.scalarBarTickCount ?? 'auto'
    const barPosition = this.config.scalarBarPosition ?? 'right'

    // 自定义刻度生成器，解决默认格式混乱和重叠问题
    this.scalarBarActor.setGenerateTicks((helper: any) => {
      const lastTickBounds = helper.getLastTickBounds()
      const [min, max] = lastTickBounds

      // 计算刻度数量
      let numTicks: number

      if (tickCountConfig === 'auto') {
        // 自动计算：根据实际渲染窗口尺寸估算合适数量
        const lastSize = helper.getLastSize() // [width, height]
        const windowHeight = lastSize[1] || 600 // 回退值
        // 色条高度约为 boxSize[1]（1.4）/ 2 * windowHeight
        const barLengthPx =
          barPosition === 'top' || barPosition === 'bottom'
            ? (lastSize[0] || 800) * 0.7 // 水平色条用宽度
            : windowHeight * 0.7 // 垂直色条用高度
        numTicks = Math.max(3, Math.min(10, Math.floor(barLengthPx / 30)))
      } else {
        numTicks = tickCountConfig
      }

      // 生成均匀分布的刻度
      const ticks: number[] = []
      if (max === min) {
        // 常量数据：只显示一个刻度
        ticks.push(min)
      } else {
        for (let i = 0; i <= numTicks; i++) {
          ticks.push(min + (max - min) * (i / numTicks))
        }
      }

      // 统一小数位数，确保对齐
      const range = max - min
      let decimals: number

      if (range === 0) {
        decimals = 2
      } else {
        // 根据范围精度确定统一的小数位数
        const rangeOrder = Math.floor(Math.log10(range))
        decimals = Math.max(0, Math.min(4, 2 - rangeOrder))
      }

      // 检查是否需要使用科学计数法
      const absMax = Math.max(Math.abs(min), Math.abs(max))
      const useScientific = range > 0 && (absMax < 0.001 || absMax >= 1e6)

      // 格式化刻度标签（先生成原始字符串）
      const rawTickStrings = ticks.map((value: number): string => {
        if (value === 0) return decimals > 0 ? '0.' + '0'.repeat(decimals) : '0'

        if (useScientific) {
          // 科学计数法：统一格式
          return value.toExponential(decimals > 2 ? 2 : decimals)
        }

        // 固定小数位数，确保对齐
        return value.toFixed(decimals)
      })

      // 计算最大长度，用于右对齐填充
      const maxLen = Math.max(...rawTickStrings.map(s => s.length))

      // 右对齐填充（在左侧加空格）
      const tickStrings = rawTickStrings.map(s => s.padStart(maxLen, ' '))

      helper.setTicks(ticks)
      helper.setTickStrings(tickStrings)
    })
  }

  /** 显示色条并添加到渲染器 */
  private showScalarBar(lookupTable: any, arrayName: string): void {
    if (!this.scalarBarActor) return
    const renderer = this.ctx.render.getRenderer()
    if (!renderer) return

    this.scalarBarActor.setScalarsToColors(lookupTable)
    // 轴标题：优先使用自定义文本，否则使用数组名称
    const title = this.config.scalarBarTitle || arrayName
    const showTitle = this.config.showScalarBarTitle !== false
    this.scalarBarActor.setAxisLabel(showTitle ? title : '')
    // 确保色条已添加到渲染器（clearScene 可能已将其移除）
    renderer.addActor(this.scalarBarActor)
    this.scalarBarActor.setVisibility(true)
  }

  // ============================================================
  //  点拾取功能
  // ============================================================

  /** 切换点拾取开关 */
  private togglePicking(): void {
    if (this.pickingEnabled.value) {
      this.disablePicking()
    } else {
      this.enablePicking()
    }
  }

  /** 启用点拾取 */
  private enablePicking(): void {
    if (!this.cellPicker) {
      this.debugWarn(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.colorBy.cellPickerNotInitialized')}`
      )
      return
    }

    const interactor = this.ctx.render?.getInteractor()
    const container = this.ctx.render?.getContainer()
    if (!interactor) return

    // 互斥：触发点拾取开始事件（MeasurementPlugin 会监听此事件并关闭测量）
    this.ctx.events.emit(BuiltinEvents.COLORBY_PICKING_START)

    this.pickingEnabled.value = true
    this.pickedPointsCount.value = 0
    // 订阅鼠标左键点击事件
    this.clickSubscription = interactor.onLeftButtonPress(this.handlePickClick)

    // 光标变十字
    if (container) {
      container.style.cursor = 'crosshair'
    }
  }

  /** 禁用点拾取 */
  private disablePicking(): void {
    // 移除事件订阅
    if (this.clickSubscription) {
      this.clickSubscription.unsubscribe()
      this.clickSubscription = null
    }

    // 恢复光标
    const container = this.ctx.render?.getContainer()
    if (container) {
      container.style.cursor = 'default'
    }

    // 清理标记
    this.clearPickMarkers()
    this.pickedPoints.value = []
    this.pickedPointsCount.value = 0
    this.pickingEnabled.value = false

    this.ctx.render?.render()
  }

  /** 处理鼠标左键点击（拾取点并获取标量值） */
  private handlePickClick = (event: any): void => {
    if (!this.cellPicker || !this.pickingEnabled.value) return

    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return

    const position = event.position
    if (!position) return

    this.cellPicker.pick([position.x, position.y, 0], renderer)

    const pickedActors = this.cellPicker.getActors()
    if (!pickedActors || pickedActors.length === 0) return

    const worldPos = this.cellPicker.getPickPosition() as [number, number, number]

    // 获取拾取到的 actor 和 mapper
    const pickedActor = pickedActors[0]
    const mapper = pickedActor.getMapper()
    if (!mapper) return

    // 获取当前颜色映射的数组信息
    const arrayName =
      mapper.getColorByArrayName?.() ?? (mapper.get?.('colorByArrayName') as string | undefined)
    if (!arrayName) return

    const inputData = mapper.getInputData()
    if (!inputData) return

    const scalarMode = mapper.getScalarMode?.()
    const location = scalarMode === ScalarMode.USE_CELL_FIELD_DATA ? 'CellData' : 'PointData'
    const dataArray = inputData[`get${location}`]?.()?.getArrayByName(arrayName)
    if (!dataArray) return

    // 获取标量值
    let scalarValue = 0
    const cellId = this.cellPicker.getCellId()
    if (location === 'CellData' && cellId >= 0) {
      scalarValue = dataArray.getValue(cellId)
    } else {
      // PointData：使用最近点的值
      const pointId = this.cellPicker.getPointId?.() ?? -1
      if (pointId >= 0) {
        scalarValue = dataArray.getValue(pointId)
      } else {
        // 回退：查找最近的点
        const points = inputData.getPoints()
        if (points) {
          let minDist = Infinity
          let closestId = 0
          for (let i = 0; i < points.getNumberOfPoints(); i++) {
            const pt = points.getPoint(i)
            const dx = pt[0] - worldPos[0]
            const dy = pt[1] - worldPos[1]
            const dz = pt[2] - worldPos[2]
            const dist = dx * dx + dy * dy + dz * dz
            if (dist < minDist) {
              minDist = dist
              closestId = i
            }
          }
          scalarValue = dataArray.getValue(closestId)
        }
      }
    }

    // 检查是否超出最大数量，自动覆盖最早记录
    const maxPoints = this.config.maxPickPoints ?? 5
    if (this.pickedPoints.value.length >= maxPoints) {
      // 移除最早的点
      const oldest = this.pickedPoints.value[0]
      this.removePickMarker(oldest)
      this.pickedPoints.value = this.pickedPoints.value.slice(1)
    }

    this.pickedPointsCount.value++

    // 创建标记球体
    const sceneSize = this.getSceneDiagonal(renderer)
    let markerColors =
      this.config.pickPointColor && this.config.pickPointColor?.length
        ? this.config.pickPointColor
        : ColorByPlugin.PICK_MARKER_PALETTE
    let markerColor: [number, number, number] =
      markerColors[this.pickedPointsCount.value % markerColors.length]
    const marker = this.createPickMarker(worldPos, sceneSize, markerColor)
    renderer.addActor(marker)

    // 记录拾取点
    const pickPoint: PickPoint = {
      id: `pick-${Date.now()}`,
      position: worldPos,
      scalarValue,
      arrayName,
      color: markerColor,
      actor: marker
    }
    this.pickedPoints.value = [...this.pickedPoints.value, pickPoint]

    this.ctx.render?.render()
  }

  /** 计算场景对角线长度 */
  private getSceneDiagonal(renderer: any): number {
    const bounds = renderer.computeVisiblePropBounds()
    if (!bounds || bounds.length < 6) return 1
    return (
      Math.sqrt(
        (bounds[1] - bounds[0]) ** 2 + (bounds[3] - bounds[2]) ** 2 + (bounds[5] - bounds[4]) ** 2
      ) || 1
    )
  }

  /** 创建拾取点标记（小球） */
  private createPickMarker(
    position: [number, number, number],
    sceneSize: number,
    color: [number, number, number]
  ): any {
    const ratio = this.config.pickPointRadiusRatio ?? 0.003
    const radius = sceneSize * ratio
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

  /** 移除单个拾取点标记 */
  private removePickMarker(point: PickPoint): void {
    const renderer = this.ctx.render?.getRenderer()
    if (renderer && point.actor) {
      try {
        renderer.removeActor(point.actor)
        const mapper = point.actor.getMapper?.()
        if (mapper) {
          const inputData = mapper.getInputData?.()
          if (inputData) {
            try {
              inputData.delete()
            } catch {}
          }
          try {
            mapper.delete()
          } catch {}
        }
        point.actor.delete()
      } catch {}
    }
  }

  /** 清理所有拾取点标记 */
  private clearPickMarkers(): void {
    for (const point of this.pickedPoints.value) {
      this.removePickMarker(point)
    }
  }

  // ============================================================
  //  点拾取信息面板
  // ============================================================

  /** 注册点拾取信息面板 */
  private registerPickInfoPanel(): void {
    const self = this
    const infoComponent = defineComponent({
      setup() {
        return () => {
          const points = self.pickedPoints.value
          if (points.length === 0) return null

          const maxPoints = self.config.maxPickPoints ?? 5
          const children = points.map((p: PickPoint, index: number) => {
            const coordStr = `(${p.position[0].toFixed(2)}, ${p.position[1].toFixed(2)}, ${p.position[2].toFixed(2)})`
            return h(
              'span',
              {
                key: p.id
              },
              [
                h(
                  'span',
                  {
                    class: 'iimm-vtk-info-value--colored',
                    style: {
                      color: `rgb(${Math.round(p.color[0] * 255)}, ${Math.round(p.color[1] * 255)}, ${Math.round(p.color[2] * 255)})`
                    }
                  },
                  `P${index + 1}: `
                ),
                h('span', { class: 'iimm-vtk-info-value' }, [
                  h('span', {}, `${p.scalarValue.toFixed(4)}`),
                  h('span', { style: { marginLeft: '4px', opacity: 0.7 } }, coordStr)
                ])
              ]
            )
          })

          return [
            h(
              'span',
              { class: 'iimm-vtk-info-label' },
              `${i18n.translate('vtkviewer.plugin.colorBy.pickCount')} (${points.length}/${maxPoints}):`
            ),
            ...children
          ]
        }
      }
    })

    this.registerInfoPanelItem({
      id: 'colorByPick',
      component: markRaw(infoComponent),
      priority: self.config.infoPanelPriority ?? 0,
      visibleCheck: () => self.pickedPoints.value.length > 0
    })
  }

  private onSceneLoaded(data?: { supportsColorBy?: boolean }): void {
    // 记录格式是否支持颜色映射（用于 isVisible 判断）
    this.supportsColorBy.value = data?.supportsColorBy !== false
    // 仅在格式明确支持时才收集和应用颜色数组（防止 PDB 等格式的 mapper 崩溃）
    if (this.supportsColorBy.value) {
      this.updateAvailableArrays()
      // 如果收集后发现没有实际颜色数组（纯几何模型），自动标记为不支持
      if (this.colorOptions.value.length <= 1) {
        this.supportsColorBy.value = false
      }
    }
  }

  /** 获取所有可用的颜色映射数组名称（不含 Solid Color） */
  get availableArrays(): string[] {
    return this.colorOptions.value
      .filter((opt: ColorByOption) => opt.value !== ':')
      .map((opt: ColorByOption) => opt.label)
  }

  private updateAvailableArrays(): void {
    const solidOption: ColorByOption = {
      value: ':',
      label: i18n.translate('vtkviewer.plugin.colorBy.solidColor')
    }
    const allOptions: ColorByOption[] = [solidOption]
    const allFeatures: ArrayFeature[] = []
    const actors = this.ctx.scene.getActors()

    try {
      for (let i = 0; i < actors.length; i++) {
        const actor = actors[i]
        const mapper = actor.getMapper()
        if (!mapper) continue

        const inputData = mapper.getInputData()
        if (!inputData) continue

        const pointData = inputData.getPointData?.()
        const cellData = inputData.getCellData?.()

        const { options, features } = collectColorableArrays(pointData, cellData)

        for (const opt of options) {
          if (opt.value !== ':' && !allOptions.some(o => o.value === opt.value)) {
            allOptions.push(opt)
          }
        }
        for (const feat of features) {
          if (!allFeatures.some(f => f.name === feat.name && f.location === feat.location)) {
            allFeatures.push(feat)
          }
        }
      }
    } catch (error) {
      this.debugWarn(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.colorBy.collectArrayError')}:`,
        error
      )
    }

    this.colorOptions.value = allOptions
    this.arrayFeatures.value = allFeatures

    // 使用智能选择算法选择最佳数组（而非简单取第一个）
    if (allOptions.length > 1 && !this.currentArray.value) {
      const bestValue = selectBestColorArray(allOptions, allFeatures)
      if (bestValue !== ':') {
        this.currentArray.value = bestValue
        this.initialArrayValue = bestValue
        this.applyColorBy(bestValue)
      }
    }
  }

  /** 设置颜色映射数组（接受数组名称或 'location:arrayName' 格式） */
  private setColorByArray(arrayNameOrValue: string): void {
    // 尝试查找匹配的 option value
    const matched = this.colorOptions.value.find(
      (opt: ColorByOption) => opt.value === arrayNameOrValue || opt.label === arrayNameOrValue
    )
    const value = matched ? matched.value : arrayNameOrValue
    this.currentArray.value = value
    this.applyColorBy(value)
  }

  /** 应用当前预设到所有 actor 的 lookupTable（与官网 applyPreset 一致） */
  private applyPreset(): void {
    const preset = vtkColorMaps.getPresetByName(this.currentPreset.value)
    const actors = this.ctx.scene.getActors()
    let firstLookupTable: any = null

    for (const actor of actors) {
      const mapper = actor.getMapper()
      if (!mapper) continue

      const lookupTable = mapper.getLookupTable()
      if (!lookupTable) continue

      // 获取数据范围
      const inputData = mapper.getInputData()
      if (!inputData) continue

      const arrayName =
        mapper.getColorByArrayName?.() ??
        (mapper.get?.('colorByArrayName') as unknown as string | undefined)
      if (!arrayName) continue

      const location =
        mapper.getScalarMode?.() === ScalarMode.USE_CELL_FIELD_DATA ? 'CellData' : 'PointData'
      const dataArray = inputData[`get${location}`]()?.getArrayByName(arrayName)
      if (!dataArray) continue

      const dataRange = dataArray.getRange()
      const offset = dataRange[1] === dataRange[0] ? 1 : 0

      lookupTable.applyColorMap(preset)
      lookupTable.setMappingRange(dataRange[0] - offset, dataRange[1] + offset)
      lookupTable.updateRange()

      if (!firstLookupTable) {
        firstLookupTable = lookupTable
      }
    }

    // 更新色条的查找表
    if (firstLookupTable && this.scalarBarActor?.getVisibility()) {
      this.scalarBarActor.setScalarsToColors(firstLookupTable)
    }

    // 重新渲染
    if (this.ctx.render?.render) {
      this.ctx.render.render()
    }
  }

  /** 对所有 actor 应用颜色映射（与官网 Geometry Viewer 一致） */
  private applyColorBy(value: string): void {
    const [location, arrayName] = parseColorByValue(value)
    const actors = this.ctx.scene.getActors()

    // Solid Color 模式：隐藏色条
    if (!location || !arrayName) {
      this.hideScalarBar()
      for (const actor of actors) {
        const mapper = actor.getMapper()
        if (!mapper) continue
        mapper.set({
          colorByArrayName: '',
          colorMode: ColorMode.DEFAULT,
          scalarMode: ScalarMode.DEFAULT,
          scalarVisibility: false
        })
      }
      if (this.ctx.render?.render) {
        this.ctx.render.render()
      }
      this.ctx.events.emit(BuiltinEvents.COLOR_ARRAY_CHANGED, { arrayName: '' })
      return
    }

    // 查找第一个有效的 lookupTable 用于色条显示
    let firstLookupTable: any = null

    for (const actor of actors) {
      const mapper = actor.getMapper()
      if (!mapper) continue

      // 获取实际数据
      const inputData = mapper.getInputData()
      if (!inputData) continue

      const dataArray = inputData[`get${location}`]()?.getArrayByName(arrayName)
      if (!dataArray) continue

      const dataRange = dataArray.getRange()
      const numberOfComponents = dataArray.getNumberOfComponents()

      // 创建 lookupTable 并应用颜色预设（与官网一致）
      const lookupTable = vtkColorTransferFunction.newInstance()
      const preset = vtkColorMaps.getPresetByName(this.currentPreset.value)
      lookupTable.applyColorMap(preset)
      const offset = dataRange[1] === dataRange[0] ? 1 : 0
      lookupTable.setMappingRange(dataRange[0] - offset, dataRange[1] + offset)
      lookupTable.updateRange()

      // 设置 mapper（与官网一致）
      let colorMode = ColorMode.MAP_SCALARS
      if (numberOfComponents === 3 || numberOfComponents === 4) {
        // 多分量默认用 magnitude，用户可切换到 direct mapping
        lookupTable.setVectorModeToMagnitude()
      }

      mapper.set({
        interpolateScalarsBeforeMapping: true,
        useLookupTableScalarRange: true,
        lookupTable,
        colorByArrayName: arrayName,
        colorMode,
        scalarMode:
          location === 'PointData'
            ? ScalarMode.USE_POINT_FIELD_DATA
            : ScalarMode.USE_CELL_FIELD_DATA,
        scalarVisibility: true
      })

      // 记录第一个 lookupTable 用于色条
      if (!firstLookupTable) {
        firstLookupTable = lookupTable
      }
    }

    // 显示色条（仅单分量数组显示色条，多分量不显示）
    if (firstLookupTable && actors.length > 0) {
      const firstActor = actors[0]
      const firstMapper = firstActor?.getMapper()
      const firstData = firstMapper?.getInputData()
      const firstDataArray = firstData?.[`get${location}`]()?.getArrayByName(arrayName)
      const numberOfComponents = firstDataArray?.getNumberOfComponents() ?? 1

      if (numberOfComponents === 1) {
        this.showScalarBar(firstLookupTable, arrayName)
      } else {
        this.hideScalarBar()
      }
    } else {
      this.hideScalarBar()
    }

    // 重新渲染
    if (this.ctx.render?.render) {
      this.ctx.render.render()
    }
    // 触发颜色数组变化事件
    this.ctx.events.emit(BuiltinEvents.COLOR_ARRAY_CHANGED, { arrayName })
  }

  render() {
    // 颜色映射UI已移至ToolbarExtension，此处返回空占位
    return defineComponent({
      setup() {
        return () => null
      }
    })
  }

  isVisible(): boolean {
    // 格式明确标记不支持时隐藏
    if (!this.supportsColorBy.value) {
      return false
    }
    // 仅有 Solid color 选项时隐藏（无实际颜色数组）
    if (this.colorOptions.value.length <= 1) {
      return false
    }
    return true
  }
}
