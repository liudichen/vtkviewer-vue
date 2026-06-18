<!--
  VtkViewer.vue
  VTK 3D 查看器组件
  提供查看器上下文注入、响应式布局和UI插件渲染
-->

<template>
  <div
    ref="containerRef"
    :class="[...containerClasses, themeCssClass]"
    :style="containerStyles"
    class="iimm-vtk-container"
  >
    <!-- 工具栏（flex-wrap 自动换行，无需紧凑模式） -->
    <div class="iimm-vtk-toolbar-wrapper" v-if="showToolbar && internalIsReady && internalCtx">
      <PluginToolbar
        :ctx="internalCtx"
        :icon-size="toolbarIconSize"
        :button-size="toolbarButtonSize"
        :background="toolbarBackground"
        :border-radius="toolbarBorderRadius"
        :padding="toolbarPadding"
        :gap="toolbarGap"
        :button-background="toolbarButtonBackground"
        :button-border-radius="toolbarButtonBorderRadius"
        :separator-color="toolbarSeparatorColor"
        :locale-version="localeVersion"
        :class="props.toolbarClass"
      />
      <!-- 扩展区/信息面板展开/收起按钮 -->
      <button
        v-if="hasExtraContent"
        class="iimm-vtk-extra-toggle"
        :class="{ 'is-collapsed': !extraExpanded }"
        :title="extraExpandTitle"
        @click="extraExpanded = !extraExpanded"
      >
        <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
          <path
            d="M2 8L8 2L14 8"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <div class="iimm-vtk-content">
      <Transition name="iimm-vtk-extra-fade">
        <div v-show="extraExpanded" class="iimm-vtk-extra">
          <!-- 工具栏扩展区（动态显示特定插件的额外控件） -->
          <ToolbarExtension
            v-if="internalIsReady && internalCtx"
            :ctx="internalCtx"
            class="iimm-vtk-extension-wrapper"
            :class="props.toolbarExtensionClass"
          />

          <!-- 工具栏信息面板 -->
          <ToolbarInfoPanel
            v-if="showInfoPanel && internalIsReady && internalCtx"
            :ctx="internalCtx"
            :background="infoPanelBackground"
            :border-radius="infoPanelBorderRadius"
            :padding="infoPanelPadding"
            :font-size="infoPanelFontSize"
            :max-height="infoPanelMaxHeight"
            :class="props.toolbarInfoPanelClass"
          />
        </div>
      </Transition>
      <!-- 主内容区域（VTK.js Canvas 将自动创建于此） -->
      <div ref="contentRef" class="iimm-vtk-canvas">
        <slot />
      </div>
    </div>

    <!-- UI插件覆盖层 -->
    <template v-if="internalIsReady">
      <component
        v-for="item in overlayPlugins"
        :key="item.id"
        :is="item.component"
        v-show="item.visible"
      />
    </template>

    <!-- 面板插件 -->
    <template v-if="internalIsReady">
      <component
        v-for="item in panelPlugins"
        :key="item.id"
        :is="item.component"
        v-show="item.visible"
      />
    </template>

    <!-- 通知插件 -->
    <template v-if="internalIsReady">
      <component
        v-for="item in notificationPlugins"
        :key="item.id"
        :is="item.component"
        v-show="item.visible"
      />
    </template>

    <!-- Portal 插件：挂载到外部 DOM -->
    <template v-if="internalIsReady">
      <Teleport
        v-for="item in portalPlugins"
        :key="item.id"
        :to="item.portalTarget"
        v-bind="item.portalProps"
      >
        <component :is="item.component" v-show="item.visible" />
      </Teleport>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from 'vue'

import { type CommandRegistry, type ViewerContext, i18n } from '@/core'
import { BuiltinCommands, BuiltinEvents, BUILTIN_THEMES } from '@/configs'
import { useFormatLoader, useResponsiveLayout, useUIPlugins, useViewer } from '@/composables'
import { getThemeManager } from '@/utils'
import {
  stateManagerKey,
  commandExecutorKey,
  eventBusKey,
  viewerContextKey
} from '@/plugins'
import type { InfoPanelConfig, ToolbarConfig, VtkViewerProps, VtkViewerSource } from '@/types'

