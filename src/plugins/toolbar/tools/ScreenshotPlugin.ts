/**
 * 截图 / 导出高分辨率插件
 * 支持倍率（1x/2x/4x）、透明背景、PNG/JPEG/WEBP 格式
 * 以下拉弹窗形式展示在工具栏按钮下方
 */

import { defineComponent, h, ref, type Component } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinCommands } from '@/configs'
import { ScreenshotIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createDropdownAlignment,
  getDropdownAlignStyle,
  renderToolbarIcon,
  normalizeShortcutConfig
} from '@/plugins/toolbar/utils'

// ============================================================
// 类型定义
// ============================================================

/** 截图倍率 */
export type ScreenshotMultiplier = 1 | 2 | 4

/** 截图格式 */
export type ScreenshotFormat = 'png' | 'jpeg' | 'webp'

/** 截图插件配置 */
export interface ScreenshotPluginConfig extends ToolbarPluginConfig {
  /** 默认截图格式，默认 'png' */
  defaultFormat?: ScreenshotFormat
  /** 默认图片质量 (0-1)，默认 1.0 */
  defaultQuality?: number
  /** 默认倍率，默认 1 */
  defaultMultiplier?: ScreenshotMultiplier
  /** 默认透明背景，默认 false */
  defaultTransparentBg?: boolean
}

// ============================================================
// 插件实现
// ============================================================

