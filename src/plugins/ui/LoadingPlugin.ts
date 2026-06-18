/**
 * 加载进度插件
 * 显示文件加载进度（现代化 UI）
 */

import { defineComponent, h, inject } from 'vue'

import { i18n } from '@/core'
import { type IUIPlugin, type PluginConfig, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { stateManagerKey } from '@/plugins/injectionKeys'

/** 加载进度插件配置 */
export interface LoadingPluginConfig extends PluginConfig {
  /** 是否显示进度条 */
  showProgress?: boolean
}

/** 加载阶段键映射 */
const STAGE_LABELS: Record<string, string> = {
  idle: 'vtkviewer.plugin.loading.stage.idle',
  downloading: 'vtkviewer.plugin.loading.stage.downloading',
  reading: 'vtkviewer.plugin.loading.stage.reading',
  parsing: 'vtkviewer.plugin.loading.stage.parsing',
  rendering: 'vtkviewer.plugin.loading.stage.rendering',
  complete: 'vtkviewer.plugin.loading.stage.complete'
}

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @returns 可读的文件大小字符串（如 "45.2 MB"）
 */
function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** SVG 圆环参数 */
const RING_RADIUS = 42
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

/**
 * 加载进度插件
 * 显示文件加载进度（现代化玻璃态卡片 + 环形进度条）
 */
export class LoadingPlugin extends PluginBase<LoadingPluginConfig> implements IUIPlugin {
  readonly metadata = {
    id: 'loading',
    name: 'LoadingPlugin',
    type: PluginType.UI,
    description: i18n.translate('vtkviewer.plugin.loading.description')
  }
  readonly uiType = 'overlay' as const
  readonly order = 0
  readonly defaultConfig: LoadingPluginConfig = { enabled: true, showProgress: true }

  render() {
    const self = this
    return defineComponent({
      setup() {
        const stateManager = inject(stateManagerKey)!

        return () => {
          const { isLoading, progress, stage, fileSize } = stateManager.core.loading

          if (!isLoading) return null

          const stageLabel = i18n.translate(
            STAGE_LABELS[stage] || 'vtkviewer.plugin.loading.stage.unknown'
          )
          const dashOffset = RING_CIRCUMFERENCE * (1 - progress / 100)
          // 解析/渲染阶段是CPU密集同步操作，JS被阻塞，用CSS动画提供视觉反馈
          const isBusy = stage === 'parsing' || stage === 'rendering'
          const fileSizeStr = formatFileSize(fileSize)

          return h(
            'div',
            {
              class: ['iimm-vtk-overlay', 'iimm-vtk-loading', { 'iimm-vtk-loading--busy': isBusy }]
            },
            [
              h('div', { class: 'iimm-vtk-loading-card' }, [
                // —— 环形进度 ——
                h('div', { class: 'iimm-vtk-loading-ring-wrapper' }, [
                  // 外层旋转装饰环
                  h('div', { class: 'iimm-vtk-loading-ring-orbit' }),
                  h(
                    'svg',
                    {
                      class: 'iimm-vtk-loading-ring',
                      viewBox: '0 0 100 100'
                    },
                    [
                      h('defs', null, [
                        h(
                          'linearGradient',
                          { id: 'iimm-vtk-ld-grad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
                          [
                            h('stop', { offset: '0%', 'stop-color': '#60a5fa' }),
                            h('stop', { offset: '100%', 'stop-color': '#34d399' })
                          ]
                        )
                      ]),
                      // 背景轨道
                      h('circle', {
                        class: 'iimm-vtk-loading-ring-bg',
                        cx: '50',
                        cy: '50',
                        r: String(RING_RADIUS),
                        fill: 'none',
                        'stroke-width': '5'
                      }),
                      // 进度弧
                      h('circle', {
                        class: 'iimm-vtk-loading-ring-fg',
                        cx: '50',
                        cy: '50',
                        r: String(RING_RADIUS),
                        fill: 'none',
                        'stroke-width': '5',
                        'stroke-linecap': 'round',
                        'stroke-dasharray': RING_CIRCUMFERENCE,
                        'stroke-dashoffset': dashOffset,
                        stroke: 'url(#iimm-vtk-ld-grad)'
                      })
                    ]
                  ),
                  // 中心加载图标（非数字进度）
                  h('div', { class: 'iimm-vtk-loading-center' }, [
                    h('div', { class: 'iimm-vtk-loading-spinner' })
                  ])
                ]),

                // —— 阶段标签 ——
                h('div', { class: 'iimm-vtk-loading-stage' }, [
                  h('span', { class: 'iimm-vtk-loading-stage-label' }, stageLabel),
                  h('span', { class: 'iimm-vtk-loading-dots' }, [
                    h('span', null, '.'),
                    h('span', null, '.'),
                    h('span', null, '.')
                  ])
                ]),

                // —— 文件大小信息 ——
                fileSizeStr &&
                  h('div', { class: 'iimm-vtk-loading-info' }, [
                    h(
                      'span',
                      { class: 'iimm-vtk-loading-info-text' },
                      `${i18n.translate('vtkviewer.plugin.loading.fileSize')}${fileSizeStr}`
                    )
                  ]),

                // —— 不确定进度条（解析阶段使用纯CSS动画，运行在合成线程不受JS阻塞影响） ——
                self.config.showProgress &&
                  h('div', { class: 'iimm-vtk-loading-bar' }, [
                    h('div', {
                      class: [
                        'iimm-vtk-loading-bar-fill',
                        { 'iimm-vtk-loading-bar--indeterminate': isBusy }
                      ],
                      style: isBusy ? {} : { width: `${progress}%` }
                    })
                  ])
              ])
            ]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return this.ctx?.stateManager?.core?.loading?.isLoading ?? false
  }

  getPosition(): 'center' {
    return 'center'
  }
}
