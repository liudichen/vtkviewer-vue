<!--
  ToolbarExtension.vue
  工具栏扩展区组件
  动态展示特定工具栏功能激活时的额外 UI 控件
  支持平滑展开/收起动画
-->

<template>
  <div
    class="iimm-vtk-extension"
    :class="extensionClasses"
    :style="extensionStyle"
    v-show="hasActiveExtension"
  >
    <!--
      遍历所有注册扩展（而非仅活跃扩展），使用 v-show 控制可见性。
      这样扩展组件实例常驻 DOM，停用/重新激活时无需重建组件实例，
      避免测量标注、裁剪面板等扩展的内部状态丢失和重建开销。
    -->
    <template v-for="(item, idx) in extensionItems" :key="item.ext.id">
      <!-- 分隔线：仅在连续两个活跃扩展之间显示 -->
      <div v-if="item.showSeparator" class="iimm-vtk-extension-separator" />
      <!-- 扩展内容：始终在 DOM 中，通过 v-show 切换可见 -->
      <div class="iimm-vtk-extension-item" v-show="item.ext.active">
        <component :is="item.ext.component" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ToolbarExtensionItem } from '@/core'
import type { ToolbarExtensionProps } from '@/types'

/** 组件属性 */

const props = withDefaults(defineProps<ToolbarExtensionProps>(), {
  borderRadius: 8,
  padding: '4px 8px',
  gap: 2
})

/**
 * 扩展渲染项：包含扩展对象和是否显示前导分隔线
 */
interface ExtensionRenderItem {
  ext: ToolbarExtensionItem
  showSeparator: boolean
}

/**
 * 获取所有扩展区（响应式），含分隔线逻辑
 *
 * 所有扩展始终在 DOM 中（通过 v-show 控制可见性），
 * 避免扩展组件实例在停用/重新激活时被销毁和重建。
 * 分隔线仅在连续两个活跃扩展之间显示。
 */
const extensionItems = computed<ExtensionRenderItem[]>(() => {
  const allExts = props.ctx.toolbarExtension.extensions.value
  const result: ExtensionRenderItem[] = []
  let previousActive = false

  for (const ext of allExts) {
    const isActive = ext.active
    // 当前扩展活跃且前一个也活跃时，在当前项前显示分隔线
    const showSeparator = isActive && previousActive
    result.push({ ext, showSeparator })
    previousActive = isActive
  }

  return result
})

/** 是否有任意扩展活跃（用于控制容器本身的显隐） */
const hasActiveExtension = computed(() => {
  return props.ctx.toolbarExtension.extensions.value.some(ext => ext.active)
})

/** 扩展区样式 */
const extensionStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.background) style['--iimm-vtk-extension-bg'] = props.background
  if (props.borderRadius !== undefined)
    style['--iimm-vtk-extension-radius'] = `${props.borderRadius}px`
  if (props.padding) style['--iimm-vtk-extension-padding'] = props.padding
  if (props.separatorColor) style['--iimm-vtk-extension-separator-color'] = props.separatorColor
  if (props.gap !== undefined) style['--iimm-vtk-extension-gap'] = `${props.gap}px`
  return style
})

/** 扩展区类名 */
const extensionClasses = computed(() => {
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
<style src="../styles/index.scss" lang="scss"></style>
