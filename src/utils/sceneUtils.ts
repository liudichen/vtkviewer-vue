/**
 * 场景操作工具
 * 提供统一的场景清除/卸载流程，避免多处重复
 *
 * @module utils/sceneUtils
 */

import {
  type EventBus,
  type RenderSubContext,
  type ResetManager,
  type SceneSubContext,
  i18n,
  ResetScope
} from '@/core'
import { BuiltinEvents } from '@/configs'

/**
 * 完全卸载当前场景中的所有模型。
 * 流程：清除场景 → 重置相机 → 重置独立插件 → 发事件 → 渲染 → GC 提示
 *
 * @param scene 场景子上下文
 * @param render 渲染器子上下文
 * @param resetManager 重置管理器
 * @param events 事件总线
 */
export function unloadAllModels(
  scene: SceneSubContext,
  render: RenderSubContext,
  resetManager: ResetManager,
  events: EventBus
): void {
  // 1. 移除并释放所有 Actor/Volume（GPU 资源）
  scene.clearScene()

  // 2. 清除保存的初始相机状态
  render.clearInitialCameraState?.()

  // 3. 重置所有独立作用域的插件状态（测量、剖切、动画等）
  resetManager.invokeByScope(ResetScope.INDEPENDENT).catch(err => {
    console.warn(`[sceneUtils] ${i18n.translate('vtkviewer.scene.failedReset')}:`, err)
  })

  // 4. 发出场景清除事件（通知 ColorBy、ViewSelect 等监听者）
  events.emit(BuiltinEvents.SCENE_CLEARED)

  // 5. 重置相机到默认视角并渲染
  render.resetToDefaultView?.()
  render.render?.()

  // 6. GC 提示
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(() => {
      if (typeof (globalThis as any)?.gc === 'function') {
        try {
          ;(globalThis as any).gc()
        } catch {}
      }
    })
  }
}
