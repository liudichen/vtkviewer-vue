/**
 * createViewerContext — 各子上下文工厂函数
 *
 * 从 useViewer.ts 拆分而来，集中管理渲染/场景/交互/UI 四个子上下文的创建。
 *
 * @module core/createViewerContext
 */

import { ref, type Ref } from 'vue'

// VTK.js 渲染管线
import vtkGenericRenderWindow from '@kitware/vtk.js/Rendering/Misc/GenericRenderWindow'
// VTK.js 交互管线
import vtkInteractorStyleManipulator from '@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator'
import vtkMouseCameraTrackballRotateManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballRotateManipulator'
import vtkMouseCameraTrackballZoomManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballZoomManipulator'
import vtkMouseCameraTrackballPanManipulator from '@kitware/vtk.js/Interaction/Manipulators/MouseCameraTrackballPanManipulator'
import vtkGestureCameraManipulator from '@kitware/vtk.js/Interaction/Manipulators/GestureCameraManipulator'
import vtkKeyboardCameraManipulator from '@kitware/vtk.js/Interaction/Manipulators/KeyboardCameraManipulator'

// VTK.js 类型
import type { vtkRenderWindow } from '@kitware/vtk.js/Rendering/Core/RenderWindow'
import type { vtkRenderer } from '@kitware/vtk.js/Rendering/Core/Renderer'
import type { vtkOpenGLRenderWindow } from '@kitware/vtk.js/Rendering/OpenGL/RenderWindow'
import type { vtkCamera } from '@kitware/vtk.js/Rendering/Core/Camera'
import type { vtkActor } from '@kitware/vtk.js/Rendering/Core/Actor'
import type { vtkVolume } from '@kitware/vtk.js/Rendering/Core/Volume'

// 内部类型
import {
  type RenderSubContext,
  type CameraPreset,
  type CameraState,
  type ScreenshotOptions,
  type InteractionSubContext,
  type InteractionConfig,
  type ManipulatorType,
  type ManipulatorConfig,
  type SceneSubContext,
  type UISubContext,
  type ConfigAccessor,
  type EventBus,
  i18n
} from '@/core'
import { BuiltinEvents } from '@/configs'

// 工具函数
import { hexToRgbNormalized } from '@/utils'

/** 相机预设视角映射 */
const CAMERA_PRESETS: Record<
  CameraPreset,
  { position: [number, number, number]; viewUp: [number, number, number] }
> = {
  front: { position: [0, 0, 1], viewUp: [0, 1, 0] },
  back: { position: [0, 0, -1], viewUp: [0, 1, 0] },
  left: { position: [-1, 0, 0], viewUp: [0, 1, 0] },
  right: { position: [1, 0, 0], viewUp: [0, 1, 0] },
  top: { position: [0, 1, 0], viewUp: [0, 0, -1] },
  bottom: { position: [0, -1, 0], viewUp: [0, 0, 1] },
  iso: { position: [1, 1, 1], viewUp: [0, 1, 0] }
}

/** 高分辨率截图选项（内部使用） */
interface HiResCaptureOptions {
  width: number
  height: number
  format: 'png' | 'jpeg' | 'webp'
  quality: number
  transparentBg: boolean
}

/**
 * 高分辨率截图实现
 * 临时调整渲染窗口尺寸至目标分辨率，渲染后读取像素，再恢复原始尺寸
 * 透明背景使用原始背景色做色度键替换（保留原渲染器背景，无需切换到品红色）
 */
