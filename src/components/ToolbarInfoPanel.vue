<!--
  ToolbarInfoPanel.vue
  工具栏信息面板组件
  渲染工具栏插件推送的信息项，支持多插件并发显示
  自动布局与溢出处理
-->

<template>
  <div class="iimm-vtk-info-panel" :class="panelClasses" :style="panelStyle">
    <template v-for="item in visibleItems" :key="item.id">
      <div class="iimm-vtk-info-item" :data-info-id="item.id">
        <component :is="item.component" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import type { ToolbarInfoItem } from '@/core'
import type { ToolbarInfoPanelProps } from '@/types'

/** 组件属性 */

const props = withDefaults(defineProps<ToolbarInfoPanelProps>(), {
  borderRadius: 8,
  padding: '4px 8px',
  fontSize: 12,
  maxHeight: 120
})

/** 获取注册表中的信息项（响应式） */
const allItems = computed<ToolbarInfoItem[]>(() => {
  // 直接访问 items ref 的值，确保响应式追踪
  const itemsRef = props.ctx.infoPanel.items
  return itemsRef.value ?? []
})

/** 过滤可见项 */
const visibleItems = computed<ToolbarInfoItem[]>(() => {
  const items = allItems.value
  return items.filter(item => {
    // 如果有 visibleCheck 回调，调用它检查可见性
    if (item.visibleCheck) {
      return item.visibleCheck()
    }
    // 默认可见
    return true
  })
})

/** 面板样式 */
const panelStyle = computed(() => {
  const style: Record<string, string> = {}
  if (props.background) style['--iimm-vtk-info-panel-bg'] = props.background
  if (props.borderRadius !== undefined)
    style['--iimm-vtk-info-panel-radius'] = `${props.borderRadius}px`
  if (props.padding) style['--iimm-vtk-info-panel-padding'] = props.padding
  if (props.fontSize !== undefined) style['--iimm-vtk-info-panel-font-size'] = `${props.fontSize}px`
  if (props.maxHeight !== undefined)
    style['--iimm-vtk-info-panel-max-height'] = `${props.maxHeight}px`
  return style
})

/** 面板类名 */
const panelClasses = computed(() => {
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

<style src="../styles/index.scss" lang="scss" />