import PluginToolbar from './PluginToolbar.vue'
import ToolbarExtension from './ToolbarExtension.vue'
import ToolbarInfoPanel from './ToolbarInfoPanel.vue'

/** rAF ID（取消动画帧用） */
let resizeRafId: number | null = null

/** i18n 版本号（locale 变更时递增，用于触发 PluginToolbar/useUIPlugins 缓存清理） */
const localeVersion = ref(0)

const props = withDefaults(defineProps<VtkViewerProps>(), {
  toolbar: true,
  infoPanel: true,
  background: '#e6e6e6',
  theme: 'light',
  customThemes: () => ({}),
  enableGesture: true,
  enableKeyboard: true
})

const emit = defineEmits<{
  /** 主题变更事件（配合 v-model:theme 使用） */
  'update:theme': [themeId: string]
  /** 语言变更事件（配合 v-model:locale 使用） */
  'update:locale': [locale: string]
  /** 上下文变更事件（配合 v-model:ctx 使用） */
  'update:ctx': [ctx: ViewerContext | null]
}>()

/** 内部语言状态，默认跟随 props.locale，无外部传入时默认 'zh' */
const currentLocale = ref<string>(props.locale ?? 'zh')

/** 工具栏配置归一化（合并为单个 computed，避免 8 个独立 computed 属性透传） */
const toolbarConfig = computed(() => {
  if (typeof props.toolbar === 'object') return props.toolbar
  return {} as ToolbarConfig
})

/** 工具栏图标尺寸 */
const toolbarIconSize = computed(() => toolbarConfig.value.iconSize ?? 20)

/** 工具栏按钮尺寸 */
const toolbarButtonSize = computed(() => toolbarConfig.value.buttonSize ?? 32)

/** 工具栏背景色 */
const toolbarBackground = computed(() => toolbarConfig.value.background)

/** 工具栏圆角 */
const toolbarBorderRadius = computed(() => toolbarConfig.value.borderRadius)

/** 工具栏内边距 */
const toolbarPadding = computed(() => toolbarConfig.value.padding)

/** 工具栏按钮间距 */
const toolbarGap = computed(() => toolbarConfig.value.gap)

/** 工具栏按钮背景色 */
const toolbarButtonBackground = computed(() => toolbarConfig.value.buttonBackground)

/** 工具栏按钮圆角 */
const toolbarButtonBorderRadius = computed(() => toolbarConfig.value.buttonBorderRadius)

/** 工具栏分隔线颜色 */
const toolbarSeparatorColor = computed(() => toolbarConfig.value.separatorColor)

/** 是否显示工具栏 */
const showToolbar = computed(() => props.toolbar !== false)

/** 信息面板配置归一化 */
const infoPanelConfig = computed(() => {
  if (typeof props.infoPanel === 'object') return props.infoPanel
  return {} as InfoPanelConfig
})

/** 是否显示信息面板 */
const showInfoPanel = computed(() => props.infoPanel !== false)

/** 信息面板背景色 */
const infoPanelBackground = computed(() => infoPanelConfig.value.background)

/** 信息面板圆角 */
const infoPanelBorderRadius = computed(() => infoPanelConfig.value.borderRadius)

/** 信息面板内边距 */
const infoPanelPadding = computed(() => infoPanelConfig.value.padding)

/** 信息面板字体大小 */
const infoPanelFontSize = computed(() => infoPanelConfig.value.fontSize)

/** 信息面板最大高度 */
const infoPanelMaxHeight = computed(() => infoPanelConfig.value.maxHeight)

const containerRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)

// ========== 始终内部创建 ViewerContext ==========
const {
  ctx: internalCtx,
  isReady: internalIsReady,
  initialize: initViewer,
  destroy: destroyViewer,
  themeContext: internalThemeContext
} = useViewer({ plugins: props.plugins, config: { debug: props.debug }, decoders: props.decoders })

// 监听 ctx 变化，支持 v-model:ctx
watch(internalCtx, (newCtx) => {
  emit('update:ctx', newCtx)
})

