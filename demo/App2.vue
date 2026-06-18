<!--
  App2.vue
  VtkViewer 组件演示（内部创建 ctx 模式）
-->
<script setup lang="ts">
import { VtkViewer } from '../src'
</script>

<template>
  <div class="app2">
    <header class="app2-header">
      <h1>VtkViewer 组件演示</h1>
    </header>

    <main class="app2-viewer">
      <VtkViewer class="viewer-instance" theme="light" :enable-keyboard="false" />
    </main>
  </div>
</template>

<style scoped>
.app2 {
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #1a1a2e;
  color: #e0e0e0;
}

.app2-header {
  flex-shrink: 0;
  padding: 16px 24px;
  background: linear-gradient(135deg, #16213e 0%, #0f3460 100%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.app2-header h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 600;
  color: #fff;
}

.app2-viewer {
  flex: 1;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: hidden;
}

.viewer-instance {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}
</style>
