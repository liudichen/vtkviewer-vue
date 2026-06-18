/**
 * OBJ格式插件
 * 支持 OBJ 格式
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader'

import { i18n } from '@/core'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** OBJ格式插件配置 */
export interface ObjPluginConfig extends PluginConfig {
  // 目前没有额外配置项，预留扩展
}

/**
 * OBJ格式插件
 * 支持 OBJ 格式
 */
export class ObjPlugin extends PluginBase<ObjPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'obj',
    name: 'ObjPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.obj.description')
  }
  readonly formats = ['obj']
  readonly priority = 10
  readonly defaultConfig: ObjPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'obj'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    const textDecoder = new TextDecoder()
    const text = textDecoder.decode(arrayBuffer)
    const reader = vtkOBJReader.newInstance()
    reader.parseAsText(text)
    const polyData = reader.getOutputData()

    const mapper = vtkMapper.newInstance()
    mapper.setInputData(polyData)

    const actor = vtkActor.newInstance()
    actor.setMapper(mapper)

    return {
      actors: [actor],
      data: polyData,
      metadata: { format: 'obj', vertices: polyData.getNumberOfPoints() }
    }
  }
}