// 同步调用 initViewer() 创建上下文（不 await 插件初始化）
// 这样 ctx 立即可用，provide 可在 setup 阶段同步调用
initViewer()

/** 最近一次尝试加载的数据源（用于 RETRY_LOAD 命令） */
const lastSource = ref<VtkViewerSource | null>(null)
const lastSourceFormat = ref<string | undefined>(undefined)
const lastSourceFilename = ref<string | undefined>(undefined)

/** 持有命令注册表的引用，用于组件卸载时清理 RETRY_LOAD 命令，防止闭包泄漏 */
let commandsRegistryForCleanup: CommandRegistry | null = null

/** 注册 RETRY_LOAD 命令：重新加载最近一次的数据源 */
function registerRetryCommand(commands: CommandRegistry): void {
  commandsRegistryForCleanup = commands
  commands.register(BuiltinCommands.RETRY_LOAD, {
    execute: async () => {
      const src = lastSource.value
      if (!src) return
      // 清除错误状态
      const ctx = internalCtx.value
      ctx?.stateManager.clearError()
      try {
        await loadSource(src, lastSourceFormat.value, lastSourceFilename.value)
      } catch (err) {
        console.error(`[VtkViewer] ${i18n.translate('vtkviewer.source.retryLoadFailed')}:`, err)
        if (ctx) {
          ctx.stateManager.setError({
            message:
              err instanceof Error ? err.message : i18n.translate('vtkviewer.source.loadFailed'),
            severity: 'error',
            recoverable: true
          })
        }
      }
    }
  })
}

// 注入查看器上下文到 Vue 组件树（provide 必须同步调用）
{
  const ctx = internalCtx.value
  if (ctx) {
    provide(stateManagerKey, ctx.stateManager)
    provide(commandExecutorKey, ctx.commands)
    provide(eventBusKey, ctx.events)
    provide(viewerContextKey, ctx)
    // 注册重试命令
    registerRetryCommand(ctx.commands)
  }
}

// 同步 background prop 到 UISubContext.defaultBackground
// 必须在 initViewer() 之后，确保 ctx 已有值
watch(
  () => props.background,
  color => {
    const ctx = internalCtx.value
    if (ctx) {
      ctx.ui.setDefaultBackground(color)
    }
  },
  { immediate: true }
)

// 同步 debug prop 到 ctx.config
watch(
  () => props.debug,
  debug => {
    const ctx = internalCtx.value
    if (ctx && debug !== undefined) {
      ctx.config.set('debug', debug)
    }
  },
  { immediate: true }
)

// 同步 decoders prop 到 ctx.decoders
watch(
  () => props.decoders,
  decoders => {
    const ctx = internalCtx.value
    if (ctx && decoders) {
      Object.assign(ctx.decoders, decoders)
    }
  },
  { immediate: true }
)

// 同步 enableGesture prop 到 ctx.enableGesture（响应式控制触摸交互总开关）
watch(
  () => props.enableGesture,
  gesture => {
    const ctx = internalCtx.value
    if (ctx && gesture !== undefined) {
      ctx.enableGesture.value = gesture
    }
  },
  { immediate: true }
)

// 同步 enableKeyboard prop 到 ctx.enableKeyboard（响应式控制快捷键总开关）
watch(
  () => props.enableKeyboard,
  keyboard => {
    const ctx = internalCtx.value
    if (ctx && keyboard !== undefined) {
      ctx.enableKeyboard.value = keyboard
    }
  },
  { immediate: true }
)

// 监听外部 props.locale 变化，同步到内部语言状态
watch(
  () => props.locale,
  newLocale => {
    if (newLocale !== undefined && newLocale !== currentLocale.value) {
      currentLocale.value = newLocale
    }
  }
)

// 监听外部 props.languages 变化，同步到 I18nManager
watch(
  () => props.languages,
  langs => {
    i18n.setLanguageOptions(langs)
  }
)

