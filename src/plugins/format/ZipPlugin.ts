/**
 * ZIP格式插件
 * 聚合处理器，支持解压后自动识别内部格式
 * 支持：通用 ZIP、VTK.js 原生 ZIP (.vtkjs)、OBJ+MTL+纹理 ZIP (.obz)
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'

import { i18n } from '@/core'
import {
  decompressZip,
  isVtkJsZip,
  parseVtkJsScene,
  extractVtkJsData,
  parseObjFromZip,
  parseGenericZip
} from '@/utils'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** ZIP格式插件配置 */
export interface ZipPluginConfig extends PluginConfig {
  // 目前没有额外配置项，预留扩展
}

/**
 * ZIP格式插件
 * 聚合处理器，支持解压后自动识别内部格式
 * 支持：通用 ZIP、VTK.js 原生 ZIP (.vtkjs)、OBJ+MTL+纹理 ZIP (.obz)
 */
export class ZipPlugin extends PluginBase<ZipPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'zip',
    name: 'ZipPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.zip.description')
  }
  readonly formats = ['zip', 'vtkjs', 'obz']
  readonly priority = 5 // 低于其他格式处理器，让内部格式优先匹配
  readonly initOrder = 250 // 略大于 format 默认值 200，确保在依赖的插件之后
  readonly dependencies = ['stl', 'obj', 'ply'] // 依赖其他格式插件
  readonly defaultConfig: ZipPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return ['zip', 'vtkjs', 'obz'].includes(format.toLowerCase())
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      // 解压 ZIP
      const files = decompressZip(arrayBuffer)

      // 当 format 为 'zip' 时，需要进一步判断是普通 ZIP 还是 VTKJS ZIP
      let effectiveFormat = format
      if (format === 'zip' && isVtkJsZip(files)) {
        effectiveFormat = 'vtkjs'
        this.debugLog(
          `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.zip.detectVtkjs')}`
        )
      }

      switch (effectiveFormat) {
        case 'vtkjs':
          return await this.handleVtkJsZip(files, arrayBuffer)
        case 'obz':
          return await this.handleObjBundleZip(files)
        default:
          return await this.handleGenericZip(files)
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
   * 处理 VTK.js 原生 ZIP 格式
   */
  private async handleVtkJsZip(
    files: Record<string, Uint8Array>,
    arrayBuffer: ArrayBuffer
  ): Promise<FormatParseResult> {
    if (!isVtkJsZip(files)) {
      throw new Error(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.zip.invalidVtkjs')}`
      )
    }
    const { scene } = parseVtkJsScene(files)
    const data = await extractVtkJsData(scene, arrayBuffer)

    // 如果 data 是 PolyData，创建 Actor
    if (data) {
      const mapper = vtkMapper.newInstance()
      mapper.setInputData(data)

      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)

      return {
        actors: [actor],
        metadata: {
          format: 'vtkjs',
          fileSize: arrayBuffer.byteLength
        }
      }
    }

    return {
      metadata: {
        format: 'vtkjs',
        fileSize: arrayBuffer.byteLength
      }
    }
  }

  /**
   * 处理 OBJ+MTL+纹理的 ZIP 包
   */
  private async handleObjBundleZip(files: Record<string, Uint8Array>): Promise<FormatParseResult> {
    const result = await parseObjFromZip(files)

    const actors: any[] = []
    let totalVertices = 0
    let totalTriangles = 0

    for (const { polyData, name } of result.outputs) {
      const mapper = vtkMapper.newInstance()
      mapper.setInputData(polyData)

      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)

      // 应用 MTL 材质
      if (result.mtlReader && name) {
        result.mtlReader.applyMaterialToActor(name, actor)
      }

      actors.push(actor)

      const points = polyData.getPoints()
      const cells = polyData.getPolys()
      totalVertices += points?.getNumberOfPoints() || 0
      totalTriangles += cells?.getNumberOfCells() || 0
    }

    return {
      actors,
      metadata: {
        format: 'obz',
        vertexCount: totalVertices,
        triangleCount: totalTriangles,
        meshCount: result.outputs.length,
        hasMtl: !!result.mtlReader
      }
    }
  }

  /**
   * 处理通用 ZIP 格式
   */
  private async handleGenericZip(files: Record<string, Uint8Array>): Promise<FormatParseResult> {
    const parsed = await parseGenericZip(files)

    // 如果是 OBJ+MTL 格式
    if (parsed?._isObjWithMtl) {
      const actors: any[] = []
      let totalVertices = 0
      let totalTriangles = 0

      for (const { polyData, name } of parsed.outputs) {
        const mapper = vtkMapper.newInstance()
        mapper.setInputData(polyData)

        const actor = vtkActor.newInstance()
        actor.setMapper(mapper)

        if (parsed.mtlReader && name) {
          parsed.mtlReader.applyMaterialToActor(name, actor)
        }

        actors.push(actor)

        const points = polyData.getPoints()
        const cells = polyData.getPolys()
        totalVertices += points?.getNumberOfPoints() || 0
        totalTriangles += cells?.getNumberOfCells() || 0
      }

      return {
        actors,
        metadata: {
          format: 'zip',
          vertexCount: totalVertices,
          triangleCount: totalTriangles,
          meshCount: parsed.outputs.length,
          hasMtl: !!parsed.mtlReader
        }
      }
    }

    // 如果是 PolyData（单个模型文件）
    if (parsed) {
      const mapper = vtkMapper.newInstance()
      mapper.setInputData(parsed)

      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)

      const points = parsed.getPoints()
      const cells = parsed.getPolys()

      return {
        actors: [actor],
        metadata: {
          format: 'zip',
          vertexCount: points?.getNumberOfPoints() || 0,
          triangleCount: cells?.getNumberOfCells() || 0
        }
      }
    }

    throw new Error(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.zip.noSupportedModel')}`
    )
  }
}
