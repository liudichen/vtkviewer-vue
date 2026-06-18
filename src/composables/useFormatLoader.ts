/**
 * useFormatLoader 组合式函数
 * 提供文件格式检测和加载能力
 */

import { ref, type Ref } from 'vue'

import { FormatDetector, type FormatDetectionResult, ResetScope, type ViewerContext } from '@/core'
import { unloadAllModels, yieldToBrowser } from '@/utils'
import type { IFormatPlugin } from '@/plugins'

/** 加载状态 */
export interface LoadState {
  isLoading: boolean
  progress: number
  stage: string
  error: string | null
  /** 正在解析的文件大小（字节），0 表示未知 */
  fileSize?: number
}

/** useFormatLoader 返回值 */
export interface UseFormatLoaderReturn {
  /** 加载状态 */
  loadState: Ref<LoadState>
  /** 加载文件（自动清除旧场景） */
  loadFile: (file: File) => Promise<void>
  /** 加载 ArrayBuffer（自动清除旧场景） */
  loadBuffer: (buffer: ArrayBuffer, format: string, filename?: string) => Promise<void>
  /** 检测格式 */
  detectFormat: (filename?: string, buffer?: ArrayBuffer) => FormatDetectionResult | null
  /** 支持的格式列表 */
  supportedFormats: string[]
  /** 清空场景（移除所有 Actor 和 Volume） */
  clearScene: () => void
  /** 卸载模型（完整释放资源，复用卸载模型操作） */
  unloadModels: () => void
}

/**
 * useFormatLoader 组合式函数
 * 提供文件格式检测和加载能力
 */