async function captureHiResScreenshot(
  renderWindow: any,
  openGLView: any,
  opts: HiResCaptureOptions
): Promise<Blob> {
  const canvas: HTMLCanvasElement | null = openGLView.getCanvas?.() ?? null
  if (!canvas) {
    throw new Error(i18n.translate('vtkviewer.context.canvasNotFound'))
  }

  const originalWidth = canvas.width
  const originalHeight = canvas.height

  // 获取渲染器（用于透明背景检测）
  const renderers = renderWindow.getRenderers()
  const renderer = renderers && renderers.length > 0 ? renderers[0] : null

  // 透明背景：读取渲染器的原始背景色用于后续像素替换
  let originalBgR = -1
  let originalBgG = -1
  let originalBgB = -1
  if (opts.transparentBg && renderer) {
    const bg = renderer.getBackground()
    originalBgR = Math.round(bg[0] * 255)
    originalBgG = Math.round(bg[1] * 255)
    originalBgB = Math.round(bg[2] * 255)
  }

  try {
    // 调整视口尺寸到目标分辨率
    canvas.width = opts.width
    canvas.height = opts.height
    openGLView.setSize(opts.width, opts.height)

    // 重新渲染（保持原始背景色不变）
    renderWindow.render()

    const mimeType =
      opts.format === 'jpeg' ? 'image/jpeg' : opts.format === 'webp' ? 'image/webp' : 'image/png'

    if (opts.transparentBg) {
      // 透明背景：先通过 canvas.toBlob() 可靠获取 WebGL 渲染帧，
      // 再用 createImageBitmap 绘制到离屏 2D canvas 进行像素处理
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          b => {
            if (b) resolve(b)
            else reject(new Error(i18n.translate('vtkviewer.context.failedReadWebGLCanvas')))
          },
          'image/png',
          1.0
        )
      })
      const bitmap = await createImageBitmap(blob)
      const offscreen = document.createElement('canvas')
      offscreen.width = opts.width
      offscreen.height = opts.height
      const ctx = offscreen.getContext('2d')
      if (!ctx) throw new Error(i18n.translate('vtkviewer.context.2dContextFailed'))
      ctx.drawImage(bitmap, 0, 0, opts.width, opts.height)
      bitmap.close()

      // 扫描像素，将匹配原始背景色的像素设为透明
      const imageData = ctx.getImageData(0, 0, opts.width, opts.height)
      const pixels = imageData.data
      // 颜色容差：考虑抗锯齿混合。15 约等于 6% 偏差
      const tolerance = 15
      for (let i = 0; i < pixels.length; i += 4) {
        const pr = pixels[i]
        const pg = pixels[i + 1]
        const pb = pixels[i + 2]
        const dr = Math.abs(pr - originalBgR)
        const dg = Math.abs(pg - originalBgG)
        const db = Math.abs(pb - originalBgB)
        const dist = Math.max(dr, dg, db)
        if (dist <= tolerance) {
          // 距离越近越透明（线性衰减）：tolerance=15 时，
          // dist=0 → alpha=0, dist=15 → alpha=128
          pixels[i + 3] = Math.round((dist / tolerance) * 128)
        }
      }

      ctx.putImageData(imageData, 0, 0)

      return new Promise<Blob>((resolve, reject) => {
        offscreen.toBlob(
          b => {
            if (b) resolve(b)
            else reject(new Error(i18n.translate('vtkviewer.context.transparentExportFailed')))
          },
          mimeType,
          opts.quality
        )
      })
    }

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error(i18n.translate('vtkviewer.context.hiResCaptureFailed')))
          }
        },
        mimeType,
        opts.quality
      )
    })
  } finally {
    // 恢复原始视口尺寸
    canvas.width = originalWidth
    canvas.height = originalHeight
    openGLView.setSize(originalWidth, originalHeight)
    renderWindow.render()
  }
}

/**
 * 创建渲染子上下文（真实 VTK.js 渲染管线）
 */
