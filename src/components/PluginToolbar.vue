<!--
  PluginToolbar.vue
  插件工具栏组件
  渲染所有工具栏插件的UI
  分组信息从插件 config.group 读取，通过注册时 `[PluginClass, { group: 'xxx' }]` 传入
-->

<template>
  <div class="iimm-vtk-toolbar" :class="toolbarClasses">
    <template v-for="(entry, idx) in renderItems" :key="entry.item.key">
      <!-- 分组单元：同一分组的插件包裹在 group div 中 -->
      <div
        v-if="entry.item.type === 'group'"
        class="iimm-vtk-toolbar-group"
        :class="`iimm-vtk-toolbar-group--${entry.item.group}`"
      >
        <component
          v-for="plugin in entry.item.plugins"
          :key="plugin.metadata.id"
          :is="getPluginComponent(plugin)"
          v-show="isPluginVisible(plugin)"
        />
      </div>

      <!-- 未分组插件：直接渲染 -->
      <component v-else :is="getPluginComponent(entry.item.plugin)" v-show="entry.hasVisible" />

      <!-- 分隔线：仅在当前项与下一项都有可见内容时添加 -->
      <div
        v-if="entry.hasVisible && hasNextVisible(renderItems, idx)"
        class="iimm-vtk-toolbar-separator"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, shallowReactive, watch } from 'vue'

import type { IViewerPlugin, IToolbarPlugin, ToolbarPluginGroup } from '@/plugins'
import type { PluginToolbarProps } from '@/types'

/** 组件属性 */

const props = withDefaults(defineProps<PluginToolbarProps>(), {
  hideWhenNoModel: false,
  localeVersion: 0
})

/** 渲染项：分组单元或单个插件 */
interface GroupRenderItem {
  type: 'group'
  key: string
  group: ToolbarPluginGroup
  plugins: IToolbarPlugin[]
}

interface SingleRenderItem {
  type: 'single'
  key: string
  plugin: IToolbarPlugin
}

/** 带可见性标记的渲染项 */
interface VisibleRenderItem {
  item: GroupRenderItem | SingleRenderItem
  hasVisible: boolean
}

/**
 * 获取所有工具栏插件（按注册顺序）
 *
 * 使用 shallowReactive 而非 ref([]) 的原因：
 * Vue 3.5 的 ref 包装数组时会调用 reactive() 深度代理数组元素，
 * 而插件实例中含有 ref 字段（如 monitoring = ref(false)），
 * 会被 deep proxy 触发"Refs Unwrapping in Reactive Objects"自动解包，
 * 导致 this.monitoring 变成 boolean 而非 Ref 对象，
 * 进而 this.monitoring.value = true 抛 TypeError。
 *
 * shallowReactive 只代理数组本身的 length/push 等操作，不深度代理 plugin 实例，
 * 因此 plugin 中的 ref 字段保持原样，工具栏交互正常。
 *
 * 通过 length = 0 + push() 增量更新而非整体赋值，避免触发深层 reactive 包装。
 */
const toolbarPlugins = shallowReactive<IToolbarPlugin[]>([])

// 监听 pluginsReady 变化，初始化/重建工具栏插件列表
watch(
  () => props.ctx?.plugins?.pluginsReady?.value === true && props.ctx?.plugins,
  ready => {
    // 始终先清空再填入，确保 plugin 引用变化时旧引用被正确移除
    toolbarPlugins.length = 0
    if (ready) {
      const all = props
        .ctx!.plugins.getAll()
        .filter((p: IViewerPlugin): p is IToolbarPlugin => p.metadata.type === 'toolbar')
      toolbarPlugins.push(...all)
    }
  },
  { immediate: true }
)

/**
 * 判断插件是否在当前上下文中可见
 */
function isPluginVisible(plugin: IToolbarPlugin): boolean {
  const viewCtx = props.ctx
  return (
    plugin.isVisible(viewCtx) && (!shouldHidePlugin(plugin) || viewCtx.scene.modelCount.value > 0)
  )
}

/**
 * 判断分组中是否有至少一个可见插件
 */
function hasGroupVisiblePlugins(plugins: IToolbarPlugin[]): boolean {
  return plugins.some(p => isPluginVisible(p))
}

/**
 * 构建渲染列表
 * - 读取每个插件的 config.group
 * - 同一分组的插件作为整体渲染，位置由该分组中首个出现的插件决定
 * - 未分组插件保持原有顺序
 * - 跳过全隐藏的分组和不可见的单个插件
 */
const renderItems = computed<VisibleRenderItem[]>(() => {
  const plugins = toolbarPlugins
  const result: VisibleRenderItem[] = []
  const processedGroups = new Set<ToolbarPluginGroup>()

  for (const plugin of plugins) {
    const group = plugin.getGroup?.()

    if (group) {
      // 已分组插件
      if (processedGroups.has(group)) {
        // 该分组已处理过，跳过（已在分组单元中渲染）
        continue
      }
      // 首次遇到该分组：收集所有同分组插件
      processedGroups.add(group)
      const groupPlugins = plugins.filter(p => p.getGroup?.() === group)
      const hasVisible = hasGroupVisiblePlugins(groupPlugins)
      if (!hasVisible) continue // 全隐藏的分组不加入渲染列表
      result.push({
        item: {
          type: 'group',
          key: `group-${group}`,
          group,
          plugins: groupPlugins
        },
        hasVisible: true
      })
    } else {
      // 未分组插件：保持原序
      const visible = isPluginVisible(plugin)
      result.push({
        item: {
          type: 'single',
          key: plugin.metadata.id,
          plugin
        },
        hasVisible: visible
      })
    }
  }

  return result
})

/**
 * 插件渲染组件缓存（避免每次 computed 重新计算时调用 render() 创建新组件）
 */
const renderCache = new Map<string, ReturnType<IToolbarPlugin['render']>>()

// locale 变更时清空 renderCache，使所有插件重新 render() 获取翻译后的字符串
watch(
  () => props.localeVersion,
  () => {
    renderCache.clear()
  }
)

/**
 * 获取插件渲染组件（带缓存和错误边界）
 */
function getPluginComponent(plugin: IToolbarPlugin) {
  const id = plugin.metadata.id
  if (!renderCache.has(id)) {
    try {
      renderCache.set(id, plugin.render())
    } catch (err) {
      console.error(`[PluginToolbar] Plugin "${id}" render() failed:`, err)
      // 返回一个空的占位组件，避免整个工具栏崩溃
      renderCache.set(id, defineComponent({ setup: () => () => h('span') }))
    }
  }
  return renderCache.get(id)!
}

/**
 * 判断是否应在无模型时隐藏该插件
 * 全局 hideWhenNoModel 或插件自身 hideWhenNoModel 任一为 true 即隐藏
 */
function shouldHidePlugin(plugin: IToolbarPlugin): boolean {
  return plugin.getHideWhenNoModel?.() ?? false
}

/**
 * 判断 renderItems 中 idx 之后是否存在有可见内容的项（用于分隔符逻辑）
 */
function hasNextVisible(items: VisibleRenderItem[], idx: number): boolean {
  for (let i = idx + 1; i < items.length; i++) {
    if (items[i].hasVisible) return true
  }
  return false
}

/** 工具栏类名 */
const toolbarClasses = computed(() => {
  const classes: string[] = []
  if (props.class) {
    if (Array.isArray(props.class)) {
      classes.push(...props.class)
    } else {
      classes.push(props.class)
    }
  }
  return classes
})
</script>

<!-- 样式由全局 SCSS 系统提供 -->
<style src="@/styles/index.scss" lang="scss"></style>
