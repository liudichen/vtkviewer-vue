/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-02 08:23:37
 * @LastEditTime: 2026-06-13 20:40:28
 * @Description:
 */
/**
 * 空间网格插件
 * 在3D场景中显示XYZ坐标网格，首个网格通过原点，向两侧扩散覆盖模型
 */
import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinEvents } from '@/configs'
import { RenderGridIcon } from '@/icons'
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

// ============================================================
// 类型
// ============================================================
type GridDirection = 'xy' | 'yz' | 'xz'
const DIRS: GridDirection[] = ['xy', 'yz', 'xz']

interface ModelBounds {
  x: { min: number; max: number }
  y: { min: number; max: number }
  z: { min: number; max: number }
}

type StepCalculator = (bounds: ModelBounds, dir: GridDirection) => number

interface GridDirCfg {
  visible: boolean
  color: [number, number, number]
  step: number
  opacity: number
  /** 是否扩展到空间（从平面网格扩展为3D空间网格） */
  expandToSpace: boolean
}

interface AutoAdaptConfig {
  enabled: boolean
  xyCalculator?: StepCalculator
  yzCalculator?: StepCalculator
  xzCalculator?: StepCalculator
}

export interface RenderGridPluginConfig extends ToolbarPluginConfig {
  defaultStep?: number
  autoAdapt?: AutoAdaptConfig
  xy?: Partial<GridDirCfg>
  yz?: Partial<GridDirCfg>
  xz?: Partial<GridDirCfg>
}

// ============================================================
// 常量与工具
// ============================================================
const DIR_META: Record<GridDirection, { labelKey: string; color: [number, number, number] }> = {
  xy: { labelKey: 'vtkviewer.plugin.renderGrid.xy', color: [0, 204, 204] },
  yz: { labelKey: 'vtkviewer.plugin.renderGrid.yz', color: [204, 0, 0] },
  xz: { labelKey: 'vtkviewer.plugin.renderGrid.xz', color: [0, 204, 0] }
}

const DEF_STEP = 5

/**
 * 默认自适应步长计算
 * 根据模型在该平面方向上的最大半幅计算，目标约 8-12 条线
 */
function defaultStepCalc(b: ModelBounds, dir: GridDirection): number {
  const axes =
    dir === 'xy'
      ? (['x', 'y'] as const)
      : dir === 'yz'
        ? (['y', 'z'] as const)
        : (['x', 'z'] as const)
  const maxAbsExtent = Math.max(...axes.flatMap(a => [Math.abs(b[a].min), Math.abs(b[a].max)]))
  if (maxAbsExtent <= 0) return 1

  const raw = Math.max(maxAbsExtent, 10) / 10
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const norm = raw / mag
  const nice = norm <= 1.5 ? 1 : norm <= 3.5 ? 2 : norm <= 7.5 ? 5 : 10
  return Math.max(0.1, nice * mag)
}

/** 获取某个平面的最大半幅距离（到原点最远的模型顶点） */
function dirMaxExtent(b: ModelBounds, dir: GridDirection): number {
  const axes =
    dir === 'xy'
      ? (['x', 'y'] as const)
      : dir === 'yz'
        ? (['y', 'z'] as const)
        : (['x', 'z'] as const)
  return Math.max(...axes.flatMap(a => [Math.abs(b[a].min), Math.abs(b[a].max)]))
}

function toGL(c: [number, number, number]): [number, number, number] {
  return [c[0] / 255, c[1] / 255, c[2] / 255]
}
function colorHex(c: [number, number, number]): string {
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('')
}
function hexColor(hex: string): [number, number, number] {
  const m = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [128, 128, 128]
}

// ============================================================
// PolyData 构建 —— 首个网格通过原点，向两侧扩散覆盖模型
// ============================================================

const DEF_BOUNDS = { x: { min: -50, max: 50 }, y: { min: -50, max: 50 }, z: { min: -50, max: 50 } }

