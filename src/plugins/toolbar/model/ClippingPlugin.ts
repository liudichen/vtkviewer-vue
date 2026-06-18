/**
 * 剖切面视图插件
 *
 * 三种显示模式：
 *   - clip（半剖）：裁剪掉平面一侧，保留另一侧
 *   - cut（截面）：仅显示平面与模型相交的截面轮廓
 *   - section（切口）：半剖 + 截面封口
 *
 * 交互方式：
 *   - 工具栏：开关、模式切换、预设方向（X/Y/Z）、翻转方向、滑块微调
 *   - 3D Widget（vtkImplicitPlaneWidget）：拖拽平面平移/旋转
 *   - 信息面板：实时显示原点和法向量坐标
 */

import {
  defineComponent,
  h,
  ref,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  type Component
} from 'vue'

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
// @ts-ignore — vtkClipPolyData 类型声明缺失
import vtkClipPolyData from '@kitware/vtk.js/Filters/Core/ClipPolyData'
// @ts-ignore — vtkCutter 类型声明缺失
import vtkCutter from '@kitware/vtk.js/Filters/Core/Cutter'
// @ts-ignore — vtkImplicitPlaneWidget 类型声明缺失
import vtkImplicitPlaneWidget from '@kitware/vtk.js/Widgets/Widgets3D/ImplicitPlaneWidget'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkPlane from '@kitware/vtk.js/Common/DataModel/Plane'
import vtkWidgetManager from '@kitware/vtk.js/Widgets/Core/WidgetManager'
import { ViewTypes } from '@kitware/vtk.js/Widgets/Core/WidgetManager/Constants'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { safeDeleteVtkObject } from '@/utils'
import { ClippingIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

// ============================================================
// 类型与常量
// ============================================================

type ClippingMode = 'clip' | 'cut' | 'section'
type NormalPreset = 'X' | 'Y' | 'Z' | '-X' | '-Y' | '-Z'

const NORMAL_PRESETS: Record<NormalPreset, [number, number, number]> = {
  X: [1, 0, 0],
  Y: [0, 1, 0],
  Z: [0, 0, 1],
  '-X': [-1, 0, 0],
  '-Y': [0, -1, 0],
  '-Z': [0, 0, -1]
}
const CUT_COLOR: [number, number, number] = [0.4, 0.8, 0.4]
const MODE_LABELS: Record<ClippingMode, string> = {
  clip: 'vtkviewer.plugin.clipping.mode.clip',
  cut: 'vtkviewer.plugin.clipping.mode.cut',
  section: 'vtkviewer.plugin.clipping.mode.slice'
}

export interface ClippingPluginConfig extends ToolbarPluginConfig {
  defaultMode?: ClippingMode
  defaultNormal?: NormalPreset
  insideOut?: boolean
  cutSectionColor?: [number, number, number]
  enableWidget?: boolean
}

interface ActorBackup {
  actor: any
  originalInput: any
}

// ============================================================
// 插件实现
// ============================================================

export class ClippingPlugin
  extends PluginBase<ClippingPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'clipping',
    name: 'ClippingPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.clipping.description')
  }
  readonly order = 5
  readonly defaultConfig: ClippingPluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    icon: ClippingIcon,
    shortcut: 'K',
    defaultMode: 'clip',
    defaultNormal: 'X',
    insideOut: false,
    cutSectionColor: CUT_COLOR,
    enableWidget: true
  }

  // --- 响应式状态 ---
  private enabled = ref(false)
  private mode = ref<ClippingMode>('clip')
  private planeOrigin = ref<[number, number, number]>([0, 0, 0])
  private planeNormal = ref<[number, number, number]>([1, 0, 0])
  private insideOut = ref(false)
  private panelOpen = ref(false)
  private modelShow = ref(true) // 模型是否暂时隐藏
  private widgetShow = ref(true) // 剖切工具是否暂时隐藏

  // --- 剖切参数缓存（避免重复计算） ---
  private lastClipParams: string = ''

  private getClipParamsKey(): string {
    return `${this.mode.value}|${this.planeOrigin.value.join(',')}|${this.planeNormal.value.join(',')}|${this.insideOut.value}`
  }

  // --- VTK 资源 ---
  private plane: any = null
  private clipper: any = null
  private cutter: any = null
  private cutActors: any[] = []
  private widgetManager: any = null
  private widget: any = null
  private actorBackups: ActorBackup[] = []

  // ============================================================
  //  生命周期
  // ============================================================

  protected onInit(): void {
    this.mode.value = this.config.defaultMode ?? 'clip'
    this.insideOut.value = this.config.insideOut ?? false
    this.planeNormal.value = [...NORMAL_PRESETS[this.config.defaultNormal ?? 'X']]
    if (this.getConfig('defaultActive') !== undefined) {
      this.enabled.value = !!this.getConfig('defaultActive')
    }

    // 直接初始化 VTK 数据对象（不依赖渲染器）
    this.initVtkResources()

    this.onEvent(BuiltinEvents.SCENE_LOADED, () => this.onSceneLoaded())
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => this.disableClipping())

    this.registerCommand('clipping:toggle', { execute: () => this.toggleClipping() })
    this.registerCommand('clipping:setMode', { execute: (m: ClippingMode) => this.setMode(m) })
    this.registerCommand('clipping:setNormal', {
      execute: (p: NormalPreset) => this.setNormalPreset(p)
    })
    this.registerCommand('clipping:flip', { execute: () => this.flipDirection() })

    this.registerInfoPanel()
    this.registerExtension()

    // 监听模型数量变化，无模型时注销扩展区和信息面板
    const unwatchModelCount = watch(
      () => this.ctx.scene.modelCount.value,
      (count: number) => {
        if (count === 0) {
          this.enabled.value = false
        } else {
          if (!this.ctx.infoPanel.has('clipping')) {
            this.registerInfoPanel()
          }
          if (!this.ctx.toolbarExtension.has('clipping')) {
            this.registerExtension()
          }
        }
      }
    )
    this.ctx.disposal.register(unwatchModelCount)
  }

  protected onDispose(): void {
    this.disableClipping()
    this.destroyVtkResources()
  }

  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'clipping:reset',
        scope: ResetScope.INDEPENDENT,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.clipping.resetDesc'),
        priority: 90,
        execute: () => this.resetToDefaults()
      },
      {
        name: 'clipping:disable',
        scope: ResetScope.CONDITIONAL,
        description: i18n.translate('vtkviewer.plugin.clipping.resetClose'),
        priority: 110,
        guard: {
          predicate: () => this.enabled.value,
          skipReason: i18n.translate('vtkviewer.plugin.clipping.noSession')
        },
        execute: () => this.disableClipping()
      }
    ]
  }

  // ============================================================
  //  VTK 资源管理
  // ============================================================

  private initVtkResources(): void {
    this.plane = vtkPlane.newInstance()
    this.plane.setOrigin(...this.planeOrigin.value)
    this.plane.setNormal(...this.planeNormal.value)

    this.clipper = vtkClipPolyData.newInstance()
    this.clipper.setClipFunction(this.plane)
    this.clipper.setInsideOut(this.insideOut.value)
    this.clipper.setGenerateClippedOutput(true)

    this.cutter = vtkCutter.newInstance()
    this.cutter.setCutFunction(this.plane)
    this.cutter.setCutValue(0)

    // Widget 延迟到首次启用剖切时创建，避免无模型时显示
    this.debugLog(
      `[ClippingPlugin] ${i18n.translate('vtkviewer.plugin.clipping.vtkResourcesInitialized')}`
    )
  }

  private initWidget(): void {
    const renderer = this.ctx.render?.getRenderer()
    const interactor = this.ctx.render?.getInteractor()
    if (!renderer || !interactor) {
      this.debugWarn(
        `[ClippingPlugin] ${i18n.translate('vtkviewer.plugin.clipping.cannotInitWidget')}`
      )
      return
    }

    this.widgetManager = vtkWidgetManager.newInstance()
    this.widgetManager.setRenderer(renderer)

    this.widget = vtkImplicitPlaneWidget.newInstance()
    const widgetObj = this.widgetManager.addWidget(this.widget, ViewTypes.DEFAULT)

    // 使用模型边界初始化 widget 位置（vtk.js widget 必须调用 placeWidget 才能正确显示）
    const bounds = renderer.computeVisiblePropBounds()
    if (bounds && bounds.length >= 6) {
      widgetObj.placeWidget(bounds)
    }

    const ws = widgetObj.getWidgetState()
    ws.setOrigin([...this.planeOrigin.value])
    ws.setNormal([...this.planeNormal.value])

    widgetObj.onInteractionEvent(() => this.syncWidgetToPlane())
  }

  private destroyVtkResources(): void {
    if (this.widgetManager) {
      this.widgetManager.releaseFocus()
      if (this.widget) this.widgetManager.removeWidget(this.widget)
      safeDeleteVtkObject(this.widgetManager)
      this.widgetManager = null
    }
    safeDeleteVtkObject(this.widget)
    this.widget = null
    safeDeleteVtkObject(this.clipper)
    this.clipper = null
    safeDeleteVtkObject(this.cutter)
    this.cutter = null
    safeDeleteVtkObject(this.plane)
    this.plane = null
    this.clearCutActors()
    this.restoreActorInputs()
  }

  // ============================================================
  //  剖切控制
  // ============================================================

  private toggleClipping(): void {
    this.enabled.value ? this.disableClipping() : this.enableClipping()
  }

  private enableClipping(): void {
    if (!this.plane) {
      this.debugWarn(
        `[ClippingPlugin] ${i18n.translate('vtkviewer.plugin.clipping.cannotEnableClipping')}`
      )
      return
    }
    // 首次启用时延迟创建 Widget
    if (!this.widgetManager && this.config.enableWidget !== false) {
      this.initWidget()
    }
    this.centerPlaneOnModel()
    this.syncPlaneToState()
    this.applyClipping()
    if (this.widgetManager && this.widget) {
      this.setWidgetVisibility(true) // 确保 widget 可见
      this.widgetManager.grabFocus(this.widget)
    }
    this.enabled.value = true
    this.ctx.render?.render()
  }

  private disableClipping(): void {
    if (!this.enabled.value) return
    // 关闭前先重置参数，下次开启时从干净状态开始
    this.resetClippingParams()
    this.restoreActorInputs()
    this.clearCutActors()
    // 关闭剖切时恢复模型显示
    if (!this.modelShow.value) {
      this.modelShow.value = true
      this.setModelVisibility(true)
    }
    this.widgetShow.value = true
    if (this.widgetManager) {
      this.setWidgetVisibility(false) // 隐藏 widget 渲染对象
      this.widgetManager.releaseFocus()
    }
    this.enabled.value = false
    // 清空备份，下次 enable 时重新备份（actors 可能已变化）
    this.actorBackups = []
    this.ctx.render?.render()
  }

  /** 切换模型可见性（暂时隐藏/显示原始模型，便于查看剖切工具） */
  private toggleModelVisibility(): void {
    this.modelShow.value = !this.modelShow.value
    this.setModelVisibility(this.modelShow.value)
    this.ctx.render?.render()
  }

  /** 设置场景模型的可见性 */
  private setModelVisibility(visible: boolean): void {
    const actors = this.getSceneActors()
    for (const actor of actors) {
      actor.setVisibility(visible)
    }
  }

  /** 切换剖切工具可见性（暂时隐藏/显示 widget，便于观察剖切面） */
  private toggleWidgetVisibility(): void {
    this.widgetShow.value = !this.widgetShow.value
    this.setWidgetVisibility(this.widgetShow.value)
    this.ctx.render?.render()
  }

  /** 设置剖切工具 widget 的可见性 */
  private setWidgetVisibility(visible: boolean): void {
    if (!this.widgetManager) return
    const widgets = this.widgetManager.getWidgets()
    if (widgets && widgets.length > 0) {
      const viewWidget = widgets[0]
      // vtk.js widget 通过 viewWidget 控制可见性
      if (viewWidget.setVisibility) {
        viewWidget.setVisibility(visible)
      }
    }
  }

  private setMode(mode: ClippingMode): void {
    if (this.mode.value === mode) return
    this.mode.value = mode
    if (this.enabled.value) {
      this.scheduleClipUpdate()
    }
  }

  private setNormalPreset(preset: NormalPreset): void {
    this.planeNormal.value = [...NORMAL_PRESETS[preset]]
    this.syncPlaneToState()
    this.syncStateToWidget()
    if (this.enabled.value) {
      this.scheduleClipUpdate()
    }
  }

  private flipDirection(): void {
    // 只切换 insideOut 标志，不取反法线（两者同时做会相互抵消）
    this.insideOut.value = !this.insideOut.value
    this.syncPlaneToState()
    if (this.enabled.value) {
      this.scheduleClipUpdate()
    }
  }

  // ============================================================
  //  剖切计算
  // ============================================================

  private applyClipping(): void {
    const renderer = this.ctx.render?.getRenderer()
    if (!renderer || !this.plane) return

    // 参数未变时跳过重复计算（86MB 模型计算耗时 >1s，避免浪费）
    const paramsKey = this.getClipParamsKey()
    if (paramsKey === this.lastClipParams) return
    this.lastClipParams = paramsKey

    // 每次重新创建 clipper/cutter，避免复用已损坏的内部状态
    // （VTK 轻量对象，创建成本很低）
    this.clipper = vtkClipPolyData.newInstance()
    this.clipper.setClipFunction(this.plane)
    this.clipper.setInsideOut(this.insideOut.value)
    this.clipper.setGenerateClippedOutput(true)

    this.cutter = vtkCutter.newInstance()
    this.cutter.setCutFunction(this.plane)
    this.cutter.setCutValue(0)

    // 清除之前的截面 actors（释放 VTK 对象）
    this.clearCutActors()

    const actors = this.getSceneActors()
    if (actors.length === 0) return

    // 首次剖切时备份原始输入（用于 disable 恢复 + 剖切计算输入源）
    // 注意：必须使用 originalInput，不能用 actor.getMapper().getInputData()，
    // 因为 clip 模式会修改 mapper 的输入为裁剪输出，二次调用时会拿到错误数据。
    if (this.actorBackups.length === 0) {
      this.backupActorInputs(actors)
    }

    const mode = this.mode.value
    const cutColor = this.config.cutSectionColor ?? CUT_COLOR

    if (mode === 'clip' || mode === 'section') {
      for (const actor of actors) {
        const backup = this.actorBackups.find(b => b.actor === actor)
        const input = backup?.originalInput
        if (!input) continue
        this.clipper.setInputData(input)
        this.clipper.setInsideOut(this.insideOut.value)
        this.clipper.update()
        actor.getMapper()?.setInputData(this.clipper.getOutputData())
      }
    }

    if (mode === 'cut' || mode === 'section') {
      for (const actor of actors) {
        const backup = this.actorBackups.find(b => b.actor === actor)
        const input = backup?.originalInput
        if (!input) continue
        try {
          this.cutter.setInputData(input)
          this.cutter.setCutValue(0)
          this.cutter.update()
          const cutData = this.cutter.getOutputData()
          if (cutData?.getPoints()?.getNumberOfPoints() > 0) {
            const cutMapper = vtkMapper.newInstance()
            cutMapper.setInputData(cutData)
            const cutActor = vtkActor.newInstance()
            cutActor.setMapper(cutMapper)
            cutActor.getProperty().setColor(...cutColor)
            cutActor.getProperty().setLighting(true)
            cutActor.getProperty().setInterpolationToFlat()
            cutActor.setPickable(false)
            renderer.addActor(cutActor)
            this.cutActors.push(cutActor)
          }
        } catch (e) {
          console.error(
            `[ClippingPlugin] ${i18n.translate('vtkviewer.plugin.clipping.cutterFailed')}:`,
            e,
            `${i18n.translate('vtkviewer.plugin.clipping.inputType')}:`,
            input.getClassName?.()
          )
        }
      }
    }

    if (mode === 'cut') {
      for (const actor of actors) actor.setVisibility(false)
    }

    // 如果模型被用户隐藏，重新隐藏所有 scene actors（保留截面可见）
    if (!this.modelShow.value) {
      for (const actor of actors) {
        actor.setVisibility(false)
      }
    }

    if (mode == 'clip') {
      this.setModelVisibility(this.modelShow.value)
    }
  }

  // ============================================================
  //  Actor 备份/恢复
  // ============================================================

  private getSceneActors(): any[] {
    const cutSet = new Set(this.cutActors)
    return this.ctx.scene.getActors().filter(a => !cutSet.has(a))
  }

  private backupActorInputs(actors: any[]): void {
    if (this.actorBackups.length > 0) return
    for (const actor of actors) {
      const input = actor.getMapper()?.getInputData()
      if (input) this.actorBackups.push({ actor, originalInput: input })
    }
  }

  private restoreActorInputs(): void {
    for (const b of this.actorBackups) {
      const mapper = b.actor?.getMapper()
      if (mapper && b.originalInput) {
        mapper.setInputData(b.originalInput)
        // 只有当模型未被用户隐藏时才恢复可见性
        if (this.modelShow.value) {
          b.actor?.setVisibility?.(true)
        }
      }
    }
    this.actorBackups = []
  }

  private clearCutActors(): void {
    const renderer = this.ctx.render?.getRenderer()
    for (const a of this.cutActors) {
      try {
        if (renderer) renderer.removeActor(a)
        // 递归释放 cut actor 的内部 VTK 对象（mapper/inputData/property）
        const mapper = a.getMapper?.()
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
        const prop = a.getProperty?.()
        if (prop) {
          try {
            prop.delete()
          } catch {}
        }
        a.delete()
      } catch {}
    }
    this.cutActors = []
  }

  // ============================================================
  //  平面定位与同步
  // ============================================================

  private centerPlaneOnModel(): void {
    const renderer = this.ctx.render?.getRenderer()
    if (!renderer) return
    const bounds = renderer.computeVisiblePropBounds()
    if (!bounds || bounds.length < 6) return
    if (bounds[0] === bounds[1] && bounds[2] === bounds[3] && bounds[4] === bounds[5]) return
    const c: [number, number, number] = [
      (bounds[0] + bounds[1]) / 2,
      (bounds[2] + bounds[3]) / 2,
      (bounds[4] + bounds[5]) / 2
    ]
    this.planeOrigin.value = c
    this.syncPlaneToState()
    this.syncStateToWidget()
  }

  private onSceneLoaded(): void {
    if (!this.enabled.value) return
    this.centerPlaneOnModel()
    this.applyClipping()
  }

  private syncPlaneToState(): void {
    if (this.plane) {
      this.plane.setOrigin(...this.planeOrigin.value)
      this.plane.setNormal(...this.planeNormal.value)
    }
    if (this.clipper) this.clipper.setInsideOut(this.insideOut.value)
  }

  private syncStateToWidget(): void {
    if (!this.widgetManager) return
    const ws = this.widgetManager.getWidgets()?.[0]?.getWidgetState()
    if (ws) {
      ws.setOrigin([...this.planeOrigin.value])
      ws.setNormal([...this.planeNormal.value])
    }
  }

  private syncWidgetToPlane(): void {
    if (!this.widgetManager) return
    const ws = this.widgetManager.getWidgets()?.[0]?.getWidgetState()
    if (!ws) return
    this.planeOrigin.value = [...ws.getOrigin()] as [number, number, number]
    this.planeNormal.value = [...ws.getNormal()] as [number, number, number]
    this.syncPlaneToState()
    this.scheduleClipUpdate()
  }

  private scheduleClipUpdate = (() => {
    let rafId = 0
    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        // 用 setTimeout 把重型计算放到下一个宏任务，让 rAF 回调尽快返回
        setTimeout(() => {
          try {
            this.applyClipping()
            this.ctx.render?.render()
          } catch (e) {
            console.error(
              `[ClippingPlugin] ${i18n.translate('vtkviewer.plugin.clipping.scheduleUpdateError')}:`,
              e
            )
          } finally {
            rafId = 0
          }
        }, 0)
      })
    }
  })()

  private resetToDefaults(): void {
    // 注意：此方法由 clearScene() 通过 resetManager 触发，
    // 只需重置响应式状态并清空业务数据，不销毁 VTK 对象
    // （VTK 对象在 dispose() 中统一销毁，避免重建时内部状态异常）。
    this.enabled.value = false
    this.mode.value = this.config.defaultMode ?? 'clip'
    this.insideOut.value = this.config.insideOut ?? false
    this.planeNormal.value = [...NORMAL_PRESETS[this.config.defaultNormal ?? 'X']]
    this.planeOrigin.value = [0, 0, 0]
    this.panelOpen.value = false
    this.modelShow.value = true
    this.widgetShow.value = true
    this.lastClipParams = ''

    // 重置 plane 参数（plane 对象本身复用）
    if (this.plane) {
      this.plane.setOrigin(0, 0, 0)
      this.plane.setNormal(...NORMAL_PRESETS[this.config.defaultNormal ?? 'X'])
    }

    // clipper/cutter 不在这里重置参数，applyClipping() 每次重建它们
    // 这里只把引用设为 null，让 VTK GC 处理旧对象
    this.clipper = null
    this.cutter = null

    // 隐藏 widget（3D 剖切平面手柄），避免卸载后仍可见
    this.setWidgetVisibility(false)

    // 释放 cut actor（可能未被 scene.clearScene() 清理）
    this.clearCutActors()

    // 清空备份引用（不 delete originalInput，数据由 actor 的 mapper 拥有）
    this.actorBackups = []

    // 释放 widget focus（widget 本身由 widgetManager 生命周期管理）
    this.widgetManager?.releaseFocus()
    // 不调用 render()——clearScene() 后续会加载新模型并触发渲染
  }

  // ============================================================
  //  信息面板
  // ============================================================

  private registerInfoPanel(): void {
    const self = this
    this.registerInfoPanelItem({
      component: defineComponent({
        setup() {
          return () => {
            if (!self.enabled.value) return null
            const o = self.planeOrigin.value,
              n = self.planeNormal.value
            return [
              h('span', {}, [
                h(
                  'span',
                  {
                    class: 'iimm-vtk-info-value--colored',
                    style: { color: 'var(--iimm-vtk-btn-color-active)' }
                  },
                  `${i18n.translate('vtkviewer.plugin.clipping.title')} [${i18n.translate(MODE_LABELS[self.mode.value])}]`
                )
              ]),
              h('span', {}, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.clipping.info.origin') + ': '
                ),
                h(
                  'span',
                  { class: 'iimm-vtk-info-value' },
                  `(${o[0].toFixed(1)}, ${o[1].toFixed(1)}, ${o[2].toFixed(1)})`
                )
              ]),
              h('span', {}, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.clipping.info.normal') + ': '
                ),
                h(
                  'span',
                  { class: 'iimm-vtk-info-value' },
                  `(${n[0].toFixed(2)}, ${n[1].toFixed(2)}, ${n[2].toFixed(2)})`
                )
              ])
            ]
          }
        }
      }),
      priority: 15,
      visibleCheck: () => self.enabled.value
    })
  }

  /** 重置剖切参数到初始状态（保持剖切开启） */
  private resetClippingParams(): void {
    this.mode.value = this.config.defaultMode ?? 'clip'
    this.insideOut.value = this.config.insideOut ?? false
    this.planeNormal.value = [...NORMAL_PRESETS[this.config.defaultNormal ?? 'X']]
    this.planeOrigin.value = [0, 0, 0]
    this.modelShow.value = true
    this.widgetShow.value = true
    this.panelOpen.value = false

    if (this.plane) {
      this.plane.setOrigin(0, 0, 0)
      this.plane.setNormal(...NORMAL_PRESETS[this.config.defaultNormal ?? 'X'])
    }

    if (this.enabled.value) {
      this.syncPlaneToState()
      this.syncStateToWidget()
      this.setWidgetVisibility(true)
      this.applyClipping()
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
      priority: 10
    })

    // 监听 enabled 状态变化，自动激活/停用扩展区
    const unwatch = watch(
      () => self.enabled.value,
      (active: boolean) => {
        if (active) {
          self.ctx.toolbarExtension.activate('clipping')
        } else {
          self.ctx.toolbarExtension.deactivate('clipping')
        }
      },
      { immediate: true }
    )
    this.ctx.disposal.register(unwatch)
  }

  /** 渲染扩展区内容 */
  renderExtension(): Component {
    const self = this
    return defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)
        const settingsAlign = ref<'left' | 'right'>('left')
        const onDocClick = (e: MouseEvent) => {
          if (!self.panelOpen.value) return
          if (el.value && !el.value.contains(e.target as Node)) self.panelOpen.value = false
        }
        onMounted(() => document.addEventListener('click', onDocClick, true))
        onUnmounted(() => document.removeEventListener('click', onDocClick, true))

        const toggleSettings = () => {
          self.panelOpen.value = !self.panelOpen.value
          if (self.panelOpen.value) {
            nextTick(() => {
              const btn = document.querySelector(
                '.iimm-vtk-clipping-settings .iimm-vtk-extension-btn'
              ) as HTMLElement
              if (!btn) return
              settingsAlign.value =
                window.innerWidth - btn.getBoundingClientRect().left < 220 ? 'right' : 'left'
            })
          }
        }

        const renderModeBtn = (mode: ClippingMode, label: string) =>
          h(
            'button',
            {
              class: ['iimm-vtk-extension-btn', { 'is-active': self.mode.value === mode }],
              title: label,
              onClick: () => self.setMode(mode)
            },
            label
          )

        const renderDirBtn = (preset: NormalPreset) => {
          const isActive =
            self.planeNormal.value[0] === NORMAL_PRESETS[preset][0] &&
            self.planeNormal.value[1] === NORMAL_PRESETS[preset][1] &&
            self.planeNormal.value[2] === NORMAL_PRESETS[preset][2]
          return h(
            'button',
            {
              class: ['iimm-vtk-extension-btn', { 'is-active': isActive }],
              title: `${preset} ${i18n.translate('vtkviewer.plugin.clipping.axis')}`,
              onClick: () => self.setNormalPreset(preset)
            },
            preset
          )
        }

        const renderOriginSlider = (label: string, idx: number) =>
          h('div', { class: 'iimm-vtk-popup-section' }, [
            h('div', { class: 'iimm-vtk-popup-row', style: { justifyContent: 'space-between' } }, [
              h('span', {}, `${i18n.translate('vtkviewer.plugin.clipping.info.origin')} ${label}`),
              h('span', {}, self.planeOrigin.value[idx].toFixed(1))
            ]),
            h('input', {
              class: 'iimm-vtk-popup-slider',
              type: 'range',
              min: '-100',
              max: '100',
              step: '1',
              value: String(self.planeOrigin.value[idx]),
              onInput: (e: Event) => {
                const val = parseFloat((e.target as HTMLInputElement).value)
                const origin = [...self.planeOrigin.value] as [number, number, number]
                origin[idx] = val
                self.planeOrigin.value = origin
                self.syncPlaneToState()
                self.syncStateToWidget()
                if (self.enabled.value) {
                  self.applyClipping()
                  self.ctx.render?.render()
                }
              }
            })
          ])

        return () =>
          h(
            'div',
            {
              ref: el,
              class: 'iimm-vtk-extension-item'
            },
            [
              // 模式选择
              renderModeBtn('clip', i18n.translate('vtkviewer.plugin.clipping.mode.clip')),
              renderModeBtn('cut', i18n.translate('vtkviewer.plugin.clipping.mode.cut')),
              renderModeBtn('section', i18n.translate('vtkviewer.plugin.clipping.mode.slice')),
              // 分隔线
              h('div', { class: 'iimm-vtk-extension-separator' }),
              // 方向选择
              renderDirBtn('X'),
              renderDirBtn('Y'),
              renderDirBtn('Z'),
              // 分隔线
              h('div', { class: 'iimm-vtk-extension-separator' }),
              // 翻转方向
              h(
                'button',
                {
                  class: 'iimm-vtk-extension-btn',
                  title: i18n.translate('vtkviewer.plugin.clipping.flipDirection'),
                  onClick: () => self.flipDirection()
                },
                '↔'
              ),
              // 分隔线
              h('div', { class: 'iimm-vtk-extension-separator' }),
              // 隐藏/显示模型
              h(
                'button',
                {
                  class: ['iimm-vtk-extension-btn', { 'is-active': self.modelShow.value }],
                  title: i18n.translate('vtkviewer.plugin.clipping.showModel'),
                  onClick: () => self.toggleModelVisibility()
                },
                '👁'
              ),
              // 隐藏/显示剖切工具
              h(
                'button',
                {
                  class: ['iimm-vtk-extension-btn', { 'is-active': self.widgetShow.value }],
                  title: i18n.translate('vtkviewer.plugin.clipping.showTool'),
                  onClick: () => self.toggleWidgetVisibility()
                },
                '🔪'
              ),
              // 分隔线
              h('div', { class: 'iimm-vtk-extension-separator' }),
              // 重置按钮
              h(
                'button',
                {
                  class: 'iimm-vtk-extension-btn',
                  title: i18n.translate('vtkviewer.plugin.clipping.resetDesc'),
                  onClick: () => self.resetClippingParams()
                },
                i18n.translate('vtkviewer.plugin.clipping.reset')
              ),
              // 分隔线
              h('div', { class: 'iimm-vtk-extension-separator' }),
              // 设置按钮 + 弹窗（使用标准 absolute 定位弹窗模式）
              h(
                'div',
                {
                  class: 'iimm-vtk-clipping-settings',
                  style: { position: 'relative', display: 'inline-flex' }
                },
                [
                  h(
                    'button',
                    {
                      class: ['iimm-vtk-extension-btn', { 'is-active': self.panelOpen.value }],
                      title: i18n.translate('vtkviewer.plugin.clipping.tooltip'),
                      onClick: (e: Event) => {
                        e.stopPropagation()
                        toggleSettings()
                      }
                    },
                    h(
                      'svg',
                      { viewBox: '0 0 24 24', width: 14, height: 14, fill: 'currentColor' },
                      h('path', {
                        d: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'
                      })
                    )
                  ),
                  // 设置面板 — 标准 absolute 定位，CSS 类自带 z-index
                  self.panelOpen.value
                    ? h(
                        'div',
                        {
                          class: 'iimm-vtk-settings-panel',
                          style:
                            settingsAlign.value === 'right'
                              ? { right: '0', left: 'auto' }
                              : { left: '0' }
                        },
                        [
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
                                i18n.translate('vtkviewer.plugin.clipping.title')
                              )
                            ]
                          ),
                          renderOriginSlider('X', 0),
                          renderOriginSlider('Y', 1),
                          renderOriginSlider('Z', 2)
                        ]
                      )
                    : null
                ]
              ) // end clipping-settings wrapper
            ]
          ) // end return
      }
    })
  }

  /** 扩展区是否激活 */
  isExtensionActive(): boolean {
    return this.enabled.value
  }

  // ============================================================
  //  UI 渲染
  // ============================================================

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          // 仅渲染剖切开关按钮，设置按钮已移至 toolbarExtension
          return h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.enabled.value }],
              title: self.enabled.value
                ? i18n.translate('vtkviewer.plugin.clipping.tooltipDisable')
                : i18n.translate('vtkviewer.plugin.clipping.tooltipEnable'),
              onClick: () => self.toggleClipping()
            },
            renderToolbarIcon(self.config.icon) ?? ''
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
      'clipping',
      i18n.translate('vtkviewer.plugin.clipping.getShortcutConfig')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.toggleClipping(),
      description: s.description
    }))
  }
}
