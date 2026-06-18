/**
 * DRC格式插件
 * 支持 Draco 压缩格式
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkDracoReader from '@kitware/vtk.js/IO/Geometry/DracoReader'

import { i18n } from '@/core'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** Draco 解码器状态 */
let dracoDecoderReady = false
let dracoDecoderPromise: Promise<void> | null = null

/**
 * DRC格式插件
 * 支持 Draco 压缩格式
 */
export class DrcPlugin extends PluginBase<PluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'drc',
    name: 'DrcPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.drc.description')
  }
  readonly formats = ['drc']
  readonly priority = 10

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'drc'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      // 确保 Draco 解码器已初始化
      await this.ensureDracoDecoderReady()

      const reader = vtkDracoReader.newInstance()
      reader.parseAsArrayBuffer(arrayBuffer)
      const polyData = reader.getOutputData()

      const mapper = vtkMapper.newInstance()
      mapper.setInputData(polyData)

      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)

      const points = polyData.getPoints()
      const cells = polyData.getPolys()

      return {
        actors: [actor],
        data: polyData,
        metadata: {
          format: 'drc',
          vertexCount: points?.getNumberOfPoints() || 0,
          triangleCount: cells?.getNumberOfCells() || 0,
          isCompressed: true,
          supportsColorBy: false
        }
      }
    } catch (error) {
      console.error(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.format.parseError')}:`,
        error
      )
      throw error
    }
  }

  /**
   * 确保 Draco 解码器已初始化
   *
   * 解码器加载顺序：
   * 1. 检查 vtkDracoReader 是否已有解码器
   * 2. 从 ctx.decoders.draco 读取路径（如有），通过 <script> 动态加载
   * 3. 尝试动态 import('draco3d') 使用 npm 包
   */
  private async ensureDracoDecoderReady(): Promise<void> {
    if (dracoDecoderReady) {
      return
    }

    if (!dracoDecoderPromise) {
      dracoDecoderPromise = this.initDecoder()
    }

    return dracoDecoderPromise
  }

  private async initDecoder(): Promise<void> {
    // 检查是否已有解码器
    if (vtkDracoReader.getDracoDecoder()) {
      dracoDecoderReady = true
      return
    }

    // 尝试从 ctx.decoders 配置的路径动态加载
    const decoderPath = this.ctx.decoders?.['draco']
    if (decoderPath) {
      try {
        await this.loadFromScript(decoderPath)
        dracoDecoderReady = true
        this.debugLog(
          `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.decoderReady')}`
        )
        return
      } catch (error) {}
    }

    // 尝试动态 import npm 包
    // 使用 new Function 构造，完全避免 Vite 静态扫描
    try {
      const importFn = new Function('return import("dra" + "co3d")') as () => Promise<any>
      const module = await importFn()
      const { createDecoderModule } = module
      await vtkDracoReader.setDracoDecoder(createDecoderModule)
      dracoDecoderReady = true
      this.debugLog(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.decoderReady')}`
      )
      return
    } catch (error) {
      // npm 包不可用，继续
    }

    try {
      await this.loadFromScript('/draco_decoder.js')
      dracoDecoderReady = true
      this.debugLog(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.decoderReady')}`
      )
      return
    } catch (error) {}

    throw new Error(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.decoderNotReady')}`
    )
  }

  private loadFromScript(scriptPath: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // 如果 window.DracoDecoderModule 已存在，直接初始化
      if (typeof (window as any).DracoDecoderModule !== 'undefined') {
        vtkDracoReader.setDracoDecoder((window as any).DracoDecoderModule).then(resolve, reject)
        return
      }

      const script = document.createElement('script')
      script.src = scriptPath
      script.onload = () => {
        if (typeof (window as any).DracoDecoderModule !== 'undefined') {
          vtkDracoReader.setDracoDecoder((window as any).DracoDecoderModule).then(resolve, reject)
        } else {
          reject(
            new Error(
              `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.decoderModuleNotFound')}`
            )
          )
        }
      }
      script.onerror = () =>
        reject(
          new Error(
            `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.drc.loadFailed')} ${scriptPath}`
          )
        )
      document.head.appendChild(script)
    })
  }
}
