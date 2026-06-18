/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-01 08:40:30
 * @LastEditTime: 2026-06-13 20:34:51
 * @Description:
 */
/**
 * 坐标轴插件
 * 显示/隐藏坐标轴方向指示器（右下角 OrientationMarkerWidget）
 *
 * - none: 不显示坐标系
 * - world: 显示原点坐标轴（添加到主渲染器的 actor）
 * - display: 显示方向指示器（右下角 OrientationMarkerWidget）
 * - both: 同时显示两种坐标轴
 *
 * 关键设计：
 * 1. Widget 延迟到渲染管线就绪后创建（通过 PLUGINS_INITIALIZED 事件）
 * 2. 只做 setEnabled/setVisible 切换，不销毁重建
 * 3. VTK.js 内部的 camera subscription 自动同步方向
 * 4. 事件监听器在 dispose() 中正确移除，防止内存泄漏
 */

import { defineComponent, h, ref, computed } from 'vue'

import vtkAxesActor from '@kitware/vtk.js/Rendering/Core/AxesActor'
import vtkOrientationMarkerWidget from '@kitware/vtk.js/Interaction/Widgets/OrientationMarkerWidget'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { safeDeleteVtkObject } from '@/utils'
import { AxesIcon, AxesDisplayIcon, AxesBothIcon } from '@/icons'
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

/** 坐标系模式 */
type CoordinateMode = 'none' | 'world' | 'display' | 'both'

/** 视口角落位置 */
type ViewportCorner = 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT'

/** RGB 颜色元组 [r, g, b]，值范围 0-255 */
type RGBColor = [number, number, number]

/** 坐标轴插件配置 */
export interface AxesPluginConfig extends ToolbarPluginConfig {
  /** 默认坐标系模式 */
  defaultMode?: CoordinateMode

  // === OrientationMarkerWidget 配置（方向指示器） ===
  /** 方向指示器位置，默认 BOTTOM_RIGHT */
  viewportCorner?: ViewportCorner
  /** 视口大小比例 (0~1)，默认 0.15 */
  viewportSize?: number
  /** 最小像素大小，默认 80 */
  minPixelSize?: number
  /** 最大像素大小，默认 200 */
  maxPixelSize?: number

  // === 箭头几何参数（方向指示器和原点坐标轴共用） ===
  /** 箭头尖端分辨率（圆锥段数），默认 60 */
  tipResolution?: number
  /** 箭头尖端半径，默认 0.05 */
  tipRadius?: number
  /** 箭头尖端长度，默认 0.2 */
  tipLength?: number
  /** 箭杆分辨率（圆柱段数），默认 60 */
  shaftResolution?: number
  /** 箭杆半径，默认 0.01 */
  shaftRadius?: number

  // === 方向指示器颜色 ===
  /** 方向指示器 X轴颜色 [r, g, b]，默认 [255, 150, 150] */
  orientationXAxisColor?: RGBColor
  /** 方向指示器 Y轴颜色 [r, g, b]，默认 [150, 255, 150] */
  orientationYAxisColor?: RGBColor
  /** 方向指示器 Z轴颜色 [r, g, b]，默认 [150, 150, 255] */
  orientationZAxisColor?: RGBColor

  // === 原点坐标轴颜色 ===
  /** 原点坐标轴 X轴颜色 [r, g, b]，默认 [255, 0, 0] */
  originXAxisColor?: RGBColor
  /** 原点坐标轴 Y轴颜色 [r, g, b]，默认 [0, 255, 0] */
  originYAxisColor?: RGBColor
  /** 原点坐标轴 Z轴颜色 [r, g, b]，默认 [0, 0, 255] */
  originZAxisColor?: RGBColor

  // === 原点坐标轴缩放 ===
  /** 原点坐标轴长度占场景对角线的比例 (0~1)，默认 0.2 */
  originAxisScaleRatio?: number
}

