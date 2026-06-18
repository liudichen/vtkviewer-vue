<!--
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-01 08:40:30
 * @LastEditTime: 2026-06-13 21:00:03
 * @Description: 
-->
<script setup lang="ts">
/**
 * UI插件渲染容器
 * 使用 Teleport 将 UI 插件渲染到 VtkViewer 内部的指定区域
 */
import { computed, inject } from 'vue'

import type { IUIPlugin } from '@/plugins/types'
import { viewerContextKey } from '@/plugins/injectionKeys'

const props = defineProps<{
  plugins: IUIPlugin[]
  type: 'overlay' | 'panel' | 'notification'
}>()

const viewerContext = inject(viewerContextKey)

const visiblePlugins = computed(() => {
  return props.plugins
    .filter(p => {
      if (typeof p.isVisible === 'function' && viewerContext) {
        return p.isVisible(viewerContext)
      }
      return true
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
})

const positionClass = computed(() => {
  return `iimm-vtk-portal-${props.type}`
})
</script>

<template>
  <div :class="['iimm-vtk-portal', positionClass]">
    <template v-for="plugin in visiblePlugins" :key="plugin.metadata.id">
      <component :is="plugin.render()" />
    </template>
  </div>
</template>

<style src="@/styles/index.scss" lang="scss" />