function buildGrid(
  dir: GridDirection,
  step: number,
  expand: boolean,
  bounds: ModelBounds | null
): vtkPolyData {
  const pts: number[] = []
  const lns: number[] = []
  let idx = 0
  const b = bounds ?? DEF_BOUNDS

  // 辅助：计算负侧和正侧的线数（不对称，各自覆盖模型即可）
  const neg = (v: number) => Math.ceil(Math.max(0, -v) / step)
  const pos = (v: number) => Math.ceil(Math.max(0, v) / step)

  // --- XY 平面 ---
  if (dir === 'xy') {
    const nNegX = neg(b.x.min),
      nPosX = pos(b.x.max)
    const nNegY = neg(b.y.min),
      nPosY = pos(b.y.max)
    const spanNegX = nNegX * step,
      spanPosX = nPosX * step
    const spanNegY = nNegY * step,
      spanPosY = nPosY * step

    if (!expand) {
      // Y 方向线（固定 X）：x 从 -nNegX 到 +nPosX，Y 方向覆盖全范围
      for (let xi = -nNegX; xi <= nPosX; xi++) {
        const x = xi * step
        pts.push(x, -spanNegY, 0, x, spanPosY, 0)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
      // X 方向线（固定 Y）：y 从 -nNegY 到 +nPosY，X 方向覆盖全范围
      for (let yi = -nNegY; yi <= nPosY; yi++) {
        const y = yi * step
        pts.push(-spanNegX, y, 0, spanPosX, y, 0)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
    } else {
      const nNegZ = neg(b.z.min),
        nPosZ = pos(b.z.max)
      for (let zi = -nNegZ; zi <= nPosZ; zi++) {
        const z = zi * step
        for (let xi = -nNegX; xi <= nPosX; xi++) {
          const x = xi * step
          pts.push(x, -spanNegY, z, x, spanPosY, z)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
        for (let yi = -nNegY; yi <= nPosY; yi++) {
          const y = yi * step
          pts.push(-spanNegX, y, z, spanPosX, y, z)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
      }
    }
  }

  // --- YZ 平面 ---
  else if (dir === 'yz') {
    const nNegY = neg(b.y.min),
      nPosY = pos(b.y.max)
    const nNegZ = neg(b.z.min),
      nPosZ = pos(b.z.max)
    const spanNegY = nNegY * step,
      spanPosY = nPosY * step
    const spanNegZ = nNegZ * step,
      spanPosZ = nPosZ * step

    if (!expand) {
      for (let yi = -nNegY; yi <= nPosY; yi++) {
        const y = yi * step
        pts.push(0, y, -spanNegZ, 0, y, spanPosZ)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
      for (let zi = -nNegZ; zi <= nPosZ; zi++) {
        const z = zi * step
        pts.push(0, -spanNegY, z, 0, spanPosY, z)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
    } else {
      const nNegX = neg(b.x.min),
        nPosX = pos(b.x.max)
      for (let xi = -nNegX; xi <= nPosX; xi++) {
        const x = xi * step
        for (let yi = -nNegY; yi <= nPosY; yi++) {
          const y = yi * step
          pts.push(x, y, -spanNegZ, x, y, spanPosZ)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
        for (let zi = -nNegZ; zi <= nPosZ; zi++) {
          const z = zi * step
          pts.push(x, -spanNegY, z, x, spanPosY, z)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
      }
    }
  }

  // --- XZ 平面 ---
  else {
    const nNegX = neg(b.x.min),
      nPosX = pos(b.x.max)
    const nNegZ = neg(b.z.min),
      nPosZ = pos(b.z.max)
    const spanNegX = nNegX * step,
      spanPosX = nPosX * step
    const spanNegZ = nNegZ * step,
      spanPosZ = nPosZ * step

    if (!expand) {
      for (let xi = -nNegX; xi <= nPosX; xi++) {
        const x = xi * step
        pts.push(x, 0, -spanNegZ, x, 0, spanPosZ)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
      for (let zi = -nNegZ; zi <= nPosZ; zi++) {
        const z = zi * step
        pts.push(-spanNegX, 0, z, spanPosX, 0, z)
        lns.push(2, idx, idx + 1)
        idx += 2
      }
    } else {
      const nNegY = neg(b.y.min),
        nPosY = pos(b.y.max)
      for (let yi = -nNegY; yi <= nPosY; yi++) {
        const y = yi * step
        for (let xi = -nNegX; xi <= nPosX; xi++) {
          const x = xi * step
          pts.push(x, y, -spanNegZ, x, y, spanPosZ)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
        for (let zi = -nNegZ; zi <= nPosZ; zi++) {
          const z = zi * step
          pts.push(-spanNegX, y, z, spanPosX, y, z)
          lns.push(2, idx, idx + 1)
          idx += 2
        }
      }
    }
  }

  const pd = vtkPolyData.newInstance()
  pd.getPoints().setData(new Float32Array(pts), 3)
  pd.getLines().setData(new Uint32Array(lns))
  return pd
}

// ============================================================
// 插件实现
// ============================================================
export class RenderGridPlugin
  extends PluginBase<RenderGridPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'renderGrid',
    name: 'RenderGridPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.renderGrid.description')
  }
  readonly order = 4
  readonly defaultConfig: RenderGridPluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    icon: { default: RenderGridIcon },
    defaultStep: DEF_STEP,
    autoAdapt: { enabled: true },
    xy: {
      visible: false,
      color: DIR_META.xy.color,
      step: DEF_STEP,
      opacity: 1,
      expandToSpace: false
    },
    yz: {
      visible: false,
      color: DIR_META.yz.color,
      step: DEF_STEP,
      opacity: 1,
      expandToSpace: false
    },
    xz: {
      visible: false,
      color: DIR_META.xz.color,
      step: DEF_STEP,
      opacity: 1,
      expandToSpace: false
    }
  }

  // --- state ---
  private autoAdapt = ref(true)
  private panelOpen = ref(false)
  private expanded = ref<Set<GridDirection>>(new Set())
  /** 当前模型边界，用于计算网格范围和间距滑块最大值 */
  private currentModelBounds = ref<ModelBounds | null>(null)

  private dCfg: Record<GridDirection, GridDirCfg> = {} as any
  private vis: Record<GridDirection, ReturnType<typeof ref<boolean>>> = {} as any
  private clr: Record<GridDirection, ReturnType<typeof ref<[number, number, number]>>> = {} as any
  private stp: Record<GridDirection, ReturnType<typeof ref<number>>> = {} as any
  private opa: Record<GridDirection, ReturnType<typeof ref<number>>> = {} as any
  private expand: Record<GridDirection, ReturnType<typeof ref<boolean>>> = {} as any
  private autoStp: Record<GridDirection, ReturnType<typeof ref<number>>> = {} as any

  // --- vtk objects ---
  private actors: Record<GridDirection, vtkActor | null> = { xy: null, yz: null, xz: null }
  private mappers: Record<GridDirection, vtkMapper | null> = { xy: null, yz: null, xz: null }

  // --- lifecycle ---
  protected onInit(): void {
    for (const dir of DIRS) {
      this.vis[dir] = ref(false)
      this.clr[dir] = ref(DIR_META[dir].color)
      this.stp[dir] = ref(DEF_STEP)
      this.opa[dir] = ref(1)
      this.expand[dir] = ref(false)
      this.autoStp[dir] = ref(DEF_STEP)
    }

    this.autoAdapt.value = this.config.autoAdapt?.enabled ?? true

    for (const dir of DIRS) {
      const c = this.config[dir] ?? {}
      this.dCfg[dir] = {
        visible: c.visible ?? false,
        color: c.color ?? DIR_META[dir].color,
        step: c.step ?? DEF_STEP,
        opacity: c.opacity ?? 1,
        expandToSpace: c.expandToSpace ?? false
      }
      this.vis[dir].value = this.dCfg[dir].visible
      this.clr[dir].value = [...this.dCfg[dir].color]
      this.stp[dir].value = this.dCfg[dir].step
      this.opa[dir].value = this.dCfg[dir].opacity
      this.expand[dir].value = this.dCfg[dir].expandToSpace
    }

    this.createActors()
    this.syncBoundsAndRebuild()

    const onSceneLoaded = () => {
      requestAnimationFrame(() => {
        this.syncBoundsAndRebuild()
        if (this.autoAdapt.value) this.recalcAuto()
        this.rebuildAll()
        this.ctx.render.render()
      })
    }
    this.onEvent(BuiltinEvents.SCENE_LOADED, onSceneLoaded)

    const onSceneCleared = () => {
      this.clearAll()
      this.ctx.render.render()
    }
    this.onEvent(BuiltinEvents.SCENE_CLEARED, onSceneCleared)
  }

  /** 更新缓存的模型边界 */
  private syncBoundsAndRebuild(): void {
    this.currentModelBounds.value = this.getModelBounds()
  }

  private createActors(): void {
    const renderer = this.ctx.render.getRenderer()
    if (!renderer) return
    for (const dir of DIRS) {
      const mapper = vtkMapper.newInstance()
      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)
      actor.getProperty().setColor(...toGL(this.dCfg[dir].color))
      actor.getProperty().setLighting(false)
      actor.getProperty().setOpacity(this.dCfg[dir].opacity)
      actor.setPickable(false)
      actor.setVisibility(this.dCfg[dir].visible)
      this.mappers[dir] = mapper
      this.actors[dir] = actor
      renderer.addActor(actor)
    }
  }

  /** 从模型 Actor 获取边界（排除网格 Actor 自身） */
  private getModelBounds(): ModelBounds | null {
    const actors = this.ctx.scene.getActors()
    if (!actors || actors.length === 0) {
      return this.getBoundsFromRenderer()
    }

    let xMin = Infinity,
      xMax = -Infinity
    let yMin = Infinity,
      yMax = -Infinity
    let zMin = Infinity,
      zMax = -Infinity
    let hasBounds = false

    for (const actor of actors) {
      if (Object.values(this.actors).includes(actor as any)) continue
      const b = actor.getBounds?.()
      if (!b || b.length < 6) continue
      if (b[0] === b[1] && b[2] === b[3] && b[4] === b[5]) continue
      if (!isFinite(b[0]) || !isFinite(b[1])) continue
      hasBounds = true
      xMin = Math.min(xMin, b[0])
      xMax = Math.max(xMax, b[1])
      yMin = Math.min(yMin, b[2])
      yMax = Math.max(yMax, b[3])
      zMin = Math.min(zMin, b[4])
      zMax = Math.max(zMax, b[5])
    }

    if (!hasBounds) return this.getBoundsFromRenderer()
    return {
      x: { min: xMin, max: xMax },
      y: { min: yMin, max: yMax },
      z: { min: zMin, max: zMax }
    }
  }

  /** 备用方案：从 renderer 获取边界（排除网格 Actor） */
  private getBoundsFromRenderer(): ModelBounds | null {
    const renderer = this.ctx.render.getRenderer()
    if (!renderer) return null

    const gridActorSet = new Set(Object.values(this.actors))
    let xMin = Infinity,
      xMax = -Infinity
    let yMin = Infinity,
      yMax = -Infinity
    let zMin = Infinity,
      zMax = -Infinity
    let hasBounds = false

    const props = renderer.getViewProps()
    for (const prop of props) {
      if (gridActorSet.has(prop as any)) continue
      const b = (prop as any).getBounds?.()
      if (!b || b.length < 6) continue
      if (b[0] === b[1] && b[2] === b[3] && b[4] === b[5]) continue
      if (!isFinite(b[0]) || !isFinite(b[1])) continue
      hasBounds = true
      xMin = Math.min(xMin, b[0])
      xMax = Math.max(xMax, b[1])
      yMin = Math.min(yMin, b[2])
      yMax = Math.max(yMax, b[3])
      zMin = Math.min(zMin, b[4])
      zMax = Math.max(zMax, b[5])
    }

    if (!hasBounds) return null
    return {
      x: { min: xMin, max: xMax },
      y: { min: yMin, max: yMax },
      z: { min: zMin, max: zMax }
    }
  }

  private recalcAuto(): void {
    const bounds = this.currentModelBounds.value
    if (!bounds) return
    const cfg = this.config.autoAdapt ?? { enabled: true }
    for (const dir of DIRS) {
      const key = `${dir}Calculator` as keyof AutoAdaptConfig
      const custom = cfg[key] as StepCalculator | undefined
      this.autoStp[dir].value = (custom ?? defaultStepCalc)(bounds, dir)
    }
  }

  private getStep(dir: GridDirection): number {
    return this.autoAdapt.value ? this.autoStp[dir]!.value! : this.stp[dir]!.value!
  }

  private rebuildGrid(dir: GridDirection): void {
    const actor = this.actors[dir],
      mapper = this.mappers[dir]
    if (!actor || !mapper) return
    mapper.setInputData(
      buildGrid(dir, this.getStep(dir), this.expand[dir]!.value!, this.currentModelBounds.value)
    )
    actor.getProperty().setColor(...toGL(this.clr[dir]!.value!))
    actor.getProperty().setOpacity(this.opa[dir]!.value!)
    actor.setVisibility(this.vis[dir]!.value!)
  }

  private rebuildAll(): void {
    for (const dir of DIRS) this.rebuildGrid(dir)
  }

  private clearAll(): void {
    for (const dir of DIRS) {
      const a = this.actors[dir]
      if (a) a.setVisibility(false)
      const m = this.mappers[dir]
      if (m) m.setInputData(vtkPolyData.newInstance())
    }
  }

  // --- control methods ---
  private toggleDir(dir: GridDirection): void {
    this.vis[dir].value = !this.vis[dir].value
    this.dCfg[dir].visible = this.vis[dir].value
    // 关闭时收起详细设置
    if (!this.vis[dir].value) {
      const s = new Set(this.expanded.value)
      s.delete(dir)
      this.expanded.value = s
    }
    this.rebuildGrid(dir)
    this.ctx.render.render()
  }
  private setColor(dir: GridDirection, c: [number, number, number]): void {
    this.clr[dir].value = c
    this.dCfg[dir].color = c
    this.actors[dir]?.getProperty().setColor(...toGL(c))
    this.ctx.render.render()
  }
  private setStep(dir: GridDirection, v: number): void {
    this.stp[dir].value = v
    this.dCfg[dir].step = v
    if (!this.autoAdapt.value) {
      this.rebuildGrid(dir)
      this.ctx.render.render()
    }
  }
  private setOpa(dir: GridDirection, v: number): void {
    const c = Math.max(0, Math.min(1, v))
    this.opa[dir].value = c
    this.dCfg[dir].opacity = c
    this.actors[dir]?.getProperty().setOpacity(c)
    this.ctx.render.render()
  }
  private toggleExpand(dir: GridDirection): void {
    this.expand[dir].value = !this.expand[dir].value
    this.dCfg[dir].expandToSpace = this.expand[dir].value
    this.rebuildGrid(dir)
    this.ctx.render.render()
  }
  private toggleAuto(): void {
    this.autoAdapt.value = !this.autoAdapt.value
    if (this.autoAdapt.value) {
      this.syncBoundsAndRebuild()
      this.recalcAuto()
    } else {
      // 切换到手动：将自动计算值同步到手动设置，避免网格突变
      for (const dir of DIRS) {
        this.stp[dir]!.value = this.autoStp[dir]!.value!
        this.dCfg[dir]!.step = this.autoStp[dir]!.value!
      }
    }
    this.rebuildAll()
    this.ctx.render.render()
  }

  private resetToDefaults(): void {
    this.autoAdapt.value = this.config.autoAdapt?.enabled ?? true
    this.panelOpen.value = false
    this.expanded.value = new Set()
    // 不置空模型边界，保持当前模型的范围用于后续网格重建
    this.syncBoundsAndRebuild()
    if (this.autoAdapt.value) this.recalcAuto()
    for (const dir of DIRS) {
      const c = this.config[dir] ?? {}
      this.vis[dir].value = c.visible ?? false
      this.clr[dir].value = c.color ?? DIR_META[dir].color
      this.stp[dir].value = c.step ?? DEF_STEP
      this.opa[dir].value = c.opacity ?? 1
      this.expand[dir].value = c.expandToSpace ?? false
    }
    this.clearAll()
    this.ctx.render.render()
  }

  private getActiveState(): string | undefined {
    for (const dir of DIRS) if (this.vis[dir].value) return dir
    return undefined
  }
  private get hasVisiblePlane(): boolean {
    for (const dir of DIRS) if (this.vis[dir].value) return true
    return false
  }
  private getIconCfg(): ToolbarIconConfig {
    return this.config.icon as ToolbarIconConfig
  }

  protected onDispose(): void {
    this.clearAll()
  }

  // --- IResettableActions ---
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetRenderGrid',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.renderGrid.resetDesc'),
        execute: () => {
          this.resetToDefaults()
        }
      }
    ]
  }

  // getStepMax: 根据当前模型范围返回该平面的间距滑块最大值
  private getStepMax(dir: GridDirection): number {
    const b = this.currentModelBounds.value
    if (!b) return 100
    return Math.max(dirMaxExtent(b, dir), 10)
  }

  // --- Vue render ---
  render() {
    const self = this
    return defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)

        const onDocClick = (e: MouseEvent) => {
          if (!self.panelOpen.value) return
          if (el.value && !el.value.contains(e.target as Node)) self.panelOpen.value = false
        }
        onMounted(() => document.addEventListener('click', onDocClick, true))
        onUnmounted(() => document.removeEventListener('click', onDocClick, true))

        const dirSection = (dir: GridDirection) => {
          const meta = DIR_META[dir]
          const open = self.expanded.value.has(dir)
          const isVisible = self.vis[dir]!.value
          const toggle = () => {
            const s = new Set(self.expanded.value)
            s.has(dir) ? s.delete(dir) : s.add(dir)
            self.expanded.value = s
          }

          const hdr = h(
            'div',
            {
              class: 'iimm-vtk-popup-row',
              style: {
                cursor: isVisible ? 'pointer' : 'default',
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              },
              onClick: isVisible ? toggle : undefined
            },
            [
              isVisible
                ? h('span', { style: { fontSize: '10px', width: '12px' } }, open ? '▼' : '▶')
                : h('span', { style: { width: '12px' } }),
              h(
                'span',
                { class: 'iimm-vtk-popup-label', style: { flex: '1', fontWeight: '600' } },
                i18n.translate(meta.labelKey)
              ),
              h('span', {
                class: 'iimm-vtk-color-indicator',
                style: { backgroundColor: colorHex(self.clr[dir]!.value!) }
              }),
              h(
                'button',
                {
                  class: ['iimm-vtk-popup-btn', { 'is-primary': isVisible }],
                  onClick: (e: Event) => {
                    e.stopPropagation()
                    self.toggleDir(dir)
                  }
                },
                isVisible
                  ? i18n.translate('vtkviewer.plugin.renderGrid.on')
                  : i18n.translate('vtkviewer.plugin.renderGrid.off')
              )
            ]
          )

          if (!open || !isVisible) return hdr

          const stepVal = self.getStep(dir)
          const isAuto = self.autoAdapt.value
          const stepMax = self.getStepMax(dir)
          const body = h(
            'div',
            { class: 'iimm-vtk-popup-section', style: { paddingLeft: '12px' } },
            [
              // color
              h('div', { class: 'iimm-vtk-popup-row' }, [
                h(
                  'label',
                  { class: 'iimm-vtk-popup-label' },
                  i18n.translate('vtkviewer.plugin.renderGrid.color')
                ),
                h('input', {
                  type: 'color',
                  value: colorHex(self.clr[dir]!.value!),
                  style: {
                    width: '28px',
                    height: '22px',
                    padding: '0',
                    border: 'none',
                    borderRadius: '2px',
                    cursor: 'pointer'
                  },
                  onInput: (e: Event) => {
                    self.setColor(dir, hexColor((e.target as HTMLInputElement).value))
                  }
                })
              ]),
              // step
              h('div', { class: 'iimm-vtk-popup-row' }, [
                h(
                  'label',
                  { class: 'iimm-vtk-popup-label' },
                  i18n.translate('vtkviewer.plugin.renderGrid.spacing')
                ),
                h('input', {
                  class: 'iimm-vtk-popup-slider',
                  type: 'range',
                  min: '0.1',
                  max: String(stepMax),
                  step: '0.1',
                  value: String(isAuto ? stepVal : self.stp[dir].value),
                  disabled: isAuto,
                  onInput: (e: Event) => {
                    self.setStep(dir, Number((e.target as HTMLInputElement).value))
                  }
                }),
                h(
                  'span',
                  {
                    style: {
                      color: isAuto
                        ? 'var(--iimm-vtk-btn-color-active)'
                        : 'var(--iimm-vtk-popup-label-color)',
                      fontSize: '10px',
                      minWidth: '48px',
                      textAlign: 'right'
                    }
                  },
                  `${stepVal.toFixed(1)}${isAuto ? ` (${i18n.translate('vtkviewer.plugin.renderGrid.autoHint')})` : ''}`
                )
              ]),
              // opacity
              h('div', { class: 'iimm-vtk-popup-row' }, [
                h(
                  'label',
                  { class: 'iimm-vtk-popup-label' },
                  i18n.translate('vtkviewer.plugin.renderGrid.opacity')
                ),
                h('input', {
                  class: 'iimm-vtk-popup-slider',
                  type: 'range',
                  min: '0',
                  max: '100',
                  value: String(Math.round(self.opa[dir]!.value! * 100)),
                  onInput: (e: Event) => {
                    self.setOpa(dir, Number((e.target as HTMLInputElement).value) / 100)
                  }
                }),
                h(
                  'span',
                  { style: { fontSize: '10px', minWidth: '32px', textAlign: 'right' } },
                  `${Math.round(self.opa[dir]!.value! * 100)}%`
                )
              ]),
              // expand to space
              h('div', { class: 'iimm-vtk-popup-row' }, [
                h(
                  'label',
                  { class: 'iimm-vtk-popup-label' },
                  i18n.translate('vtkviewer.plugin.renderGrid.extension')
                ),
                h(
                  'button',
                  {
                    class: ['iimm-vtk-popup-btn', { 'is-primary': self.expand[dir].value }],
                    onClick: () => self.toggleExpand(dir)
                  },
                  self.expand[dir].value
                    ? i18n.translate('vtkviewer.plugin.renderGrid.on')
                    : i18n.translate('vtkviewer.plugin.renderGrid.off')
                )
              ])
            ]
          )
          return h('div', {}, [hdr, body])
        }

        return () => {
          return h(
            'div',
            {
              ref: el,
              class: 'iimm-vtk-toolbar-item'
            },
            [
              // 主按钮
              h(
                'button',
                {
                  class: [
                    'iimm-vtk-toolbar-btn',
                    { 'is-active': self.panelOpen.value || self.hasVisiblePlane }
                  ],
                  title: i18n.translate('vtkviewer.plugin.renderGrid.tooltip'),
                  onClick: () => {
                    self.panelOpen.value = !self.panelOpen.value
                  }
                },
                renderToolbarIcon(self.getIconCfg(), self.getActiveState()) ?? ''
              ),
              // 展开面板
              self.panelOpen.value
                ? h(
                    'div',
                    {
                      class: 'iimm-vtk-settings-panel',
                      style: { minWidth: '240px', maxHeight: '420px', overflowY: 'auto' }
                    },
                    [
                      // title + expand all
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
                            i18n.translate('vtkviewer.plugin.renderGrid.title')
                          ),
                          h(
                            'button',
                            {
                              class: 'iimm-vtk-popup-btn',
                              onClick: () => {
                                self.expanded.value =
                                  self.expanded.value.size === DIRS.length
                                    ? new Set()
                                    : new Set(DIRS)
                              }
                            },
                            self.expanded.value.size === DIRS.length
                              ? i18n.translate('vtkviewer.plugin.renderGrid.collapse')
                              : i18n.translate('vtkviewer.plugin.renderGrid.expand')
                          )
                        ]
                      ),
                      // auto adapt toggle + re-adapt button
                      h(
                        'div',
                        {
                          class: 'iimm-vtk-popup-row',
                          style: {
                            borderBottom: '1px solid var(--iimm-vtk-popup-border-color)',
                            paddingBottom: '8px'
                          }
                        },
                        [
                          h(
                            'label',
                            { class: 'iimm-vtk-popup-label' },
                            i18n.translate('vtkviewer.plugin.renderGrid.autoSpacing')
                          ),
                          h('div', { style: { display: 'flex', gap: '4px' } }, [
                            h(
                              'button',
                              {
                                class: [
                                  'iimm-vtk-popup-btn',
                                  { 'is-primary': self.autoAdapt.value }
                                ],
                                onClick: () => self.toggleAuto()
                              },
                              self.autoAdapt.value
                                ? i18n.translate('vtkviewer.plugin.renderGrid.on')
                                : i18n.translate('vtkviewer.plugin.renderGrid.off')
                            ),
                            self.autoAdapt.value
                              ? h(
                                  'button',
                                  {
                                    class: 'iimm-vtk-popup-btn',
                                    onClick: () => {
                                      self.syncBoundsAndRebuild()
                                      self.recalcAuto()
                                      self.rebuildAll()
                                      self.ctx.render.render()
                                    },
                                    title: i18n.translate(
                                      'vtkviewer.plugin.renderGrid.refreshTitle'
                                    )
                                  },
                                  i18n.translate('vtkviewer.plugin.renderGrid.refresh')
                                )
                              : null
                          ])
                        ]
                      ),
                      // direction sections
                      ...DIRS.map(dirSection)
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
      'renderGrid',
      i18n.translate('vtkviewer.plugin.renderGrid.getShortcutConfig')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => {
        this.panelOpen.value = !this.panelOpen.value
      },
      description: s.description
    }))
  }
}