export class AxesPlugin
  extends PluginBase<AxesPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'axes',
    name: 'AxesPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.axes.description')
  }

  readonly order = 2
  readonly defaultConfig: AxesPluginConfig = {
    enabled: true,
    // shortcut: 'X',
    defaultMode: 'none',
    icon: createIconConfig(AxesIcon, undefined, undefined, {
      none: AxesIcon,
      world: AxesIcon,
      display: AxesDisplayIcon,
      both: AxesBothIcon
    })
  }

  /** 当前坐标系模式（响应式） */
  private coordinateMode = ref<CoordinateMode>('none')
  /** 是否显示坐标系（computed） */
  private showAxes = computed(() => this.coordinateMode.value !== 'none')

  /** VTK.js OrientationMarkerWidget 实例（右下角方向指示器） */
  private orientationWidget: any = null
  /** 原点坐标轴 Actor（世界坐标系） */
  private originAxesActor: any = null

  protected onInit(): void {
    // 从配置读取默认模式
    if (this.config.defaultMode !== undefined) {
      this.coordinateMode.value = this.config.defaultMode
    }

    // 监听渲染管线就绪事件（延迟创建 widget，确保 renderWindow/renderer 可用）
    this.onEvent(BuiltinEvents.PLUGINS_INITIALIZED, () => {
      this.initCoordinateSystem()
    })
    // 监听场景加载事件，模型加载后重新计算坐标轴缩放
    this.onEvent(BuiltinEvents.SCENE_LOADED, () => {
      this.updateOriginAxesScale()
    })
  }

  /** 视口角落名称到 VTK.js Corners 枚举的映射 */
  private static readonly CORNER_MAP: Record<ViewportCorner, any> = {
    TOP_LEFT: vtkOrientationMarkerWidget.Corners.TOP_LEFT,
    TOP_RIGHT: vtkOrientationMarkerWidget.Corners.TOP_RIGHT,
    BOTTOM_LEFT: vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT,
    BOTTOM_RIGHT: vtkOrientationMarkerWidget.Corners.BOTTOM_RIGHT
  }

  /**
   * 初始化坐标系系统
   * 在渲染管线就绪后调用，确保 renderWindow/renderer 可用
   */
  private initCoordinateSystem(): void {
    const renderWindow = this.ctx.render?.getRenderWindow()
    const renderer = this.ctx.render?.getRenderer()
    if (!renderWindow || !renderer) {
      this.debugWarn(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.axes.renderWindowNotAvailable')}`
      )
      return
    }

    const cfg = this.config

    // === 1. 创建方向指示器 Widget（右下角） ===
    const orientationAxesActor = vtkAxesActor.newInstance({
      // @ts-ignore — IAxesActorInitialValues 类型声明不完整
      config: {
        recenter: true,
        tipResolution: cfg.tipResolution ?? 60,
        tipRadius: cfg.tipRadius ?? 0.05,
        tipLength: cfg.tipLength ?? 0.2,
        shaftResolution: cfg.shaftResolution ?? 60,
        shaftRadius: cfg.shaftRadius ?? 0.01,
        invert: false
      }
    })
    orientationAxesActor.setXAxisColor(cfg.orientationXAxisColor ?? [255, 150, 150])
    orientationAxesActor.setYAxisColor(cfg.orientationYAxisColor ?? [150, 255, 150])
    orientationAxesActor.setZAxisColor(cfg.orientationZAxisColor ?? [150, 150, 255])

    // 获取 interactor，兼容 GenericRenderWindow 未自动绑定的情况
    const interactor = renderWindow.getInteractor()
    if (!interactor) {
      this.debugWarn(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.axes.interactorNull')}`
      )
    }

    this.orientationWidget = vtkOrientationMarkerWidget.newInstance({
      actor: orientationAxesActor,
      interactor: interactor,
      parentRenderer: renderer
    })
    this.orientationWidget.setViewportCorner(
      AxesPlugin.CORNER_MAP[cfg.viewportCorner ?? 'BOTTOM_RIGHT']
    )
    this.orientationWidget.setViewportSize(cfg.viewportSize ?? 0.15)
    this.orientationWidget.setMinPixelSize(cfg.minPixelSize ?? 80)
    this.orientationWidget.setMaxPixelSize(cfg.maxPixelSize ?? 200)
    this.orientationWidget.setEnabled(false) // 初始禁用

    // === 2. 创建原点坐标轴 Actor（世界坐标系） ===
    this.originAxesActor = vtkAxesActor.newInstance({
      // @ts-ignore — IAxesActorInitialValues 类型声明不完整
      config: {
        recenter: true,
        tipResolution: cfg.tipResolution ?? 60,
        tipRadius: cfg.tipRadius ?? 0.05,
        tipLength: cfg.tipLength ?? 0.2,
        shaftResolution: cfg.shaftResolution ?? 60,
        shaftRadius: cfg.shaftRadius ?? 0.01,
        invert: false
      }
    })
    this.originAxesActor.setXAxisColor(cfg.originXAxisColor ?? [255, 0, 0])
    this.originAxesActor.setYAxisColor(cfg.originYAxisColor ?? [0, 255, 0])
    this.originAxesActor.setZAxisColor(cfg.originZAxisColor ?? [0, 0, 255])
    this.originAxesActor.setScale(1, 1, 1)
    this.originAxesActor.setVisibility(false) // 初始隐藏
    renderer.addActor(this.originAxesActor)

    // === 3. 应用当前坐标系模式 ===
    this.applyCoordinateMode()
  }

  /**
   * 应用坐标系模式
   */
  private applyCoordinateMode(): void {
    // 用资源实例的存在性代替独立的 renderReady 标记
    if (!this.orientationWidget && !this.originAxesActor) return

    const mode = this.coordinateMode.value
    const showWorld = mode === 'world' || mode === 'both'
    const showDisplay = mode === 'display' || mode === 'both'

    // 设置方向指示器可见性
    if (this.orientationWidget) {
      this.orientationWidget.setEnabled(showDisplay)
    }

    // 设置原点坐标轴可见性
    if (this.originAxesActor) {
      this.originAxesActor.setVisibility(showWorld)
      if (showWorld) {
        this.updateOriginAxesScale()
      }
    }

    this.ctx.render?.render()
  }

  /**
   * 更新原点坐标轴缩放比例
   * 根据场景边界自动计算合适的坐标轴大小
   */
  private updateOriginAxesScale(): void {
    if (!this.originAxesActor) return

    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return

    const bounds = renderer.computeVisiblePropBounds()
    if (!bounds || bounds.length < 6) return

    const diagonal = Math.sqrt(
      (bounds[1] - bounds[0]) ** 2 + (bounds[3] - bounds[2]) ** 2 + (bounds[5] - bounds[4]) ** 2
    )

    // 防止退化场景（单点/重合点）导致 diagonal=0 使坐标轴不可见
    const safeDiagonal = Math.max(diagonal, 1.0)
    // 限制比例在合理范围内，防止配置错误导致异常
    const ratio = Math.max(0.01, Math.min(1.0, this.config.originAxisScaleRatio ?? 0.2))
    const axisLength = safeDiagonal * ratio
    this.originAxesActor.setScale(axisLength, axisLength, axisLength)
  }

  /**
   * 循环切换坐标系模式
   */
  private toggleAxes(): void {
    const modes: CoordinateMode[] = ['none', 'world', 'display', 'both']
    const currentIndex = modes.indexOf(this.coordinateMode.value)
    const nextIndex = (currentIndex + 1) % modes.length
    this.coordinateMode.value = modes[nextIndex]
    this.applyCoordinateMode()
  }

  /** 释放 VTK.js 资源和事件监听器 */
  protected onDispose(): void {
    // 释放 VTK 资源
    if (this.orientationWidget) {
      this.orientationWidget.setEnabled(false)
      safeDeleteVtkObject(this.orientationWidget)
      this.orientationWidget = null
    }
    if (this.originAxesActor) {
      const renderer = this.ctx.render?.getRenderer()
      if (renderer) {
        renderer.removeActor(this.originAxesActor)
      }
      safeDeleteVtkObject(this.originAxesActor)
      this.originAxesActor = null
    }
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetAxes',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.axes.resetDesc'),
        execute: () => {
          const defaultMode = this.config.defaultMode ?? 'none'
          this.coordinateMode.value = defaultMode
          this.applyCoordinateMode()
        }
      }
    ]
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const shortcuts = self.getShortcutConfig()
          const keyText = shortcuts.length > 0 ? shortcuts[0].key : ''
          const displayKey = Array.isArray(keyText) ? keyText[0] : keyText

          // 显示当前模式名称
          const modeNames: Record<CoordinateMode, string> = {
            none: i18n.translate('vtkviewer.axes.mode.none'),
            world: i18n.translate('vtkviewer.axes.mode.world'),
            display: i18n.translate('vtkviewer.axes.mode.display'),
            both: i18n.translate('vtkviewer.axes.mode.both')
          }
          const modeLabel = modeNames[self.coordinateMode.value] ?? ''

          return h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.showAxes.value }],
              title: self.ctx.enableKeyboard.value && displayKey
                ? i18n.translate('vtkviewer.plugin.axes.name') +
                  ': ' +
                  modeLabel +
                  ' (' +
                  displayKey +
                  ')'
                : i18n.translate('vtkviewer.plugin.axes.name') + ': ' + modeLabel,
              onClick: () => self.toggleAxes()
            },
            renderToolbarIcon(self.config.icon, self.coordinateMode.value) ?? ''
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
      'axes',
      i18n.translate('vtkviewer.plugin.axes.getShortcutConfig')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.toggleAxes(),
      description: s.description
    }))
  }
}