export function useFormatLoader(ctx: ViewerContext): UseFormatLoaderReturn {
  const loadState = ref<LoadState>({
    isLoading: false,
    progress: 0,
    stage: 'idle',
    error: null
  })

  /** 同步 loadState 到 stateManager，使内部 LoadingPlugin 能读取进度 */
  function syncToStateManager(): void {
    ctx.stateManager.setLoading({
      isLoading: loadState.value.isLoading,
      progress: loadState.value.progress,
      stage: loadState.value.stage,
      fileSize: loadState.value.fileSize
    })
  }

  /**
   * 检测文件格式（委托给 FormatDetector）
   * @param filename 可选，文件名（用于扩展名检测，网络模型可不传）
   * @param buffer 可选，文件内容（用于魔术数字和内容分析）
   */
  function detectFormat(filename?: string, buffer?: ArrayBuffer): FormatDetectionResult | null {
    return FormatDetector.detect(filename, buffer)
  }

  /**
   * 查找格式插件（O(1) 索引查找，实时从 PluginRegistry 获取）
   */
  function findFormatPlugin(format: string): IFormatPlugin | undefined {
    return ctx.plugins.getFormatPluginIndex().get(format.toLowerCase())
  }

  /**
   * 清空场景
   */
  function clearScene(): void {
    ctx.scene.clearScene()
    // 清除保存的初始相机状态
    if (ctx.render?.clearInitialCameraState) {
      ctx.render.clearInitialCameraState()
    }
    // 触发独立作用域的插件重置动作（如清除测量数据、重置动画状态等）
    ctx.resetManager.invokeByScope(ResetScope.INDEPENDENT).catch(err => {
      console.warn('[useFormatLoader] Failed to invoke independent reset actions:', err)
    })
    ctx.events.emit('scene:cleared')
  }

  /**
   * 卸载模型（释放所有资源，重置状态）
   * 复用 UnloadModelPlugin 的完整卸载逻辑
   */
  function unloadModels(): void {
    unloadAllModels(ctx.scene, ctx.render, ctx.resetManager, ctx.events)
  }

  /**
   * 加载文件（自动清除旧场景）
   */
  async function loadFile(file: File): Promise<void> {
    // 先读取文件并验证格式，再清空场景，避免格式无效时丢失已有场景
    const buffer = await file.arrayBuffer()

    const detection = detectFormat(file.name, buffer)
    if (!detection) {
      // 设置错误到 stateManager，使 ErrorPlugin 能显示在 UI 中
      ctx.stateManager.setError({
        message: `不支持的文件格式: ${file.name}`,
        severity: 'error',
        recoverable: true
      })
      throw new Error(`不支持的文件格式: ${file.name}`)
    }

    const plugin = findFormatPlugin(detection.format)
    if (!plugin) {
      ctx.stateManager.setError({
        message: `未找到格式处理器: ${detection.format}`,
        severity: 'error',
        recoverable: true
      })
      throw new Error(`未找到格式处理器: ${detection.format}`)
    }

    // 验证通过后，如果已存在模型则先卸载（复用完整卸载逻辑），否则清空场景
    if (ctx.scene.hasModels()) {
      unloadModels()
    } else {
      clearScene()
    }

    loadState.value = {
      isLoading: true,
      progress: 0,
      stage: 'reading',
      error: null,
      fileSize: file.size
    }
    syncToStateManager()
    await yieldToBrowser()

    try {
      loadState.value.progress = 30
      syncToStateManager()
      await yieldToBrowser()

      loadState.value.stage = 'parsing'
      loadState.value.progress = 50
      syncToStateManager()
      await yieldToBrowser()

      loadState.value.stage = 'rendering'
      loadState.value.progress = 70
      syncToStateManager()
      await yieldToBrowser()

      // 解析文件（同步CPU密集操作，会阻塞主线程）
      // CSS动画在合成线程运行，不受JS阻塞影响，继续提供视觉反馈
      const parseStartTime = performance.now()
      const result = await plugin.parse(buffer, detection.format)
      // eslint-disable-next-line
      const parseDuration = performance.now() - parseStartTime

      loadState.value.progress = 100
      loadState.value.stage = 'complete'
      syncToStateManager()
      await yieldToBrowser() // 确保 LoadingPlugin 重新渲染显示 100% / 加载完成

      // 将解析结果添加到场景
      if (result.actors) {
        for (const actor of result.actors) {
          ctx.scene.addActor(actor)
        }
      }
      if (result.volumes) {
        for (const volume of result.volumes) {
          ctx.scene.addVolume(volume)
        }
      }

      // 重置到默认视图（包括相机位置、视角、裁剪范围）
      if (ctx.render?.resetToDefaultView) {
        ctx.render.resetToDefaultView()
      } else if (ctx.render?.resetCamera) {
        ctx.render.resetCamera()
      }

      // 保存初始相机状态，用于后续重置
      if (ctx.render?.saveInitialCameraState) {
        ctx.render.saveInitialCameraState()
      }

      loadState.value.stage = 'done'
      loadState.value.isLoading = false
      syncToStateManager()
      await yieldToBrowser() // 确保 LoadingPlugin 重新渲染并消失

      // 触发场景加载事件
      ctx.events.emit('scene:loaded', {
        format: detection.format,
        filename: file.name,
        supportsColorBy: result.metadata?.supportsColorBy !== false
      })
    } catch (err) {
      loadState.value.isLoading = false
      loadState.value.error = err instanceof Error ? err.message : '加载失败'
      syncToStateManager()
      ctx.stateManager.setError({
        message: loadState.value.error,
        severity: 'error',
        recoverable: true
      })
      throw err
    }
  }

  /**
   * 加载 ArrayBuffer（自动清除旧场景）
   */
  async function loadBuffer(buffer: ArrayBuffer, format: string, filename?: string): Promise<void> {
    // 先验证格式，再清空场景，避免格式无效时丢失已有场景
    const plugin = findFormatPlugin(format)
    if (!plugin) {
      ctx.stateManager.setError({
        message: `未找到格式处理器: ${format}`,
        severity: 'error',
        recoverable: true
      })
      throw new Error(`未找到格式处理器: ${format}`)
    }

    // 如果已存在模型则先卸载（复用完整卸载逻辑），否则清空场景
    if (ctx.scene.hasModels()) {
      unloadModels()
    } else {
      clearScene()
    }

    loadState.value = {
      isLoading: true,
      progress: 0,
      stage: 'parsing',
      error: null,
      fileSize: buffer.byteLength
    }
    syncToStateManager()
    await yieldToBrowser()

    try {
      loadState.value.progress = 50
      syncToStateManager()
      await yieldToBrowser()

      // 解析文件（同步CPU密集操作，会阻塞主线程）
      const parseStartTime = performance.now()
      const result = await plugin.parse(buffer, format)
      // eslint-disable-next-line
      const parseDuration = performance.now() - parseStartTime

      loadState.value.progress = 100
      loadState.value.stage = 'complete'
      syncToStateManager()
      await yieldToBrowser() // 确保 LoadingPlugin 重新渲染显示 100% / 加载完成

      // 将解析结果添加到场景
      if (result.actors) {
        for (const actor of result.actors) {
          ctx.scene.addActor(actor)
        }
      }
      if (result.volumes) {
        for (const volume of result.volumes) {
          ctx.scene.addVolume(volume)
        }
      }

      // 重置到默认视图（包括相机位置、视角、裁剪范围）
      if (ctx.render?.resetToDefaultView) {
        ctx.render.resetToDefaultView()
      } else if (ctx.render?.resetCamera) {
        ctx.render.resetCamera()
      }

      // 保存初始相机状态，用于后续重置
      if (ctx.render?.saveInitialCameraState) {
        ctx.render.saveInitialCameraState()
      }

      loadState.value.stage = 'done'
      loadState.value.isLoading = false
      syncToStateManager()
      await yieldToBrowser() // 确保 LoadingPlugin 重新渲染并消失

      ctx.events.emit('scene:loaded', {
        format,
        filename,
        supportsColorBy: result.metadata?.supportsColorBy !== false
      })
    } catch (err) {
      loadState.value.isLoading = false
      loadState.value.error = err instanceof Error ? err.message : '加载失败'
      syncToStateManager()
      throw err
    }
  }

  // 所有支持的格式列表（从 PluginRegistry 缓存获取）
  function getSupportedFormatsForLoader(): string[] {
    return ctx.plugins.getSupportedExtensions()
  }

  const supportedFormats = getSupportedFormatsForLoader()

  return {
    loadState,
    loadFile,
    loadBuffer,
    detectFormat,
    supportedFormats,
    clearScene,
    unloadModels
  }
}