// 同步 internal language state 到 I18nManager 单例，locale 变更时触发渲染缓存清理
watch(
  [() => props.t, currentLocale],
  () => {
    const ctx = internalCtx.value
    if (!ctx) return
    const locale = currentLocale.value
    // 同步到 I18nManager 单例（对外部函数和工具函数提供支持）
    i18n.setExternalTranslator(props.t ?? null)
    i18n.setDefaultLocale(locale)
    i18n.setLocale(locale)
    localeVersion.value++
    // 同步到外部 prop（v-model:locale）
    emit('update:locale', locale)
    // 在事件总线上广播语言变更，通知所有插件（infoPanel/extension 等）重新注册
    ctx.events.emit(BuiltinEvents.LOCALE_CHANGED, { locale })
    // 同步到 LanguageSwitchPlugin 内部状态
    syncLocaleToPlugin(locale)
  },
  { immediate: true }
)

// 获取主题管理器实例
const themeManager = getThemeManager()

// 在 setup 阶段注册内置主题，确保主题在组件挂载前就可用
themeManager.registerBuiltinThemes(BUILTIN_THEMES)
if (props.debug) {
  console.log(
    `[VtkViewer] ${i18n.translate('vtkviewer.source.builtinThemesRegistered')}:`,
    Object.keys(BUILTIN_THEMES)
  )
}

// 主题上下文（始终由内部 useViewer 提供）
const themeCtx = internalThemeContext

// 主题 CSS 类（直接绑定到模板，Vue 首次渲染即生效）
const themeCssClass = computed(() => {
  const themeId = themeCtx.currentThemeId.value ?? props.theme ?? 'light'
  return `iimm-vtk-theme-${themeId}`
})

// props.theme → ctx.theme 状态同步
watch(
  () => props.theme,
  themeId => {
    themeCtx.setTheme(themeId ?? 'light')
  },
  { immediate: true }
)

// 主题状态变化 → 应用内联自定义属性（CSS 类由模板 themeCssClass 管理）
watch(
  () => themeCtx.currentThemeId.value,
  themeId => {
    if (themeId && containerRef.value) {
      themeManager.applyTheme(containerRef.value, themeId)
    }
    if (themeId) emit('update:theme', themeId)
  },
  { immediate: true }
)

// 同步 customThemes prop 到 ThemeManager
watch(
  () => props.customThemes,
  themes => {
    if (themes && Object.keys(themes).length > 0) {
      themeManager.setCustomThemes(themes)
      // 如果当前主题在自定义主题中，重新应用
      const currentTheme = props.theme ?? 'light'
      if (themes[currentTheme]) {
        themeManager.applyTheme(containerRef.value, currentTheme)
      }
    } else {
      themeManager.clearCustomThemes()
    }
  },
  { immediate: true, deep: true }
)

// ========== 数据源自动加载 ==========
const formatLoader = computed(() => {
  const ctx = internalCtx.value
  return ctx ? useFormatLoader(ctx) : null
})

/** 事件监听清理函数数组，在 watch 回调和 onUnmounted 中执行 */
const eventCleanups: (() => void)[] = []

// 监听 ctx 事件（主题同步已由 currentThemeId watch 处理）
watch(
  internalCtx,
  (ctx, _oldCtx) => {
    eventCleanups.forEach(fn => fn())
    eventCleanups.length = 0

    if (!ctx) return

    // 消除 computed 懒执行陷阱
    const _loader = formatLoader.value

    // 语言切换事件转发（LanguageSwitchPlugin 选择语言后同步到内部状态）
    const localeHandler = ({ locale }: { locale: string }) => {
      currentLocale.value = locale
    }
    ctx.events.on(BuiltinEvents.LOCALE_CHANGED, localeHandler)
    eventCleanups.push(() => ctx.events.off(BuiltinEvents.LOCALE_CHANGED, localeHandler))

    // 文件拖拽加载：响应 DragDropPlugin 发射的事件
    const fileLoadHandler = (file: File) => {
      const loader = formatLoader.value
      if (loader) {
        loader.loadFile(file).catch(err => {
          console.error(`[VtkViewer] ${i18n.translate('vtkviewer.source.fileLoadFailed')}:`, err)
        })
      }
    }
    ctx.events.on(BuiltinEvents.FILE_LOAD, fileLoadHandler)
    eventCleanups.push(() => ctx.events.off(BuiltinEvents.FILE_LOAD, fileLoadHandler))

    const filesLoadHandler = (files: File[]) => {
      const loader = formatLoader.value
      if (loader && files && files.length > 0) {
        loader.loadFile(files[0]).catch(err => {
          console.error(`[VtkViewer] ${i18n.translate('vtkviewer.source.filesLoadFailed')}:`, err)
        })
      }
    }
    ctx.events.on(BuiltinEvents.FILES_LOAD, filesLoadHandler)
    eventCleanups.push(() => ctx.events.off(BuiltinEvents.FILES_LOAD, filesLoadHandler))
  },
  { immediate: true }
)

