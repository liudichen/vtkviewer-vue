/**
 * 拖拽加载插件
 * 提供文件拖拽加载功能，支持的文件格式由已注册的格式插件动态决定
 */

import { nextTick } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import {
  type IFormatPlugin,
  type PluginConfig,
  PluginType,
  type IServicePlugin
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** 拖拽加载插件配置 */
export interface DragDropPluginConfig extends PluginConfig {
  /** 是否允许多文件 */
  multiple?: boolean
  /** 拖拽区域选择器 */
  dropZoneSelector?: string
  /** 自定义验证函数 */
  validateFile?: (file: File) => boolean | Promise<boolean>
}

/**
 * 拖拽加载插件
 * 提供文件拖拽加载功能，包含文件验证和视觉反馈
 */
export class DragDropPlugin extends PluginBase<DragDropPluginConfig> implements IServicePlugin {
  readonly metadata = {
    id: 'drag-drop',
    name: 'DragDropPlugin',
    type: PluginType.SERVICE,
    description: i18n.translate('vtkviewer.plugin.dragDrop.description')
  }

  readonly defaultConfig: DragDropPluginConfig = {
    enabled: true,
    multiple: false,
    dropZoneSelector: '.iimm-vtk-canvas'
  }

  private dropZone: HTMLElement | null = null
  private isDragging = false
  private dragCounter = 0
  private _disposed = false
  /** 由已注册格式插件动态构建的支持扩展名列表 */
  private supportedExtensions: string[] = []

  // 保存绑定的事件处理函数引用，确保 add/remove 使用同一引用
  private boundHandleDragEnter = this.handleDragEnter.bind(this)
  private boundHandleDragOver = this.handleDragOver.bind(this)
  private boundHandleDragLeave = this.handleDragLeave.bind(this)
  private boundHandleDrop = this.handleDrop.bind(this)
  private boundPreventDefault = (e: Event) => e.preventDefault()
  private setupTimer: ReturnType<typeof setTimeout> | null = null

  protected onInit(): void {
    // 从已注册的格式插件中收集支持的扩展名
    this.refreshSupportedExtensions()
    // 监听插件初始化完成（格式插件可能在 service 之后初始化）
    this.onEvent(BuiltinEvents.PLUGINS_INITIALIZED, () => {
      this.refreshSupportedExtensions()
    })
    if (this.config.enabled) {
      this.setupDragDrop()
    }
  }

  /**
   * 遍历已注册的格式插件，收集所有支持的扩展名
   */
  private refreshSupportedExtensions(): void {
    const plugins = this.ctx.plugins.getAll()
    const extensions = new Set<string>()
    for (const plugin of plugins) {
      if (plugin.metadata.type === PluginType.FORMAT) {
        const fp = plugin as IFormatPlugin
        for (const fmt of fp.formats) {
          extensions.add(fmt.toLowerCase())
        }
      }
    }
    this.supportedExtensions = [...extensions].sort()
  }

  /**
   * 设置拖拽事件监听
   */
  private setupDragDrop(): void {
    // 使用 nextTick 确保 DOM 渲染完成后再查询元素
    this.setupTimer = setTimeout(() => {
      this.setupTimer = null
      nextTick(() => {
        if (this._disposed) return
        this.dropZone = document.querySelector(this.config.dropZoneSelector ?? '.iimm-vtk-canvas')

        if (this.dropZone) {
          this.dropZone.addEventListener('dragenter', this.boundHandleDragEnter)
          this.dropZone.addEventListener('dragover', this.boundHandleDragOver)
          this.dropZone.addEventListener('dragleave', this.boundHandleDragLeave)
          this.dropZone.addEventListener('drop', this.boundHandleDrop)

          // 防止默认行为（使用具名引用以便清理）
          document.addEventListener('dragover', this.boundPreventDefault)
          document.addEventListener('drop', this.boundPreventDefault)
        } else {
          this.debugWarn(
            `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.dragDrop.zoneNotFound')}: ${this.config.dropZoneSelector ?? '.iimm-vtk-canvas'}`
          )
        }
      })
    }, 0)
  }

  /**
   * 处理拖拽进入
   */
  private handleDragEnter(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()

    this.dragCounter++

    if (!this.isDragging) {
      this.isDragging = true
      this.showDropOverlay()
    }
  }

  /**
   * 处理拖拽悬停
   */
  private handleDragOver(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy'
    }
  }

  /**
   * 处理拖拽离开
   */
  private handleDragLeave(event: DragEvent): void {
    event.preventDefault()
    event.stopPropagation()

    this.dragCounter--

    if (this.dragCounter === 0) {
      this.isDragging = false
      this.hideDropOverlay()
    }
  }

  /**
   * 处理文件放置
   */
  private async handleDrop(event: DragEvent): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    this.dragCounter = 0
    this.isDragging = false
    this.hideDropOverlay()

    const files = event.dataTransfer?.files
    if (!files || files.length === 0) {
      return
    }

    // 验证文件
    const validFiles = await this.validateFiles(Array.from(files))

    if (validFiles.length > 0) {
      // 发送文件加载事件
      if (this.config.multiple) {
        this.ctx.events.emit(BuiltinEvents.FILES_LOAD, validFiles)
      } else {
        this.ctx.events.emit(BuiltinEvents.FILE_LOAD, validFiles[0])
      }
    }
  }

  /**
   * 验证文件
   */
  private async validateFiles(files: File[]): Promise<File[]> {
    const validFiles: File[] = []

    for (const file of files) {
      // 从文件扩展名中移除前导点号，与格式插件注册名比对
      const ext = this.getExtension(file.name).toLowerCase().replace(/^\./, '')
      const isAccepted =
        this.supportedExtensions.length === 0 || this.supportedExtensions.includes(ext)

      if (!isAccepted) {
        this.debugWarn(
          `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.dragDrop.unsupportedFile')}: ${file.name}`
        )
        this.showError(`${i18n.translate('vtkviewer.plugin.dragDrop.unsupportedFormat')}: .${ext}`)
        continue
      }

      // 自定义验证
      if (this.config.validateFile) {
        const isValid = await this.config.validateFile(file)
        if (!isValid) {
          continue
        }
      }

      validFiles.push(file)
    }

    return validFiles
  }

  /**
   * 获取文件扩展名
   */
  private getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filename.substring(lastDot)
  }

  /**
   * 显示拖拽覆盖层
   */
  private showDropOverlay(): void {
    // 移除已存在的覆盖层
    this.hideDropOverlay()

    const overlay = document.createElement('div')
    overlay.id = 'iimm-vtk-drag-drop-overlay'
    overlay.className = 'iimm-vtk-drag-drop-overlay'
    overlay.innerHTML = `
      <div class="iimm-vtk-drag-drop-content">
        <div class="iimm-vtk-drag-drop-icon">📁</div>
        <div class="iimm-vtk-drag-drop-text">${i18n.translate('vtkviewer.plugin.dragDrop.dropHint')}</div>
        <div class="iimm-vtk-drag-drop-hint">${i18n.translate('vtkviewer.plugin.dragDrop.supportedFormats')}: ${this.ctx.plugins
          .getSupportedExtensions()
          .map(e => '.' + e)
          .join(', ')}</div>
      </div>
    `

    if (this.dropZone) {
      this.dropZone.appendChild(overlay)
    }
  }

  /**
   * 隐藏拖拽覆盖层
   */
  private hideDropOverlay(): void {
    const overlay = document.getElementById('iimm-vtk-drag-drop-overlay')
    if (overlay) {
      overlay.remove()
    }
  }

  /**
   * 显示错误信息
   */
  private showError(message: string): void {
    this.ctx.stateManager.setError({
      message,
      severity: 'warning',
      recoverable: false
    })
  }

  /**
   * 启用拖拽
   */
  enable(): void {
    if (!this.config.enabled) {
      this.config.enabled = true
      this.setupDragDrop()
    }
  }

  /**
   * 禁用拖拽
   */
  disable(): void {
    this.config.enabled = false
    this.removeDragDrop()
  }

  /**
   * 移除拖拽事件监听
   */
  private removeDragDrop(): void {
    if (this.setupTimer) {
      clearTimeout(this.setupTimer)
      this.setupTimer = null
    }
    if (this.dropZone) {
      this.dropZone.removeEventListener('dragenter', this.boundHandleDragEnter)
      this.dropZone.removeEventListener('dragover', this.boundHandleDragOver)
      this.dropZone.removeEventListener('dragleave', this.boundHandleDragLeave)
      this.dropZone.removeEventListener('drop', this.boundHandleDrop)
    }
    document.removeEventListener('dragover', this.boundPreventDefault)
    document.removeEventListener('drop', this.boundPreventDefault)
  }

  protected onDispose(): void {
    this._disposed = true
    this.removeDragDrop()
    this.hideDropOverlay()
  }
}
