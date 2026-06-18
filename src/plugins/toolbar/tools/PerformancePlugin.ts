/**
 * 性能监控插件
 * 工具栏开关项，开启后在infoPanel中显示当前内存使用量、FPS、渲染时间等信息
 */

import { defineComponent, h, ref, markRaw } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { PerformanceIcon } from '@/icons'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon } from '@/plugins/toolbar/utils'

/** 性能监控插件配置 */
export interface PerformancePluginConfig extends ToolbarPluginConfig {
  /** 是否显示FPS */
  showFPS?: boolean
  /** 是否显示内存使用量 */
  showMemory?: boolean
  /** 是否显示渲染时间 */
  showRenderTime?: boolean
  /** 是否显示三角形数 */
  showTriangleCount?: boolean
  /** 内存刷新间隔（ms） */
  memoryRefreshInterval?: number
}

export class PerformancePlugin
  extends PluginBase<PerformancePluginConfig>
  implements IToolbarPlugin
{
  readonly metadata = {
    id: 'performance',
    name: 'PerformancePlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.performance.description')
  }

  readonly order = 0
  readonly defaultConfig: PerformancePluginConfig = {
    enabled: true,
    defaultActive: true,
    showFPS: false,
    showMemory: true,
    showRenderTime: false,
    showTriangleCount: false,
    memoryRefreshInterval: 2000,
    icon: PerformanceIcon,
    hideWhenNoModel: false
  }

  /** 是否启用监控（响应式） */
  private monitoring = ref(false)
  /** 性能数据 */
  private fps = ref(0)
  private renderTime = ref(0)
  private triangleCount = ref(0)
  private memoryUsed = ref(0)
  private memoryTotal = ref(0)
  private memoryLimit = ref(0)
  private memoryPercent = ref(0)

  private memoryTimer: ReturnType<typeof setInterval> | null = null

  protected onInit(): void {
    if (this.getConfig('defaultActive')) {
      this.enableMonitoring()
    }
    this.onEvent(BuiltinEvents.PERFORMANCE_UPDATE, (data: any) => this.onPerformanceUpdate(data))

    // 注册信息面板
    this.registerInfoPanel()

    // 监听模型数量变化
    // const unwatchModelCount = watch(() => this.ctx.scene.modelCount.value, (count: number) => {
    //   if (count === 0) {
    //     this.disableMonitoring()
    //   }
    // })
    // this.ctx.disposal.register(unwatchModelCount)
  }

  protected onDispose(): void {
    this.disableMonitoring()
  }
  private enableMonitoring(): void {
    this.monitoring.value = true

    // 启动内存监控定时器
    if (this.config.showMemory !== false) {
      this.updateMemoryInfo()
      this.memoryTimer = setInterval(() => {
        this.updateMemoryInfo()
      }, this.config.memoryRefreshInterval ?? 2000)
    }
  }

  /** 禁用监控 */
  private disableMonitoring(): void {
    this.monitoring.value = false
    if (this.memoryTimer) {
      clearInterval(this.memoryTimer)
      this.memoryTimer = null
    }
  }

  /** 切换监控状态 */
  private toggleMonitoring(): void {
    if (this.monitoring.value) {
      this.disableMonitoring()
    } else {
      this.enableMonitoring()
    }
  }

  private onPerformanceUpdate(data: {
    fps: number
    renderTime: number
    triangleCount: number
  }): void {
    if (!this.monitoring.value) return
    this.fps.value = data.fps
    this.renderTime.value = data.renderTime
    this.triangleCount.value = data.triangleCount
  }

  /** 更新内存信息 */
  private updateMemoryInfo(): void {
    if (typeof performance === 'undefined' || !(performance as any).memory) {
      // performance.memory 仅在 Chrome/Edge 中可用
      this.memoryUsed.value = 0
      this.memoryTotal.value = 0
      this.memoryLimit.value = 0
      this.memoryPercent.value = 0
      return
    }

    const memory = (performance as any).memory
    this.memoryUsed.value = memory.usedJSHeapSize
    this.memoryTotal.value = memory.totalJSHeapSize
    this.memoryLimit.value = memory.jsHeapSizeLimit
    this.memoryPercent.value =
      memory.jsHeapSizeLimit > 0
        ? Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
        : 0
  }

  /** 格式化内存大小 */
  private formatMemory(bytes: number): string {
    if (bytes === 0) return 'N/A'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  /** 注册信息面板 */
  private registerInfoPanel(): void {
    const self = this
    const infoComponent = defineComponent({
      setup() {
        return () => {
          if (!self.monitoring.value) return null

          const items: any[] = []

          // FPS
          if (self.config.showFPS !== false) {
            items.push(
              h('span', { key: 'fps' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.performance.label.fps') + ': '
                ),
                h('span', { class: 'iimm-vtk-info-value' }, `${self.fps.value} `)
              ])
            )
          }

          // 渲染时间
          if (self.config.showRenderTime !== false) {
            items.push(
              h('span', { key: 'renderTime' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.performance.label.renderTime') + ': '
                ),
                h(
                  'span',
                  { class: 'iimm-vtk-info-value' },
                  `${self.renderTime.value.toFixed(1)}ms `
                )
              ])
            )
          }

          // 三角形数
          if (self.config.showTriangleCount !== false) {
            items.push(
              h('span', { key: 'triangles' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.performance.label.triangles') + ': '
                ),
                h(
                  'span',
                  { class: 'iimm-vtk-info-value' },
                  `${(self.triangleCount.value / 1000).toFixed(1)}K △ `
                )
              ])
            )
          }

          // 内存使用量
          if (self.config.showMemory !== false && self.memoryUsed.value > 0) {
            items.push(
              h('span', { key: 'memory' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-info-label' },
                  i18n.translate('vtkviewer.plugin.performance.label.memory') + ': '
                ),
                h(
                  'span',
                  { class: 'iimm-vtk-info-value' },
                  self.formatMemory(self.memoryUsed.value)
                ),
                h('span', { class: 'iimm-vtk-info-label' }, `(${self.memoryPercent.value}%)`)
              ])
            )
          }

          if (items.length === 0) return null
          return items
        }
      }
    })

    this.registerInfoPanelItem({
      component: markRaw(infoComponent),
      priority: self.config.infoPanelPriority ?? 0,
      visibleCheck: () => self.monitoring.value
    })
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () =>
          h('div', { class: 'iimm-vtk-toolbar-item' }, [
            h(
              'button',
              {
                class: ['iimm-vtk-toolbar-btn', { 'is-active': self.monitoring.value }],
                title: self.monitoring.value
                  ? i18n.translate('vtkviewer.plugin.performance.tooltipDisable')
                  : i18n.translate('vtkviewer.plugin.performance.tooltipEnable'),
                onClick: () => self.toggleMonitoring()
              },
              renderToolbarIcon(self.config.icon) ?? ''
            )
          ])
      }
    })
  }

  isVisible(): boolean {
    return true
  }
}
