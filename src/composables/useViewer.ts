/**
 * useViewer — 查看器生命周期编排组合式函数
 *
 * 组装和管理 ViewerContext，是整个插件系统的入口。
 * 子上下文工厂和命令注册逻辑已拆分到独立模块：
 *   - factories/createViewerContext.ts   → 渲染/场景/交互/UI 子上下文创建
 *   - registration/CommandRegistrar.ts   → 内核命令注册
 *
 * @module composables/useViewer
 */

import { ref, onUnmounted, type Ref } from 'vue'

// VTK.js 启动时全局副作用
import { setLoggerFunction } from '@kitware/vtk.js/macros'
import '@kitware/vtk.js/Rendering/OpenGL/Profiles/All' // Widget 渲染

// 过滤 vtk.js Widget 渲染 Profile 警告
setLoggerFunction('warn', (...args: any[]) => {
  const msg = args[0]?.toString?.() ?? ''
  if (msg.includes('A rendering Profile is likely missing')) return
  if (msg.includes('Unexpected case in interpolateData')) return
  console.warn(...args)
})

import { BuiltinEvents } from '@/configs'
import {
  ConfigAccessorImpl,
  CommandRegistryImpl,
  createRenderSubContext,
  createSceneSubContext,
  createInteractionSubContext,
  createUISubContext,
  DisposalRegistryImpl,
  EventBusImpl,
  i18n,
  type InteractionSubContext,
  registerCoreBuiltinCommands,
  ResetManager,
  ResetRegistry,
  type RenderSubContext,
  StateManagerImpl,
  ThemeContextImpl,
  ToolbarExtensionRegistryImpl,
  ToolbarInfoRegistryImpl,
  ViewerContextBuilder,
  type ViewerContext
} from '@/core'
import { debugLog } from '@/utils'
import {
  DEFAULT_PLUGIN_CONFIG,
  PluginConfigMerger,
  PluginRegistry,
  type IViewerPlugin,
  type PluginConfig,
  type PluginsConfig
} from '@/plugins'

/** useViewer 配置 */
export interface UseViewerConfig {
  /** 初始配置 */
  config?: Record<string, any>
  /**
   * 插件配置（默认列表，最低优先级）
   * 采用分类配置格式。
   *
   * 当 VtkViewer 组件传入 plugins prop 时，
   * 同分类配置将覆盖此处的配置。
   */
  plugins?: PluginsConfig
  /** 外部解码器路径配置 */
  decoders?: Record<string, string>
  /** 容器元素引用 */
  containerRef?: Ref<HTMLElement | null>
}

/** useViewer 返回值 */
export interface UseViewerReturn {
  /** 查看器上下文 */
  ctx: Ref<ViewerContext | null>
  /** 是否已初始化 */
  isReady: Ref<boolean>
  /** 错误信息 */
  error: Ref<string | null>
  /** 主题上下文（setup 阶段立即可用，不依赖 initialize） */
  themeContext: ThemeContextImpl
  /**
   * 初始化查看器
   * @param pluginsOverride 插件覆盖配置（高优先级，同分类覆盖 useViewer 默认配置）
   */
  initialize: (pluginsOverride?: PluginsConfig) => Promise<void>
  /** 销毁查看器 */
  destroy: () => void
  /** 注册插件 */
  registerPlugin: (plugin: IViewerPlugin, config?: PluginConfig) => void
  /** 加载文件 */
  loadFile: (file: File) => Promise<void>
}

/**
 * useViewer 组合式函数
 * 创建和管理完整的 ViewerContext
 */
