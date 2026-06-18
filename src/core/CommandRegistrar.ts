/**
 * CommandRegistrar — 内置核心命令注册器
 *
 * 从 useViewer.ts 拆分而来，负责将 BuiltinCommands 中的命令委托给各子上下文。
 *
 * @module core/CommandRegistrar
 */

import { BuiltinCommands } from '@/configs'

import type { CommandRegistry } from './CommandRegistry'
import type {
  RenderSubContext,
  CameraPreset,
  CameraState,
  ScreenshotOptions
} from './RenderSubContext'
import type { SceneSubContext } from './SceneSubContext'
import type { InteractionSubContext } from './InteractionSubContext'
import type { UISubContext } from './UISubContext'
import type { IStateManager } from './StateManager'
import { ResetManager, ResetLevel } from './ResetManager'

/**
 * 注册内置核心命令
 * 将 BuiltinCommands 中的命令委托给各子上下文
 */
export function registerCoreBuiltinCommands(
  commands: CommandRegistry,
  renderCtx: RenderSubContext,
  _sceneCtx: SceneSubContext,
  interactionCtx: InteractionSubContext,
  uiCtx: UISubContext,
  resetManager: ResetManager,
  stateManager?: IStateManager
): void {
  // === 渲染命令 ===
  commands.register(BuiltinCommands.RENDER, {
    execute: () => renderCtx.render()
  })

  // === 相机命令 ===
  commands.register(BuiltinCommands.RESET_CAMERA, {
    execute: () => renderCtx.resetCamera()
  })

  commands.register(BuiltinCommands.RESET_TO_DEFAULT_VIEW, {
    execute: () => renderCtx.resetToDefaultView()
  })

  // === 重置所有命令（通过 ResetManager 统一协调所有插件状态重置） ===
  commands.register(BuiltinCommands.RESET_ALL, {
    execute: async (source: string = 'user') => {
      await resetManager.resetAll(ResetLevel.SOFT, source)
    }
  })

  commands.register(BuiltinCommands.SET_CAMERA_VIEW, {
    execute: (preset: CameraPreset) => renderCtx.setCameraView(preset)
  })

  commands.register(BuiltinCommands.RESTORE_CAMERA, {
    execute: (state: CameraState) => renderCtx.restoreCameraState(state)
  })

  // === 交互命令 ===
  commands.register(BuiltinCommands.TOGGLE_TOOL, {
    execute: (tool: string) => interactionCtx.toggleTool(tool)
  })

  // === UI 命令 ===
  commands.register(BuiltinCommands.CAPTURE_SCREENSHOT, {
    execute: (options?: ScreenshotOptions) => uiCtx.captureScreenshot(options)
  })

  commands.register(BuiltinCommands.TOGGLE_FULLSCREEN, {
    execute: () => uiCtx.toggleFullscreen()
  })

  commands.register(BuiltinCommands.TOGGLE_AXES, {
    execute: () => uiCtx.toggleAxes()
  })

  commands.register(BuiltinCommands.SET_BACKGROUND_COLOR, {
    execute: (color: string) => uiCtx.setBackgroundColor(color)
  })

  commands.register(BuiltinCommands.APPLY_VIEW_PRESET, {
    execute: (preset: string) => uiCtx.applyViewPreset(preset)
  })

  // === 错误处理命令 ===
  if (stateManager) {
    commands.register(BuiltinCommands.DISMISS_ERROR, {
      execute: () => stateManager.clearError()
    })
    // RETRY_LOAD 由 VtkViewer.vue 在初始化时注册覆盖式 handler，实现重新加载数据源
  }
}