// 同步语言到 LanguageSwitchPlugin（如果存在）
function syncLocaleToPlugin(locale: string): void {
  const ctx = internalCtx.value
  if (!ctx) return
  const plugins = ctx.plugins?.getAll() ?? []
  const langPlugin = plugins.find(p => p.metadata.id === 'languageSwitch')
  if (langPlugin && 'setCurrentLocale' in langPlugin) {
    ;(langPlugin as any).setCurrentLocale(locale)
  }
}

/** 扩展区/信息面板展开状态（默认展开） */
const extraExpanded = ref(true)

/** 扩展区展开/收起按钮标题（支持 i18n） */
const extraExpandTitle = computed(() => {
  if (extraExpanded.value) {
    return i18n.translate('vtkviewer.toolbar.collapseExtra')
  }
  return i18n.translate('vtkviewer.toolbar.expandExtra')
})

/** 是否存在扩展区或信息面板内容 */
const hasExtraContent = computed(() => {
  const ctx = internalCtx.value
  if (!ctx) return false
  const hasExtensions = (ctx.toolbarExtension.activeExtensions.value?.length ?? 0) > 0
  const hasInfoItems = (ctx.infoPanel?.items?.value ?? []).some((item: any) => {
    if (item.visibleCheck) return item.visibleCheck()
    return true
  })
  return hasExtensions || hasInfoItems
})

/** 加载数据源（开始加载时自动清除已有错误提示） */
async function loadSource(
  source: VtkViewerSource,
  format?: string,
  filename?: string
): Promise<void> {
  const loader = formatLoader.value
  if (!loader) {
    throw new Error(i18n.translate('vtkviewer.source.viewerNotReady'))
  }

  // 清除已有错误提示，避免旧错误遮挡新加载过程
  const ctx = internalCtx.value
  ctx?.stateManager.clearError()

  if (source instanceof File) {
    await loader.loadFile(source)
  } else if (typeof source === 'string') {
    // URL: fetch 后加载。若提供了 sourceFormat 则跳过自动检测
    const response = await fetch(source)
    if (!response.ok) {
      const prefix = i18n.translate('vtkviewer.source.httpError')
      throw new Error(`${prefix} (HTTP ${response.status}: ${response.statusText})`)
    }
    const buffer = await response.arrayBuffer()
    const urlFilename = source.split('/').pop() ?? 'model'
    const finalFormat = format ?? loader.detectFormat(urlFilename, buffer)?.format
    if (!finalFormat) {
      throw new Error(i18n.translate('vtkviewer.source.unsupportedFormat') + `: ${urlFilename}`)
    }
    await loader.loadBuffer(buffer, finalFormat, urlFilename)
  } else if (source instanceof ArrayBuffer) {
    // ArrayBuffer: sourceFormat 优先，否则自动探测（魔数 / 内容 / 扩展名）
    const finalFormat = format ?? loader.detectFormat(filename, source)?.format
    if (!finalFormat) {
      throw new Error(i18n.translate('vtkviewer.source.formatNotDetected'))
    }
    await loader.loadBuffer(source, finalFormat, filename)
  } else if (source instanceof ReadableStream) {
    // ReadableStream: 读取为 ArrayBuffer 后加载
    const reader = source.getReader()
    const chunks: Uint8Array[] = []
    let totalLength = 0
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
      totalLength += value.length
    }
    const buffer = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      buffer.set(chunk, offset)
      offset += chunk.length
    }
    // ReadableStream: sourceFormat 优先，否则自动探测
    const finalFormat = format ?? loader.detectFormat(filename, buffer.buffer)?.format
    if (!finalFormat) {
      throw new Error(i18n.translate('vtkviewer.source.formatNotDetected'))
    }
    await loader.loadBuffer(buffer.buffer, finalFormat, filename)
  }
}

