/**
 * 渲染子上下文
 * 封装 VTK.js 核心渲染能力
 */

import type { vtkRenderWindow } from '@kitware/vtk.js/Rendering/Core/RenderWindow'
import type { vtkRenderer } from '@kitware/vtk.js/Rendering/Core/Renderer'
import type { vtkCamera } from '@kitware/vtk.js/Rendering/Core/Camera'

/** 相机预设 */
export type CameraPreset = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso'

/** 相机状态（含投影模式、视场角、平行缩放） */
export interface CameraState {
  position: [number, number, number]
  focalPoint: [number, number, number]
  viewUp: [number, number, number]
  /** 是否为平行投影（正交投影） */
  parallelProjection?: boolean
  /** 平行投影缩放比例 */
  parallelScale?: number
  /** 透视投影视场角（度） */
  viewAngle?: number
}

/** 截图选项 */
export interface ScreenshotOptions {
  /** 截图格式 */
  format?: 'png' | 'jpeg' | 'webp'
  /** 图片质量 (0-1) */
  quality?: number
  /** 自定义宽度（像素），优先级高于 multiplier */
  width?: number
  /** 自定义高度（像素），优先级高于 multiplier */
  height?: number
  /** 倍率（1x/2x/4x），基于当前视口尺寸计算 */
  multiplier?: 1 | 2 | 4
  /** 是否透明背景 */
  transparentBackground?: boolean
}

/**
 * 渲染子上下文接口
 * 提供 VTK.js 渲染管线的访问能力
 */
export interface RenderSubContext {
  /** 获取渲染窗口 */
  getRenderWindow(): vtkRenderWindow | null
  /** 获取渲染器 */
  getRenderer(): vtkRenderer | null
  /** 获取相机 */
  getCamera(): vtkCamera | null
  /** 获取交互器（来自 GenericRenderWindow，用于 OrientationMarkerWidget 等需要交互器的组件） */
  getInteractor(): any | null
  /** 获取容器元素 */
  getContainer(): HTMLElement | null
  /** 渲染器是否就绪 */
  isReady(): boolean
  /** WebGL上下文是否丢失 */
  isContextLost(): boolean
  /** 触发渲染 */
  render(): void
  /** 重置相机（仅适配场景范围，不改变视角方向） */
  resetCamera(): void
  /** 重置到默认视图（重置相机位置+视角+裁剪范围，用于加载新模型或重置所有） */
  resetToDefaultView(): void
  /** 保存当前相机状态作为初始状态（模型加载后调用） */
  saveInitialCameraState(): void
  /** 清除保存的初始相机状态（场景清除时调用） */
  clearInitialCameraState(): void
  /** 设置相机预设视角 */
  setCameraView(preset: CameraPreset): void
  /** 保存相机状态 */
  saveCameraState(): CameraState
  /** 恢复相机状态 */
  restoreCameraState(state: CameraState): void
  /** 将渲染管线附加到DOM容器（创建Canvas并初始化WebGL） */
  attachToContainer(container: HTMLElement): void
  /** 通知 VTK.js 容器尺寸已变化，触发 Canvas 重新测量并渲染 */
  resize(): void
  /** 释放所有VTK.js资源（销毁渲染窗口、渲染器等） */
  dispose(): void
}