export function createRenderSubContext(): RenderSubContext {
  let genericRenderWindow: vtkGenericRenderWindow | null = null
  let _renderWindow: vtkRenderWindow | null = null
  let _renderer: vtkRenderer | null = null
  let _openGLRenderWindow: vtkOpenGLRenderWindow | null = null
  let _camera: vtkCamera | null = null
  let _container: HTMLElement | null = null
  let _ready = false
  let _contextLost = false
  let _interactor: any = null
  /** 模型加载后的初始相机状态，用于 resetToDefaultView 恢复 */
  let _initialCameraState: CameraState | null = null

  const ctx: RenderSubContext & {
    _onContextLost?: () => void
    _onContextRestored?: () => void
  } = {
    getRenderWindow: () => _renderWindow,
    getRenderer: () => _renderer,
    getCamera: () => _camera,
    getInteractor: () => _interactor,
    getContainer: () => _container,
    isReady: () => _ready,
    isContextLost: () => _contextLost,

    render: () => {
      if (_renderWindow) {
        _renderWindow.render()
      }
    },

    resetCamera: () => {
      if (_renderer) {
        _renderer.resetCamera()
        ctx.render()
      }
    },

    resetToDefaultView: () => {
      if (!_camera || !_renderer) return

      // 优先恢复保存的初始相机状态
      if (_initialCameraState) {
        _camera.setPosition(..._initialCameraState.position)
        _camera.setFocalPoint(..._initialCameraState.focalPoint)
        _camera.setViewUp(..._initialCameraState.viewUp)
        _renderer.resetCameraClippingRange()
      } else {
        // 没有保存的状态时，先重置相机参数再自动计算
        _camera.setPosition(0, 0, 1)
        _camera.setFocalPoint(0, 0, 0)
        _camera.setViewUp(0, 1, 0)
        _renderer.resetCamera()
        _renderer.resetCameraClippingRange()
      }

      ctx.render()
    },

    /** 保存当前相机状态作为初始状态（模型加载后调用） */
    saveInitialCameraState: () => {
      if (_camera) {
        _initialCameraState = {
          position: _camera.getPosition() as [number, number, number],
          focalPoint: _camera.getFocalPoint() as [number, number, number],
          viewUp: _camera.getViewUp() as [number, number, number]
        }
      }
    },

    /** 清除保存的初始相机状态（场景清除时调用） */
    clearInitialCameraState: () => {
      _initialCameraState = null
    },

    setCameraView: (preset: CameraPreset) => {
      if (!_camera || !_renderer) return
      const camConfig = CAMERA_PRESETS[preset]
      if (!camConfig) return

      // 计算到焦点的距离（使用当前距离或默认值）
      const fp = _camera.getFocalPoint()
      const pos = _camera.getPosition()
      const dx = pos[0] - fp[0],
        dy = pos[1] - fp[1],
        dz = pos[2] - fp[2]
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz) || 5

      _camera.setPosition(
        fp[0] + camConfig.position[0] * distance,
        fp[1] + camConfig.position[1] * distance,
        fp[2] + camConfig.position[2] * distance
      )
      _camera.setViewUp(...camConfig.viewUp)
      _camera.setFocalPoint(...fp)
      _renderer.resetCameraClippingRange()
      ctx.render()
    },

    saveCameraState: (): CameraState => {
      if (!_camera) {
        return { position: [0, 0, 1], focalPoint: [0, 0, 0], viewUp: [0, 1, 0] }
      }
      return {
        position: _camera.getPosition() as [number, number, number],
        focalPoint: _camera.getFocalPoint() as [number, number, number],
        viewUp: _camera.getViewUp() as [number, number, number],
        parallelProjection: _camera.getParallelProjection() ?? false,
        parallelScale: _camera.getParallelScale() ?? 1.0,
        viewAngle: _camera.getViewAngle() ?? 30.0
      }
    },

    restoreCameraState: (state: CameraState) => {
      if (!_camera) return
      _camera.setPosition(...state.position)
      _camera.setFocalPoint(...state.focalPoint)
      _camera.setViewUp(...state.viewUp)
      if (state.parallelProjection !== undefined)
        _camera.setParallelProjection(state.parallelProjection)
      if (state.parallelScale !== undefined) _camera.setParallelScale(state.parallelScale)
      if (state.viewAngle !== undefined) _camera.setViewAngle(state.viewAngle)
      if (_renderer) _renderer.resetCameraClippingRange()
      ctx.render()
    },

    attachToContainer: (container: HTMLElement) => {
      // 如果已经初始化过，先清理
      if (genericRenderWindow) {
        ;(genericRenderWindow as any).setContainer(null)
        genericRenderWindow.delete()
        genericRenderWindow = null
      }

      // 创建 GenericRenderWindow
      genericRenderWindow = vtkGenericRenderWindow.newInstance()

      // 设置容器（会自动创建 Canvas）
      genericRenderWindow.setContainer(container)
      _container = container

      // 获取各组件引用
      _renderWindow = genericRenderWindow.getRenderWindow()
      _renderer = genericRenderWindow.getRenderer()
      _interactor = genericRenderWindow.getInteractor()
      const views = _renderWindow.getViews()
      _openGLRenderWindow = views.length > 0 ? views[0] : null
      _camera = _renderer.getActiveCamera()

      // 注册 WebGL 上下文丢失/恢复事件
      const canvas = container.querySelector('canvas')
      if (canvas) {
        canvas.addEventListener('webglcontextlost', (event: Event) => {
          event.preventDefault()
          _contextLost = true
          ctx._onContextLost?.()
          console.warn(`[useViewer] ${i18n.translate('vtkviewer.context.webglContextLost')}`)
        })
        canvas.addEventListener('webglcontextrestored', () => {
          _contextLost = false
          ctx._onContextRestored?.()
          console.debug(`[useViewer] ${i18n.translate('vtkviewer.context.webglContextRestored')}`)
          _renderWindow?.render()
        })

        // 让 canvas 可聚焦，捕获方向键事件防止页面滚动
        canvas.tabIndex = 0
        canvas.style.outline = 'none'
        canvas.addEventListener('keydown', (e: KeyboardEvent) => {
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            e.preventDefault()
          }
        })
        // 点击 canvas 时自动聚焦
        canvas.addEventListener('click', () => canvas.focus())
      }

      // 触发 resize
      genericRenderWindow.resize()
      _ready = true
    },

    resize: () => {
      if (genericRenderWindow) {
        genericRenderWindow.resize()
        ctx.render()
      }
    },

    dispose: () => {
      if (genericRenderWindow) {
        ;(genericRenderWindow as any).setContainer(null)
        genericRenderWindow.delete()
        genericRenderWindow = null
      }
      _renderWindow = null
      _renderer = null
      _openGLRenderWindow = null
      _camera = null
      _interactor = null
      _container = null
      _ready = false
      _contextLost = false
    }
  }

  return ctx
}

