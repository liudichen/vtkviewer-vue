/**
 * 手动装载模型插件
 * 支持本地文件选择和远程URL加载
 * 自动检测并兼容所有已注册format插件支持的模型格式
 *
 * @module plugins/toolbar/core/LoadModelPlugin
 */

import { defineComponent, h, ref, type Component } from 'vue'

import { i18n, FormatDetector } from '@/core'
import { BuiltinEvents } from '@/configs'
import { unloadAllModels, yieldToBrowser } from '@/utils'
import { LoadModelIcon } from '@/icons'
import {
  type IFormatPlugin,
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createDropdownAlignment,
  getDropdownAlignStyle,
  renderToolbarIcon
} from '@/plugins/toolbar/utils'

/** 加载模型插件配置 */
export interface LoadModelPluginConfig extends ToolbarPluginConfig {}

export class LoadModelPlugin extends PluginBase<LoadModelPluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'loadModel',
    name: 'LoadModelPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.loadModel.description')
  }

  /** 在核心组中靠前排列 */
  readonly order = 0
  readonly defaultConfig: LoadModelPluginConfig = {
    enabled: true,
    icon: LoadModelIcon,
    group: 'source'
  }

  // ============================================================
  // 响应式状态
  // ============================================================

  /** 是否显示下拉弹窗 */
  private isDropdownOpen = ref(false)

  /** 当前tab：'local'（本地文件）或 'remote'（远程URL） */
  private tab = ref<'local' | 'remote'>('local')

  /** URL输入框内容 */
  private urlInput = ref('')

  /** 是否正在加载 */
  private isLoading = ref(false)

  /** 状态提示文本 */
  private statusText = ref('')

  /** 状态提示类型 */
  private statusType = ref<'info' | 'success' | 'error'>('info')

  /** 下拉弹窗对齐管理器（运行时自动根据按钮位置判断向左/向右展开） */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-load-model')

  /** 隐藏的文件选择input元素 */
  private fileInput: HTMLInputElement | null = null

  // ============================================================
  // 生命周期
  // ============================================================

  protected onInit(): void {
    // 创建隐藏的file input（用于本地文件选择）
    if (typeof document !== 'undefined') {
      this.fileInput = document.createElement('input')
      this.fileInput.type = 'file'
      this.fileInput.style.display = 'none'
      this.fileInput.addEventListener('change', this.handleFileSelect)

      // 动态构建accept属性，兼容所有已安装的format插件
      const supportedFormats = this.getSupportedFormats()
      this.fileInput.accept = this.buildAcceptString(supportedFormats)

      document.body.appendChild(this.fileInput)
    }

    // 点击外部关闭弹窗
    this.setupOutsideClickListener(this.handleOutsideClick, true)

    // 场景清除时关闭弹窗
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => {
      this.isDropdownOpen.value = false
    })
  }

  protected onDispose(): void {
    this.isDropdownOpen.value = false
    this.isLoading.value = false
    this.statusText.value = ''

    // 清理隐藏的file input
    if (this.fileInput) {
      this.fileInput.removeEventListener('change', this.handleFileSelect)
      this.fileInput.remove()
      this.fileInput = null
    }
  }

  // ============================================================
  // 事件处理
  // ============================================================

  /** 点击外部时关闭下拉 */
  private handleOutsideClick = (e: MouseEvent) => {
    if (!this.isDropdownOpen.value) return
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-load-model')) {
      this.isDropdownOpen.value = false
    }
  }

  /** 打开文件选择对话框 */
  private openFileDialog = () => {
    this.fileInput?.click()
  }

  /** 文件选择回调 */
  private handleFileSelect = async (e: Event) => {
    const input = e.target as HTMLInputElement
    const file = input.files?.[0]
    if (!file) return

    // 清空input值，允许重复选择同一文件
    input.value = ''

    await this.loadLocalFile(file)
  }

  // ============================================================
  // 加载逻辑
  // ============================================================

  /**
   * 加载本地文件
   * @param file 用户选择的File对象
   */
  private async loadLocalFile(file: File): Promise<void> {
    try {
      this.isLoading.value = true
      this.statusText.value = i18n.translate('vtkviewer.plugin.loadModel.reading')
      this.statusType.value = 'info'

      // 立即通知 LoadingPlugin 开始加载
      this.ctx.stateManager.setLoading({
        isLoading: true,
        progress: 5,
        stage: 'reading',
        fileSize: file.size
      })
      await yieldToBrowser()

      const buffer = await file.arrayBuffer()

      this.ctx.stateManager.setLoading({
        isLoading: true,
        progress: 30,
        stage: 'reading',
        fileSize: file.size
      })
      await yieldToBrowser()

      // 格式检测和校验
      const detection = FormatDetector.detect(file.name, buffer)
      if (!detection) {
        this.handleValidationError(
          i18n.translate('vtkviewer.plugin.loadModel.unsupportedFormat') + `: ${file.name}`,
          file.size
        )
        return
      }

      await this.loadBuffer(buffer, detection.format, file.name, file.size)
    } catch (err) {
      this.handleLoadError(err)
    }
  }

  /**
   * 从远程URL加载模型
   */
  private async loadFromUrl(): Promise<void> {
    const url = this.urlInput.value.trim()
    if (!url) return

    // URL合法性校验
    try {
      new URL(url)
    } catch {
      this.statusText.value = i18n.translate('vtkviewer.plugin.loadModel.invalidUrl')
      this.statusType.value = 'error'
      return
    }

    try {
      this.isLoading.value = true
      this.statusText.value = i18n.translate('vtkviewer.plugin.loadModel.downloading')
      this.statusType.value = 'info'

      // 通过stateManager同步进度到LoadingPlugin
      this.ctx.stateManager.setLoading({
        isLoading: true,
        progress: 10,
        stage: 'downloading'
      })
      await yieldToBrowser()

      // 下载文件
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      this.ctx.stateManager.setLoading({
        isLoading: true,
        progress: 50,
        stage: 'reading'
      })
      await yieldToBrowser()

      const buffer = await response.arrayBuffer()

      // 从URL中提取文件名用于格式检测
      const urlFilename = url.split('/').pop()?.split('?')[0] ?? 'model'

      // 格式校验
      const detection = FormatDetector.detect(urlFilename, buffer)
      if (!detection) {
        this.handleValidationError(
          i18n.translate('vtkviewer.plugin.loadModel.unsupportedFormat') + `: ${urlFilename}`,
          buffer.byteLength
        )
        return
      }

      await this.loadBuffer(buffer, detection.format, urlFilename, buffer.byteLength)
    } catch (err) {
      this.handleLoadError(err)
    }
  }

  /**
   * 核心加载流程：清场→解析→添加到场景→重置相机→发送事件
   *
   * @param buffer 文件二进制内容
   * @param format 检测到的格式标识（如 'stl', 'obj'）
   * @param filename 文件名（用于日志和事件）
   * @param fileSize 文件大小（字节），用于LoadingPlugin显示
   */
  private async loadBuffer(
    buffer: ArrayBuffer,
    format: string,
    filename: string,
    fileSize?: number
  ): Promise<void> {
    // 查找对应的格式插件
    const formatPlugin = this.findFormatPlugin(format)
    if (!formatPlugin) {
      this.handleValidationError(
        `${i18n.translate('vtkviewer.plugin.loadModel.formatHandlerNotFound')}: ${format}`,
        fileSize
      )
      return
    }

    // 清空已有场景
    this.clearExistingScene()

    // 同步加载状态
    this.ctx.stateManager.setLoading({
      isLoading: true,
      progress: 50,
      stage: 'parsing',
      fileSize
    })
    this.statusText.value = i18n.translate('vtkviewer.plugin.loadModel.parsing')
    await yieldToBrowser()

    // 调用格式插件解析
    const result = await formatPlugin.parse(buffer, format)

    this.ctx.stateManager.setLoading({
      isLoading: true,
      progress: 80,
      stage: 'rendering'
    })
    this.statusText.value = i18n.translate('vtkviewer.plugin.loadModel.rendering')
    await yieldToBrowser()

    // 将解析结果添加到场景
    if (result.actors) {
      for (const actor of result.actors) {
        this.ctx.scene.addActor(actor)
      }
    }
    if (result.volumes) {
      for (const volume of result.volumes) {
        this.ctx.scene.addVolume(volume)
      }
    }

    // 重置相机到默认视角
    if (this.ctx.render?.resetToDefaultView) {
      this.ctx.render.resetToDefaultView()
    } else if (this.ctx.render?.resetCamera) {
      this.ctx.render.resetCamera()
    }

    // 保存初始相机状态用于后续居中/重置操作
    if (this.ctx.render?.saveInitialCameraState) {
      this.ctx.render.saveInitialCameraState()
    }

    // 清除加载状态
    this.ctx.stateManager.setLoading({
      isLoading: false,
      progress: 100,
      stage: 'complete'
    })
    await yieldToBrowser()

    // 加载完成后的UI反馈
    this.isLoading.value = false
    this.statusText.value = `${i18n.translate('vtkviewer.plugin.loadModel.loaded')}: ${filename}`
    this.statusType.value = 'success'
    this.isDropdownOpen.value = false

    // 延迟清除状态提示
    setTimeout(() => {
      this.statusText.value = ''
    }, 3000)

    // 触发场景加载事件（通知ColorBy等依赖插件）
    this.ctx.events.emit('scene:loaded', {
      format,
      filename,
      supportsColorBy: result.metadata?.supportsColorBy !== false
    })
  }

  /**
   * 处理格式校验失败，设置错误并清除加载状态
   */
  private handleValidationError(message: string, fileSize?: number): void {
    this.statusText.value = message
    this.statusType.value = 'error'
    this.isLoading.value = false
    this.ctx.stateManager.setLoading({
      isLoading: false,
      progress: 0,
      stage: 'idle',
      fileSize
    })
    this.ctx.stateManager.setError({
      message,
      severity: 'error',
      recoverable: true
    })
  }

  /**
   * 处理加载异常
   */
  private handleLoadError(err: unknown): void {
    console.error(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.loadModel.loadFailed')}:`,
      err
    )
    const msg =
      err instanceof Error ? err.message : i18n.translate('vtkviewer.plugin.loadModel.loadFailed')
    this.statusText.value = msg
    this.statusType.value = 'error'
    this.isLoading.value = false
    this.ctx.stateManager.setLoading({
      isLoading: false,
      progress: 0,
      stage: 'idle'
    })
    this.ctx.stateManager.setError({
      message: msg,
      severity: 'error',
      recoverable: true
    })
  }

  /**
   * 清空已有场景（复用UnloadModelPlugin的完备卸载逻辑）
   */
  private clearExistingScene(): void {
    const { scene, render, resetManager, events } = this.ctx
    if (scene.hasModels()) {
      unloadAllModels(scene, render, resetManager, events)
    } else {
      scene.clearScene()
    }
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 从已注册的格式插件中收集所有支持的格式
   * @returns 去重排序后的格式列表
   */
  private getSupportedFormats(): string[] {
    return this.ctx.plugins.getSupportedExtensions()
  }

  /**
   * 构建文件选择框的accept属性字符串。
   * 直接从 FormatDetector.EXTENSION_MAP 动态查找，无硬编码扩展名映射。
   *
   * @param formats 支持的格式列表
   * @returns HTML accept属性值（如 ".stl,.stla,.stlb,.obj,.ply"）
   */
  private buildAcceptString(formats: string[]): string {
    return FormatDetector.getAcceptedExtensions(formats)
  }

  /**
   * 根据格式名查找对应的格式插件（委托给 PluginRegistry 的索引）
   * @param format 格式标识（如 'stl', 'obj'）
   * @returns 匹配的格式插件，未找到则返回 undefined
   */
  private findFormatPlugin(format: string): IFormatPlugin | undefined {
    return this.ctx.plugins.getFormatPluginIndex().get(format.toLowerCase())
  }

  // ============================================================
  // 渲染
  // ============================================================

  render(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const isOpen = self.isDropdownOpen.value
          const loading = self.isLoading.value

          // —— 工具栏按钮 ——
          const button = h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': isOpen }],
              title: isOpen
                ? i18n.translate('vtkviewer.plugin.loadModel.tooltipClose')
                : i18n.translate('vtkviewer.plugin.loadModel.tooltip'),
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

          // —— 下拉弹窗 ——
          let dropdown: ReturnType<typeof h> | null = null
          if (isOpen) {
            const panelChildren: ReturnType<typeof h>[] = []

            // 标题行（复用统一弹窗header样式）
            panelChildren.push(
              h('div', { class: 'iimm-vtk-popup-header' }, [
                h(
                  'span',
                  { class: 'iimm-vtk-popup-title' },
                  i18n.translate('vtkviewer.plugin.loadModel.title')
                )
              ])
            )

            // Tab切换栏
            const isLocal = self.tab.value === 'local'
            const isRemote = self.tab.value === 'remote'
            panelChildren.push(
              h('div', { class: 'iimm-vtk-load-model-tabs' }, [
                h(
                  'button',
                  {
                    class: ['iimm-vtk-load-model-tab', { 'is-active': isLocal }],
                    disabled: loading,
                    onClick: () => {
                      self.tab.value = 'local'
                    }
                  },
                  i18n.translate('vtkviewer.plugin.loadModel.tabLocal')
                ),
                h(
                  'button',
                  {
                    class: ['iimm-vtk-load-model-tab', { 'is-active': isRemote }],
                    disabled: loading,
                    onClick: () => {
                      self.tab.value = 'remote'
                    }
                  },
                  i18n.translate('vtkviewer.plugin.loadModel.tabRemote')
                )
              ])
            )

            if (isLocal) {
              // —— 本地文件Tab ——
              panelChildren.push(
                h('div', { class: 'iimm-vtk-load-model-section' }, [
                  h(
                    'div',
                    { class: 'iimm-vtk-load-model-label' },
                    i18n.translate('vtkviewer.plugin.loadModel.selectHint')
                  ),
                  h(
                    'button',
                    {
                      class: 'iimm-vtk-load-model-action-btn',
                      disabled: loading,
                      onClick: () => self.openFileDialog()
                    },
                    '📁 ' + i18n.translate('vtkviewer.plugin.loadModel.selectFile')
                  ),
                  h(
                    'div',
                    { class: 'iimm-vtk-load-model-hint' },
                    `${i18n.translate('vtkviewer.plugin.loadModel.supportedFormats')}: ${self.getSupportedFormats().join(', ').toUpperCase()}`
                  )
                ])
              )
            } else {
              // —— 远程URL Tab ——
              panelChildren.push(
                h('div', { class: 'iimm-vtk-load-model-section' }, [
                  h(
                    'div',
                    { class: 'iimm-vtk-load-model-label' },
                    i18n.translate('vtkviewer.plugin.loadModel.urlHint')
                  ),
                  h('input', {
                    class: 'iimm-vtk-load-model-url-input',
                    type: 'text',
                    placeholder: i18n.translate('vtkviewer.plugin.loadModel.urlPlaceholder'),
                    value: self.urlInput.value,
                    disabled: loading,
                    onInput: (e: Event) => {
                      self.urlInput.value = (e.target as HTMLInputElement).value
                    },
                    onKeydown: (e: KeyboardEvent) => {
                      if (e.key === 'Enter' && self.urlInput.value.trim()) {
                        self.loadFromUrl()
                      }
                    }
                  }),
                  h(
                    'button',
                    {
                      class: 'iimm-vtk-load-model-action-btn',
                      disabled: loading || !self.urlInput.value.trim(),
                      onClick: () => self.loadFromUrl()
                    },
                    loading
                      ? i18n.translate('vtkviewer.plugin.loadModel.loading')
                      : '🌐 ' + i18n.translate('vtkviewer.plugin.loadModel.load')
                  ),
                  h(
                    'div',
                    { class: 'iimm-vtk-load-model-hint' },
                    i18n.translate('vtkviewer.plugin.loadModel.remoteHint')
                  )
                ])
              )
            }

            // 状态提示区域
            if (self.statusText.value) {
              const statusClass =
                self.statusType.value === 'success'
                  ? 'is-success'
                  : self.statusType.value === 'error'
                    ? 'is-error'
                    : 'is-info'
              panelChildren.push(
                h(
                  'div',
                  {
                    class: ['iimm-vtk-load-model-toast', statusClass]
                  },
                  self.statusText.value
                )
              )
            }

            dropdown = h(
              'div',
              {
                class: 'iimm-vtk-load-model-dropdown',
                style: getDropdownAlignStyle(self.dropdownAlignment.align.value)
              },
              panelChildren
            )
          }

          return h(
            'div',
            {
              class: 'iimm-vtk-toolbar-item iimm-vtk-load-model'
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

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    // 加载模型插件默认不设置快捷键
    return []
  }
}