export function useViewer(config: UseViewerConfig = {}): UseViewerReturn {
  const ctx = ref<ViewerContext | null>(null)
  const isReady = ref(false)
  const error = ref<string | null>(null)
  /** 手势控制总开关（外部可响应式修改） */
  const enableGestureRef = ref(true)
  /** 键盘控制总开关（外部可响应式修改） */
  const enableKeyboardRef = ref(true)

  // 持有子上下文引用，用于销毁时清理 VTK.js 资源
  let renderSubCtxRef: RenderSubContext | null = null
  let interactionSubCtxRef: InteractionSubContext | null = null

  // ========== 主题状态（在 setup 阶段立即创建，不依赖 async initialize） ==========
  /** 当前主题 ID（响应式，单一数据源） */
  const currentThemeId = ref<string>('light')

  /** 主题上下文（立即可用，不需要等 initialize 完成） */
  const themeContext = new ThemeContextImpl(currentThemeId)

  /**
   * 初始化查看器
   * @param pluginsOverride 插件覆盖配置（高优先级，同分类覆盖 useViewer 默认配置）
   */
  async function initialize(pluginsOverride?: PluginsConfig): Promise<void> {
    try {
      error.value = null

      // 合并插件配置：内置默认（最低优先级）+ 用户传入（中优先级）+ 覆盖（最高优先级）
      const configMerger = new PluginConfigMerger()
      const userBase = configMerger.mergeConfigs(DEFAULT_PLUGIN_CONFIG, config.plugins)
      const mergedPlugins = configMerger.merge(userBase, pluginsOverride)
      // 基础合并配置（不含覆盖），用于 PluginRegistry.setDefaultPluginConfig
      const defaultPlugins = configMerger.mergeConfigs(userBase)

      // 创建各子系统
      const stateManager = new StateManagerImpl()
      const commands = new CommandRegistryImpl()
      const events = new EventBusImpl()
      const configAccessor = new ConfigAccessorImpl(config.config ?? {})
      const disposal = new DisposalRegistryImpl()

      // 创建渲染子上下文（真实 VTK.js 渲染管线）
      const renderSubCtx = createRenderSubContext()
      renderSubCtxRef = renderSubCtx

      // 同步 WebGL 上下文状态到 StateManager 和 EventBus
      ;(renderSubCtx as any)._onContextLost = () => {
        stateManager.setViewerState({ isContextLost: true })
        events.emit(BuiltinEvents.WEBGL_CONTEXT_LOST)
      }
      ;(renderSubCtx as any)._onContextRestored = () => {
        stateManager.setViewerState({ isContextLost: false })
        events.emit(BuiltinEvents.WEBGL_CONTEXT_RESTORED)
      }

      // 创建场景子上下文，延迟绑定渲染器（渲染器在 attachToContainer 后才可用）
      const sceneSubCtx = createSceneSubContext(() => renderSubCtx.getRenderer())

      // 创建交互子上下文，延迟绑定渲染窗口和渲染器
      const interactionSubCtx = createInteractionSubContext(
        () => renderSubCtx.getRenderWindow(),
        () => renderSubCtx.getRenderer(),
        configAccessor,
        events,
        enableGestureRef,
        enableKeyboardRef
      )
      interactionSubCtxRef = interactionSubCtx

      // 包装 attachToContainer：渲染管线就绪后自动初始化交互管线并触发事件
      const originalAttach = renderSubCtx.attachToContainer.bind(renderSubCtx)
      renderSubCtx.attachToContainer = (container: HTMLElement) => {
        debugLog(
          configAccessor,
          `[useViewer] ${i18n.translate('vtkviewer.context.debug.attachToContainer')}`
        )
        originalAttach(container)
        interactionSubCtx.init()
        debugLog(
          configAccessor,
          `[useViewer] ${i18n.translate('vtkviewer.context.debug.renderPipelineReady')}`
        )
        events.emit(BuiltinEvents.RENDER_PIPELINE_READY)
      }

      const uiSubCtx = createUISubContext(
        () => renderSubCtx.getRenderWindow(),
        () => renderSubCtx.getContainer()
      )

      // 创建插件注册表（不依赖 ViewerContext，通过 initAll(ctx) 延迟注入）
      const pluginRegistry = new PluginRegistry(events)
      pluginRegistry.setDefaultPluginConfig(defaultPlugins)

      // 创建重置注册表和重置管理器
      const resetRegistry = new ResetRegistry(events, pluginRegistry)
      const resetManager = new ResetManager(events, resetRegistry)

      // 创建工具栏信息面板注册表
      const infoPanelRegistry = new ToolbarInfoRegistryImpl()

      // 创建工具栏扩展区注册表
      const toolbarExtensionRegistry = new ToolbarExtensionRegistryImpl()

      // 使用 Builder 构建 ViewerContext（主题上下文已在 setup 阶段创建）
      const viewerCtx = new ViewerContextBuilder()
        .withRender(renderSubCtx)
        .withScene(sceneSubCtx)
        .withInteraction(interactionSubCtx)
        .withUI(uiSubCtx)
        .withStateManager(stateManager)
        .withCommands(commands)
        .withEvents(events)
        .withConfig(configAccessor)
        .withDisposal(disposal)
        .withPlugins(pluginRegistry)
        .withResetManager(resetManager)
        .withInfoPanel(infoPanelRegistry)
        .withToolbarExtension(toolbarExtensionRegistry)
        .withTheme(themeContext)
        .withDecoders(config.decoders ?? {})
        .withIsReady(isReady)
        .withEnableGesture(enableGestureRef)
        .withEnableKeyboard(enableKeyboardRef)
        .build()

      ctx.value = viewerCtx

      // 注册内置核心命令
      registerCoreBuiltinCommands(
        commands,
        renderSubCtx,
        sceneSubCtx,
        interactionSubCtx,
        uiSubCtx,
        resetManager,
        stateManager
      )

      // 注册插件
      for (const item of mergedPlugins) {
        if (Array.isArray(item)) {
          const [PluginClass, pluginConfig] = item
          const plugin =
            typeof PluginClass === 'function' ? new (PluginClass as any)() : PluginClass
          pluginRegistry.register(plugin, pluginConfig)
        } else {
          const plugin = typeof item === 'function' ? new (item as any)() : item
          pluginRegistry.register(plugin)
        }
      }

      // 初始化所有插件（传递完整 ViewerContext）
      await pluginRegistry.initAll(viewerCtx)

      // 收集所有插件的重置动作
      resetRegistry.collectActions()

      isReady.value = true
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : i18n.translate('vtkviewer.context.initFailed')
      console.error(`[useViewer] ${i18n.translate('vtkviewer.context.initFailed')}:`, err)
    }
  }

  /**
   * 销毁查看器
   */
  function destroy(): void {
    if (ctx.value) {
      ctx.value.plugins.disposeAll()
      ctx.value.disposal.dispose()
      ctx.value = null
      isReady.value = false
    }
    // 释放 VTK.js 交互管线资源
    if (interactionSubCtxRef) {
      interactionSubCtxRef.dispose()
      interactionSubCtxRef = null
    }
    // 释放 VTK.js 渲染管线资源
    if (renderSubCtxRef) {
      renderSubCtxRef.dispose()
      renderSubCtxRef = null
    }
  }

  /**
   * 注册插件
   */
  function registerPlugin(plugin: IViewerPlugin, pluginConfig?: PluginConfig): void {
    if (ctx.value) {
      ctx.value.plugins.register(plugin, pluginConfig)
    }
  }

  /**
   * 加载文件
   */
  async function loadFile(file: File): Promise<void> {
    if (!ctx.value) {
      throw new Error(i18n.translate('vtkviewer.context.viewerNotInitialized'))
    }
    ctx.value.events.emit('file:load', file)
  }

  // 组件卸载时自动销毁
  onUnmounted(() => {
    destroy()
  })

  return {
    ctx: ctx as Ref<ViewerContext | null>,
    isReady,
    error,
    themeContext,
    initialize,
    destroy,
    registerPlugin,
    loadFile
  }
}