export class ScreenshotPlugin
  extends PluginBase<ScreenshotPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'screenshot',
    name: 'ScreenshotPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.screenshot.description')
  }

  readonly order = 0
  readonly defaultConfig: ScreenshotPluginConfig = {
    enabled: true,
    // shortcut: 'P',
    defaultFormat: 'png',
    defaultQuality: 1.0,
    defaultMultiplier: 1,
    defaultTransparentBg: false,
    icon: ScreenshotIcon,
    hideWhenNoModel: true
  }

  // ============================================================
  // 响应式状态
  // ============================================================

  /** 是否显示下拉弹窗 */
  private isDropdownOpen = ref(false)

  /** 下拉弹窗对齐管理器（运行时自动根据按钮位置判断向左/向右展开） */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-screenshot')

  /** 截图倍率 */
  private multiplier = ref<ScreenshotMultiplier>(1)

  /** 截图格式 */
  private format = ref<ScreenshotFormat>('png')

  /** 图片质量 (0-1) */
  private quality = ref(1.0)

  /** 是否透明背景 */
  private transparentBg = ref(false)

  /** 导出状态：'idle' | 'exporting' | 'done' | 'error' */
  private exportStatus = ref<'idle' | 'exporting' | 'done' | 'error'>('idle')

  /** 状态提示信息 */
  private statusText = ref('')

  // ============================================================
  // 生命周期
  // ============================================================

  protected onInit(): void {
    // 从配置初始化
    this.multiplier.value = this.config.defaultMultiplier ?? 1
    this.format.value = this.config.defaultFormat ?? 'png'
    this.quality.value = this.config.defaultQuality ?? 1.0
    this.transparentBg.value = this.config.defaultTransparentBg ?? false

    // 监听点击外部关闭弹窗
    this.setupOutsideClickListener(this.handleOutsideClick, true)
  }

  protected onDispose(): void {
    this.isDropdownOpen.value = false
    this.exportStatus.value = 'idle'
    this.statusText.value = ''
  }

  /** 处理点击外部关闭弹窗 */
  private handleOutsideClick = (e: MouseEvent) => {
    if (!this.isDropdownOpen.value) return
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-screenshot')) {
      this.isDropdownOpen.value = false
    }
  }

  // ============================================================
  // 截图导出
  // ============================================================

  /**
   * 执行截图并下载
   */
  private async captureAndDownload(): Promise<void> {
    try {
      this.exportStatus.value = 'exporting'
      this.statusText.value = i18n.translate('vtkviewer.plugin.screenshot.capturing')

      const options = {
        format: this.format.value,
        quality: this.quality.value,
        multiplier: this.multiplier.value,
        transparentBackground: this.transparentBg.value
      }

      const blob = await this.ctx.commands.execute<Blob>(
        BuiltinCommands.CAPTURE_SCREENSHOT,
        options
      )
      if (blob && blob.size > 0) {
        // 生成文件名
        const multiplierLabel = this.multiplier.value > 1 ? `@${this.multiplier.value}x` : ''
        const timestamp = Date.now()
        const filename = `vtk-screenshot-${timestamp}${multiplierLabel}.${this.format.value}`

        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        a.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)

        const sizeKB = (blob.size / 1024).toFixed(1)
        this.exportStatus.value = 'done'
        this.statusText.value = `${i18n.translate('vtkviewer.plugin.screenshot.saved')} ${filename} (${sizeKB}KB)`
        setTimeout(() => {
          this.exportStatus.value = 'idle'
          this.statusText.value = ''
          this.isDropdownOpen.value = false
        }, 2000)
      } else {
        throw new Error(i18n.translate('vtkviewer.plugin.screenshot.errorEmpty'))
      }
    } catch (err) {
      console.error(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.screenshot.failedToCapture')}:`,
        err
      )
      this.exportStatus.value = 'error'
      this.statusText.value = i18n.translate('vtkviewer.plugin.screenshot.errorFailed')
      setTimeout(() => {
        this.exportStatus.value = 'idle'
        this.statusText.value = ''
      }, 3000)
    }
  }

  // ============================================================
  // 重置接口
  // ============================================================

  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetScreenshot',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.screenshot.resetDesc'),
        execute: () => {
          this.isDropdownOpen.value = false
          this.multiplier.value = this.config.defaultMultiplier ?? 1
          this.format.value = this.config.defaultFormat ?? 'png'
          this.quality.value = this.config.defaultQuality ?? 1.0
          this.transparentBg.value = this.config.defaultTransparentBg ?? false
          this.exportStatus.value = 'idle'
          this.statusText.value = ''
        }
      }
    ]
  }

  // ============================================================
  // 渲染 - 工具栏按钮 + 下拉弹窗
  // ============================================================

  render(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const isOpen = self.isDropdownOpen.value
          const status = self.exportStatus.value

          // ---------- 按钮 ----------
          const button = h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': isOpen }],
              title: isOpen
                ? i18n.translate('vtkviewer.plugin.screenshot.tooltipClose')
                : i18n.translate('vtkviewer.plugin.screenshot.tooltip'),
              onClick: (e: Event) => {
                e.stopPropagation()
                self.isDropdownOpen.value = !self.isDropdownOpen.value
                if (self.isDropdownOpen.value) {
                  self.dropdownAlignment.update()
                }
              }
            },
            renderToolbarIcon(self.config.icon)
          )

          // ---------- 下拉弹窗 ----------
          let dropdown: any = null
          if (isOpen) {
            const panelChildren: any[] = []

            // ---- 标题行 ----
            panelChildren.push(
              h('div', { class: 'iimm-vtk-popup-header' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-popup-title' },
                  i18n.translate('vtkviewer.plugin.screenshot.title')
                )
              ])
            )

            // ---- 倍率选择 ----
            const multiplierOptions: { value: ScreenshotMultiplier; label: string }[] = [
              { value: 1, label: i18n.translate('vtkviewer.plugin.screenshot.multiplier.1x') },
              { value: 2, label: i18n.translate('vtkviewer.plugin.screenshot.multiplier.2x') },
              { value: 4, label: i18n.translate('vtkviewer.plugin.screenshot.multiplier.4x') }
            ]

            panelChildren.push(
              h('div', { class: 'iimm-vtk-screenshot-section' }, [
                h(
                  'div',
                  { class: 'iimm-vtk-screenshot-label' },
                  i18n.translate('vtkviewer.plugin.screenshot.resolution')
                ),
                h('div', { class: 'iimm-vtk-screenshot-options' }, [
                  ...multiplierOptions.map(opt =>
                    h(
                      'button',
                      {
                        class: [
                          'iimm-vtk-screenshot-opt-btn',
                          {
                            'is-selected': self.multiplier.value === opt.value
                          }
                        ],
                        onClick: () => {
                          self.multiplier.value = opt.value
                        }
                      },
                      opt.label
                    )
                  )
                ])
              ])
            )

            // ---- 格式选择 ----
            const formatOptions: { value: ScreenshotFormat; label: string }[] = [
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPEG' },
              { value: 'webp', label: 'WEBP' }
            ]

            panelChildren.push(
              h('div', { class: 'iimm-vtk-screenshot-section' }, [
                h(
                  'div',
                  { class: 'iimm-vtk-screenshot-label' },
                  i18n.translate('vtkviewer.plugin.screenshot.format')
                ),
                h('div', { class: 'iimm-vtk-screenshot-options' }, [
                  ...formatOptions.map(opt =>
                    h(
                      'button',
                      {
                        class: [
                          'iimm-vtk-screenshot-opt-btn',
                          {
                            'is-selected': self.format.value === opt.value
                          }
                        ],
                        onClick: () => {
                          self.format.value = opt.value
                        }
                      },
                      opt.label
                    )
                  )
                ])
              ])
            )

            // ---- 质量滑块（仅 JPEG/WEBP） ----
            if (self.format.value === 'jpeg' || self.format.value === 'webp') {
              panelChildren.push(
                h('div', { class: 'iimm-vtk-screenshot-section' }, [
                  h('div', { class: 'iimm-vtk-screenshot-label' }, [
                    h('span', null, i18n.translate('vtkviewer.plugin.screenshot.labelQuality')),
                    h(
                      'span',
                      { class: 'iimm-vtk-screenshot-value' },
                      `${Math.round(self.quality.value * 100)}%`
                    )
                  ]),
                  h('input', {
                    class: 'iimm-vtk-screenshot-slider',
                    type: 'range',
                    min: 0.1,
                    max: 1.0,
                    step: 0.1,
                    value: self.quality.value,
                    onInput: (e: Event) => {
                      self.quality.value = parseFloat((e.target as HTMLInputElement).value)
                    }
                  })
                ])
              )
            }

            // ---- 透明背景开关 ----
            panelChildren.push(
              h('div', { class: 'iimm-vtk-screenshot-section iimm-vtk-screenshot-toggle-row' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-screenshot-label' },
                  i18n.translate('vtkviewer.plugin.screenshot.transparent')
                ),
                h('label', { class: 'iimm-vtk-screenshot-switch' }, [
                  h('input', {
                    type: 'checkbox',
                    checked: self.transparentBg.value,
                    onChange: (e: Event) => {
                      self.transparentBg.value = (e.target as HTMLInputElement).checked
                    }
                  }),
                  h('span', { class: 'iimm-vtk-screenshot-slider-round' })
                ])
              ])
            )

            // ---- 分隔线 ----
            panelChildren.push(h('div', { class: 'iimm-vtk-screenshot-divider' }))

            // ---- 导出按钮 ----
            const isExporting = status === 'exporting'
            const btnLabel = isExporting
              ? i18n.translate('vtkviewer.plugin.screenshot.btnExporting')
              : i18n.translate('vtkviewer.plugin.screenshot.btnExport')
            panelChildren.push(
              h(
                'button',
                {
                  class: [
                    'iimm-vtk-screenshot-export-btn',
                    {
                      'is-loading': isExporting,
                      'is-done': status === 'done',
                      'is-error': status === 'error'
                    }
                  ],
                  disabled: isExporting,
                  onClick: () => self.captureAndDownload()
                },
                btnLabel
              )
            )

            // ---- 状态提示 ----
            if (self.statusText.value) {
              const statusClass =
                status === 'done' ? 'is-success' : status === 'error' ? 'is-error' : 'is-info'
              panelChildren.push(
                h(
                  'div',
                  {
                    class: ['iimm-vtk-screenshot-toast', statusClass]
                  },
                  self.statusText.value
                )
              )
            }

            dropdown = h(
              'div',
              {
                class: 'iimm-vtk-screenshot-dropdown',
                style: getDropdownAlignStyle(self.dropdownAlignment.align.value)
              },
              panelChildren
            )
          }

          // ---------- 整体容器 ----------
          return h(
            'div',
            {
              class: 'iimm-vtk-toolbar-item iimm-vtk-screenshot'
            },
            [button, dropdown].filter(Boolean)
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  // ============================================================
  // 快捷键
  // ============================================================

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'screenshot',
      i18n.translate('vtkviewer.plugin.screenshot.shortcutDesc')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => {
        // 快捷键直接使用当前配置截图（不打开弹窗）
        this.captureAndDownload()
      },
      description: s.description
    }))
  }
}
