/**
 * 场景子上下文
 * 管理场景中的渲染对象（Actor、Volume）
 */

import type { Ref } from 'vue'

import type { vtkActor } from '@kitware/vtk.js/Rendering/Core/Actor'
import type { vtkVolume } from '@kitware/vtk.js/Rendering/Core/Volume'

/**
 * 场景子上下文接口
 * 提供场景对象的增删查能力
 */
export interface SceneSubContext {
  /** 获取所有 Actor */
  getActors(): vtkActor[]
  /** 获取所有 Volume */
  getVolumes(): vtkVolume[]
  /** 是否处于体渲染模式 */
  isVolumeRendering(): boolean
  /** 场景中是否有模型（Actor 或 Volume） */
  hasModels(): boolean
  /** 响应式模型数量（Vue 可追踪） */
  readonly modelCount: Ref<number>
  /** 添加 Actor 到场景 */
  addActor(actor: vtkActor): void
  /** 添加 Volume 到场景 */
  addVolume(volume: vtkVolume): void
  /** 清空场景 */
  clearScene(): void
}