/**
 * 创建场景子上下文（真实 Actor/Volume 管理）
 * @param getRenderer 动态获取渲染器的函数（延迟绑定，因为渲染器在 attachToContainer 后才可用）
 */
export function createSceneSubContext(getRenderer: () => vtkRenderer | null): SceneSubContext {
  const actors: vtkActor[] = []
  const volumes: vtkVolume[] = []
  const modelCount = ref(0)

  function updateModelCount() {
    modelCount.value = actors.length + volumes.length
  }

  return {
    getActors: () => [...actors],
    getVolumes: () => [...volumes],
    isVolumeRendering: () => volumes.length > 0,
    hasModels: () => actors.length > 0 || volumes.length > 0,
    modelCount,

    addActor: (actor: vtkActor) => {
      actors.push(actor)
      updateModelCount()
      const renderer = getRenderer()
      if (renderer) {
        renderer.addActor(actor)
      }
    },

    addVolume: (volume: vtkVolume) => {
      volumes.push(volume)
      updateModelCount()
      const renderer = getRenderer()
      if (renderer) {
        renderer.addVolume(volume)
      }
    },

    clearScene: () => {
      const renderer = getRenderer()

      /** 递归释放 VTK 对象及其子资源 */
      function deepDeleteVtk(obj: any): void {
        if (!obj || typeof obj.delete !== 'function') return
        try {
          obj.delete()
        } catch {
          /* 已释放 */
        }
      }

      // 移除并释放所有 Actor（连带 Mapper/InputData/Property/Texture）
      for (const actor of actors) {
        try {
          if (renderer) renderer.removeActor(actor)

          const mapper = actor.getMapper?.()
          if (mapper) {
            const inputData = mapper.getInputData?.()
            if (inputData) deepDeleteVtk(inputData)
            const lut = mapper.getLookupTable?.()
            if (lut) deepDeleteVtk(lut)
            deepDeleteVtk(mapper)
          }

          const prop = actor.getProperty?.()
          if (prop) deepDeleteVtk(prop)

          const textures = actor.getTextures?.()
          if (Array.isArray(textures)) textures.forEach(deepDeleteVtk)

          deepDeleteVtk(actor)
        } catch {
          // Actor 可能因管线断开处于不一致状态（如 PDB 的 setInputConnection 管线）
          // 静默跳过中间步骤，直接释放 actor 本身
          try {
            deepDeleteVtk(actor)
          } catch {
            /* 已释放 */
          }
        }
      }
      actors.length = 0

      // 移除并释放所有 Volume
      for (const volume of volumes) {
        try {
          if (renderer) renderer.removeVolume(volume)

          const mapper = volume.getMapper?.()
          if (mapper) {
            const inputData = mapper.getInputData?.()
            if (inputData) deepDeleteVtk(inputData)
            deepDeleteVtk(mapper)
          }

          const prop = volume.getProperty?.()
          if (prop) deepDeleteVtk(prop)

          deepDeleteVtk(volume)
        } catch {
          try {
            deepDeleteVtk(volume)
          } catch {
            /* 已释放 */
          }
        }
      }
      volumes.length = 0
      updateModelCount()

      // 刷新渲染以释放 OpenGL 侧的 GPU 资源
      if (renderer) {
        try {
          const rw = renderer.getRenderWindow?.()
          if (rw) rw.render()
        } catch {}
      }
    }
  }
}