// 监听 source / sourceFormat / sourceFilename 变化，自动加载/卸载
watch(
  () => [props.source, props.sourceFormat, props.sourceFilename] as const,
  async ([newSource, newFormat, newFilename], oldValues) => {
    const oldSource = oldValues?.[0]
    // source 变为空值（null/undefined/''）时卸载模型
    if (!newSource) {
      if (oldSource) {
        const loader = formatLoader.value
        if (loader) {
          loader.unloadModels()
        }
      }
      return
    }
    // 记录最近一次加载尝试（用于 RETRY_LOAD）
    lastSource.value = newSource
    lastSourceFormat.value = newFormat
    lastSourceFilename.value = newFilename
    try {
      await loadSource(newSource, newFormat, newFilename)
    } catch (err) {
      console.error(`[VtkViewer] ${i18n.translate('vtkviewer.source.autoLoadFailed')}:`, err)
      // 将错误同步到 stateManager，使 ErrorPlugin 能在 UI 中显示
      if (internalCtx.value) {
        internalCtx.value.stateManager.setError({
          message:
            err instanceof Error ? err.message : i18n.translate('vtkviewer.source.loadFailed'),
          severity: 'error',
          recoverable: true
        })
      }
    }
  },
  { immediate: true }
)

// 将 VTK.js 渲染管线附加到内容区域
// 并设置 ResizeObserver 使画布随容器尺寸变化自动调整
let canvasResizeObserver: ResizeObserver | null = null

onMounted(() => {
  const ctx = internalCtx.value
  if (!ctx) {
    console.warn(`[VtkViewer] ${i18n.translate('vtkviewer.source.ctxNotFound')}`)
    return
  }

  if (contentRef.value) {
    ctx.render.attachToContainer(contentRef.value)

    // 监听内容区域尺寸变化，触发 VTK canvas resize
    // 使用 requestAnimationFrame 合并同帧内多次 resize 回调
    // 避免 50ms setTimeout 防抖导致的渲染滞后
    canvasResizeObserver = new ResizeObserver(() => {
      if (resizeRafId !== null) return
      resizeRafId = requestAnimationFrame(() => {
        resizeRafId = null
        ctx.render.resize()
      })
    })
    canvasResizeObserver.observe(contentRef.value)
  }
})

onUnmounted(() => {
  // 清理事件监听（watch 中注册的 ctx.events.on）
  eventCleanups.forEach(fn => fn())
  eventCleanups.length = 0

  // 清理 RETRY_LOAD 命令闭包引用，防止组件作用域变量泄漏
  if (commandsRegistryForCleanup) {
    commandsRegistryForCleanup.unregister(BuiltinCommands.RETRY_LOAD)
    commandsRegistryForCleanup = null
  }

  if (resizeRafId !== null) {
    cancelAnimationFrame(resizeRafId)
    resizeRafId = null
  }
  if (canvasResizeObserver) {
    canvasResizeObserver.disconnect()
    canvasResizeObserver = null
  }
  // 销毁 ViewerContext
  destroyViewer()
})

// 响应式布局
const { getResponsiveClasses, getResponsiveStyles } = useResponsiveLayout(containerRef)

// UI插件管理
const { overlayPlugins, panelPlugins, notificationPlugins, portalPlugins } = useUIPlugins(
  internalCtx,
  {
    hideWhenNoModel: props.ui?.hideWhenNoModel ?? false,
    localeVersion
  }
)

// 计算容器类名
const containerClasses = computed(() => {
  const classes = [...getResponsiveClasses(), 'iimm-vtk-container']
  if (props.class) {
    if (Array.isArray(props.class)) {
      classes.push(...props.class)
    } else {
      classes.push(props.class)
    }
  }
  return classes
})

// 计算容器样式
const containerStyles = computed(() => getResponsiveStyles())
</script>

<style src="../styles/index.scss" lang="scss" />
