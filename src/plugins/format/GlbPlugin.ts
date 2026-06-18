1 /**
 * GLB格式插件
 * 仅支持 GLB 二进制格式（glTF 2.0 Binary）
 */

import type { vtkActor } from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkGLTFImporter from '@kitware/vtk.js/IO/Geometry/GLTFImporter'

import { i18n } from '@/core'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** GLB格式插件配置 */
export interface GlbPluginConfig extends PluginConfig {}

/**
 * GLB格式插件
 * 仅支持 GLB 二进制格式
 */
export class GlbPlugin extends PluginBase<GlbPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'glb',
    name: 'GlbPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.glb.description')
  }
  readonly formats = ['glb']
  readonly priority = 10
  readonly defaultConfig: GlbPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'glb'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      const importer = vtkGLTFImporter.newInstance()

      // 设置 renderer
      const renderer = this.ctx.render?.getRenderer()
      if (renderer) {
        importer.setRenderer(renderer)
      }

      // GLB 是纯二进制格式，数据全部内嵌，不需要 baseURL
      // parseAsBinary 是 async 的，且能处理 GLB 二进制数据
      // VTK 类型声明有 parseAsArrayBuffer 但运行时实际方法是 parseAsBinary
      await (importer as any).parseAsBinary(arrayBuffer)

      // 导入 actors
      importer.importActors()

      // 获取导入的 actors
      const actorsMap: Map<string, vtkActor> = importer.getActors()
      const actors: vtkActor[] = []

      for (const [, actor] of actorsMap) {
        actors.push(actor)
      }

      return {
        actors,
        metadata: { format, actorCount: actors.length }
      }
    } catch (error) {
      console.error(
        `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.format.parseError')}:`,
        error
      )
      throw error
    }
  }
}