/**
 * 创建交互子上下文（真实 VTK.js 交互管线）
 * @param getRenderWindow 动态获取渲染窗口的函数（延迟绑定）
 * @param getRenderer 动态获取渲染器的函数（延迟绑定）
 */
export function createInteractionSubContext(
  getRenderWindow: () => vtkRenderWindow | null,
  getRenderer: () => vtkRenderer | null,
  configAccessor?: ConfigAccessor,
  events?: EventBus,
  enableGesture?: Ref<boolean>,
  enableKeyboard?: Ref<boolean>
): InteractionSubContext {
  // VTK.js 实例
  let interactorStyle: vtkInteractorStyleManipulator | null = null
  const mouseManipulators = {
    rotate: vtkMouseCameraTrackballRotateManipulator.newInstance(),
    zoom: vtkMouseCameraTrackballZoomManipulator.newInstance(),
    pan: vtkMouseCameraTrackballPanManipulator.newInstance()
  }
  const gestureManipulator = vtkGestureCameraManipulator.newInstance()
  let keyboardManipulator: vtkKeyboardCameraManipulator | null = null

  // 状态
  const enabledTools = { rotate: true, zoom: true, pan: true }
  let keyboardControlEnabled = true
  let gestureEnabled = true
  let initialized = false

  // 从配置中读取初始值
  if (configAccessor) {
    const interactionConfig = configAccessor.get<InteractionConfig>('interaction', {})
    if (interactionConfig.rotate !== undefined) enabledTools.rotate = interactionConfig.rotate
    if (interactionConfig.zoom !== undefined) enabledTools.zoom = interactionConfig.zoom
    if (interactionConfig.pan !== undefined) enabledTools.pan = interactionConfig.pan
    if (interactionConfig.keyboardControl !== undefined)
      keyboardControlEnabled = interactionConfig.keyboardControl
    if (interactionConfig.gesture !== undefined) gestureEnabled = interactionConfig.gesture
  }

  // 操纵器默认配置
  const defaultManipulatorConfigs: Record<string, ManipulatorConfig> = {
    rotate: { button: 1, dragEnabled: true, scrollEnabled: false },
    zoom: { button: -1, dragEnabled: false, scrollEnabled: true },
    pan: { button: 2, dragEnabled: true, scrollEnabled: false },
    keyboard: {
      keys: [
        'w',
        'W',
        'ArrowUp',
        's',
        'S',
        'ArrowDown',
        'd',
        'D',
        'ArrowRight',
        'a',
        'A',
        'ArrowLeft'
      ]
    },
    gesture: { gestureType: 'pinch' }
  }

  // 当前操纵器配置（可动态修改）
  const manipulatorConfigs: Record<string, ManipulatorConfig> = { ...defaultManipulatorConfigs }

  /** 将当前配置应用到 VTK.js 操作器 */
  function applyConfiguration() {
    if (!interactorStyle) return

    // 清除所有操作器
    interactorStyle.removeAllMouseManipulators()
    interactorStyle.removeAllGestureManipulators()
    interactorStyle.removeAllKeyboardManipulators()

    // 鼠标操作器配置
    if (enabledTools.rotate) {
      const config = manipulatorConfigs.rotate
      mouseManipulators.rotate.setButton(config.button ?? 1)
      mouseManipulators.rotate.setDragEnabled(config.dragEnabled ?? true)
      mouseManipulators.rotate.setScrollEnabled(config.scrollEnabled ?? false)
      interactorStyle.addMouseManipulator(mouseManipulators.rotate)
    }
    if (enabledTools.zoom) {
      const config = manipulatorConfigs.zoom
      mouseManipulators.zoom.setButton(config.button ?? -1)
      mouseManipulators.zoom.setDragEnabled(config.dragEnabled ?? false)
      mouseManipulators.zoom.setScrollEnabled(config.scrollEnabled ?? true)
      interactorStyle.addMouseManipulator(mouseManipulators.zoom)
    }
    if (enabledTools.pan) {
      const config = manipulatorConfigs.pan
      mouseManipulators.pan.setButton(config.button ?? 2)
      mouseManipulators.pan.setDragEnabled(config.dragEnabled ?? true)
      mouseManipulators.pan.setScrollEnabled(config.scrollEnabled ?? false)
      interactorStyle.addMouseManipulator(mouseManipulators.pan)
    }

    // 触摸手势操作器（受 enableGesture 总开关控制）
    if (gestureEnabled && (!enableGesture || enableGesture.value)) {
      gestureManipulator.setRotateEnabled(enabledTools.rotate)
      gestureManipulator.setPinchEnabled(enabledTools.zoom)
      gestureManipulator.setPanEnabled(enabledTools.pan)
      interactorStyle.addGestureManipulator(gestureManipulator)
    }

    // 键盘操作器（受 enableKeyboard 总开关控制）
    if (keyboardControlEnabled && (!enableKeyboard || enableKeyboard.value)) {
      // 修复 VTK.js 左右方向计算反向的 bug
      keyboardManipulator = vtkKeyboardCameraManipulator.newInstance({
        moveLeftKeys: ['d', 'D', 'ArrowRight'],
        moveRightKeys: ['a', 'A', 'ArrowLeft']
      })

      // 绕过 VTK.js v36.0.0 的 bug：手动注入 _interactor 和 _renderer
      const manipulatorModel = keyboardManipulator.get() as Record<string, any>
      const rw = getRenderWindow()
      if (rw) {
        if (!manipulatorModel._interactor) {
          manipulatorModel._interactor = rw.getInteractor()
        }
      }
      const renderer = getRenderer()
      if (!manipulatorModel._renderer && renderer) {
        manipulatorModel._renderer = renderer
      }

      // 请求动画以避免 VTK.js 警告
      ;(keyboardManipulator as any).requestAnimation?.()

      interactorStyle.addKeyboardManipulator(keyboardManipulator)
    }
  }

  /** 初始化交互管线（在渲染窗口可用后调用） */
  function init() {
    if (initialized) return

    const renderWindow = getRenderWindow()
    if (!renderWindow) {
      console.warn(
        `[InteractionSubContext] ${i18n.translate('vtkviewer.interaction.renderWindowNotAvailable')}`
      )
      return
    }

    // 创建交互器样式
    interactorStyle = vtkInteractorStyleManipulator.newInstance()

    // 设置到渲染窗口的交互器
    const interactor = renderWindow.getInteractor()
    interactor.setInteractorStyle(interactorStyle)

    // 应用当前配置
    applyConfiguration()

    initialized = true
  }

  return {
    init,

    getEnabledTools: () => ({ ...enabledTools }),

    isEnabled: (tool: string) => {
      const key = tool as keyof typeof enabledTools
      return enabledTools[key] ?? false
    },

    toggleTool: (tool: string) => {
      const key = tool as keyof typeof enabledTools
      if (key in enabledTools) {
        enabledTools[key] = !enabledTools[key]
        if (initialized) applyConfiguration()
        events?.emit(BuiltinEvents.TOOL_CHANGED, { tool, enabled: enabledTools[key] })
      }
    },

    setToolEnabled: (tool: string, enabled: boolean) => {
      const key = tool as keyof typeof enabledTools
      if (key in enabledTools) {
        enabledTools[key] = enabled
        if (initialized) applyConfiguration()
        events?.emit(BuiltinEvents.TOOL_CHANGED, { tool, enabled })
      }
    },

    updateInteraction: (config: InteractionConfig) => {
      if (config.rotate !== undefined) enabledTools.rotate = config.rotate
      if (config.zoom !== undefined) enabledTools.zoom = config.zoom
      if (config.pan !== undefined) enabledTools.pan = config.pan
      if (config.keyboardControl !== undefined) keyboardControlEnabled = config.keyboardControl
      if (config.gesture !== undefined) gestureEnabled = config.gesture

      // 保存到配置访问器
      if (configAccessor) {
        const currentConfig = configAccessor.get<InteractionConfig>('interaction', {})
        configAccessor.set('interaction', { ...currentConfig, ...config })
      }

      if (initialized) applyConfiguration()
    },

    isKeyboardControlEnabled: () => keyboardControlEnabled,

    toggleKeyboardControl: () => {
      keyboardControlEnabled = !keyboardControlEnabled
      if (initialized) applyConfiguration()
    },

    isGestureEnabled: () => gestureEnabled,

    isTouchDevice: () => 'ontouchstart' in window || navigator.maxTouchPoints > 0,

    // === 增强功能：操纵器访问和配置 ===

    getManipulator: (type: ManipulatorType) => {
      switch (type) {
        case 'rotate':
          return mouseManipulators.rotate
        case 'zoom':
          return mouseManipulators.zoom
        case 'pan':
          return mouseManipulators.pan
        case 'gesture':
          return gestureManipulator
        case 'keyboard':
          return keyboardManipulator
        default:
          return null
      }
    },

    configureManipulator: (type: ManipulatorType, config: ManipulatorConfig) => {
      // 更新配置
      manipulatorConfigs[type] = { ...manipulatorConfigs[type], ...config }

      // 应用配置到对应的操纵器
      switch (type) {
        case 'rotate':
          if (config.button !== undefined) mouseManipulators.rotate.setButton(config.button)
          if (config.dragEnabled !== undefined)
            mouseManipulators.rotate.setDragEnabled(config.dragEnabled)
          if (config.scrollEnabled !== undefined)
            mouseManipulators.rotate.setScrollEnabled(config.scrollEnabled)
          break
        case 'zoom':
          if (config.button !== undefined) mouseManipulators.zoom.setButton(config.button)
          if (config.dragEnabled !== undefined)
            mouseManipulators.zoom.setDragEnabled(config.dragEnabled)
          if (config.scrollEnabled !== undefined)
            mouseManipulators.zoom.setScrollEnabled(config.scrollEnabled)
          break
        case 'pan':
          if (config.button !== undefined) mouseManipulators.pan.setButton(config.button)
          if (config.dragEnabled !== undefined)
            mouseManipulators.pan.setDragEnabled(config.dragEnabled)
          if (config.scrollEnabled !== undefined)
            mouseManipulators.pan.setScrollEnabled(config.scrollEnabled)
          break
        case 'gesture':
          // 手势操纵器配置较为复杂，需要重新创建
          break
        case 'keyboard':
          // 键盘操纵器配置较为复杂，需要重新创建
          break
      }

      // 保存到配置访问器
      if (configAccessor) {
        const currentManipulatorConfigs = configAccessor.get<Record<string, ManipulatorConfig>>(
          'manipulators',
          {}
        )
        configAccessor.set('manipulators', {
          ...currentManipulatorConfigs,
          [type]: manipulatorConfigs[type]
        })
      }

      // 重新应用配置
      if (initialized) applyConfiguration()
    },

    resetManipulator: (type: ManipulatorType) => {
      // 重置到默认配置
      manipulatorConfigs[type] = { ...defaultManipulatorConfigs[type] }

      // 保存到配置访问器
      if (configAccessor) {
        const currentManipulatorConfigs = configAccessor.get<Record<string, ManipulatorConfig>>(
          'manipulators',
          {}
        )
        configAccessor.set('manipulators', {
          ...currentManipulatorConfigs,
          [type]: manipulatorConfigs[type]
        })
      }

      // 重新应用配置
      if (initialized) applyConfiguration()
    },

    resetAllManipulators: () => {
      // 重置所有操纵器配置
      Object.keys(defaultManipulatorConfigs).forEach(key => {
        manipulatorConfigs[key] = { ...defaultManipulatorConfigs[key] }
      })

      // 保存到配置访问器
      if (configAccessor) {
        configAccessor.set('manipulators', { ...manipulatorConfigs })
      }

      // 重新应用配置
      if (initialized) applyConfiguration()
    },

    getInteractionSnapshot: () => {
      return {
        rotate: enabledTools.rotate,
        zoom: enabledTools.zoom,
        pan: enabledTools.pan,
        keyboardControl: keyboardControlEnabled,
        gesture: gestureEnabled,
        manipulators: {
          rotate: { ...manipulatorConfigs.rotate },
          zoom: { ...manipulatorConfigs.zoom },
          pan: { ...manipulatorConfigs.pan },
          gesture: { ...manipulatorConfigs.gesture },
          keyboard: { ...manipulatorConfigs.keyboard }
        }
      }
    },

    dispose: () => {
      if (interactorStyle) {
        interactorStyle.delete()
        interactorStyle = null
      }
      if (keyboardManipulator) {
        keyboardManipulator.delete()
        keyboardManipulator = null
      }
      mouseManipulators.rotate?.delete()
      mouseManipulators.zoom?.delete()
      mouseManipulators.pan?.delete()
      gestureManipulator?.delete()
      initialized = false
    }
  }
}

/**
 * 创建UI子上下文
 * @param getRenderWindow 延迟获取渲染窗口的函数
 * @param getContainer 延迟获取内容区域容器的函数
 * @param getFullscreenContainer 延迟获取全屏容器的函数（默认使用内容区域）
 */
export function createUISubContext(
  getRenderWindow: () => vtkRenderWindow | null,
  getContainer: () => HTMLElement | null,
  getFullscreenContainer?: () => HTMLElement | null
): UISubContext {
  // 当前背景色
  let _backgroundColor = '#1e1e2e'
  // 响应式默认背景色（由 props.background 驱动）
  const defaultBackground = ref('#1e1e2e')

  return {
    isFullscreen: () => !!document.fullscreenElement,
    showAxes: () => true,
    getBackgroundColor: () => _backgroundColor,
    defaultBackground,
    setDefaultBackground: (color: string) => {
      defaultBackground.value = color
    },

    captureScreenshot: async (options?: ScreenshotOptions): Promise<Blob> => {
      const renderWindow = getRenderWindow()
      if (!renderWindow) {
        throw new Error(i18n.translate('vtkviewer.context.renderWindowNotAvailableError'))
      }

      const views = renderWindow.getViews()
      if (!views || views.length === 0) {
        throw new Error(i18n.translate('vtkviewer.context.noRenderViewsAvailableError'))
      }

      const openGLView = views[0] as any
      const canvas: HTMLCanvasElement | null = openGLView.getCanvas?.() ?? null
      if (!canvas) {
        throw new Error(i18n.translate('vtkviewer.context.canvasNotAvailable'))
      }

      // 计算目标尺寸：优先使用自定义宽高，其次使用 multiplier 基于视口放大
      const multiplier = options?.multiplier ?? 1
      const width = options?.width ?? canvas.width * multiplier
      const height = options?.height ?? canvas.height * multiplier

      const format = options?.format ?? 'png'
      const quality = options?.quality ?? 1.0
      const transparentBg = options?.transparentBackground ?? false

      // --- 高分辨率或特殊选项走离线渲染 ---
      if (multiplier > 1 || transparentBg || format === 'webp') {
        return await captureHiResScreenshot(renderWindow, openGLView, {
          width,
          height,
          format,
          quality,
          transparentBg
        })
      }

      // --- 常规截图：先渲染一帧确保画面是最新的 ---
      renderWindow.render()

      // 尝试使用 VTK.js 的 captureImages 方法
      if (!transparentBg && typeof openGLView.captureImages === 'function') {
        try {
          const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png'
          const images = openGLView.captureImages(mime)
          if (images && images.length > 0) {
            const base64Data = images[0]
            const byteString = atob(base64Data.split(',')[1] ?? base64Data)
            const ab = new ArrayBuffer(byteString.length)
            const ia = new Uint8Array(ab)
            for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i)
            }
            return new Blob([ab], { type: mime })
          }
        } catch (e) {
          console.warn(
            `[UISubContext] ${i18n.translate('vtkviewer.context.captureImagesFailed')}:`,
            e
          )
        }
      }

      // 回退方案：使用 canvas.toBlob
      const mimeType = (
        { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' } as Record<string, string>
      )[format]

      return new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          blob => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error(i18n.translate('vtkviewer.context.captureFailed')))
            }
          },
          mimeType,
          quality
        )
      })
    },

    toggleFullscreen: () => {
      let container = getFullscreenContainer?.() ?? null
      if (!container) {
        const contentContainer = getContainer()
        if (contentContainer) {
          container =
            (contentContainer.closest('.iimm-vtk-container') as HTMLElement) ?? contentContainer
        }
      }
      if (!container) {
        console.warn(`[UISubContext] ${i18n.translate('vtkviewer.context.containerNotAvailable')}`)
        return
      }

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => {
          console.error(
            `[UISubContext] ${i18n.translate('vtkviewer.context.failedExitFullscreen')}:`,
            err
          )
        })
      } else {
        container.requestFullscreen().catch(err => {
          console.error(
            `[UISubContext] ${i18n.translate('vtkviewer.context.failedEnterFullscreen')}:`,
            err
          )
        })
      }
    },
    toggleAxes: () => {},
    setBackgroundColor: (color: string) => {
      _backgroundColor = color
      const rw = getRenderWindow()
      if (rw) {
        const renderers = rw.getRenderers?.() ?? []
        for (const r of renderers) {
          r.setBackground(...hexToRgbNormalized(color))
        }
        rw.render()
      }
    },
    applyViewPreset: () => {},
    isCompactMode: () => false,
    toggleCompactMode: () => {}
  }
}
