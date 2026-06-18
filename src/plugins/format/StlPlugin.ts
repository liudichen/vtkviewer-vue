/**
 * STL格式插件
 * 支持 STL/STLA/STLB 格式
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader'

import { i18n } from '@/core'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** STL格式插件配置 */
export interface StlPluginConfig extends PluginConfig {
  /** 是否合并重复点 */
  mergePoints?: boolean
}

/**
 * STL格式插件
 * 支持 STL/STLA/STLB 格式
 */
export class StlPlugin extends PluginBase<StlPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'stl',
    name: 'StlPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.stl.description')
  }
  readonly formats = ['stl', 'stla', 'stlb']
  readonly priority = 10
  readonly defaultConfig: StlPluginConfig = { enabled: true, mergePoints: false }

  dispose(): void {
    // 清理资源
  }

  canHandle(format: string): boolean {
    return this.formats.includes(format.toLowerCase())
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    const reader = vtkSTLReader.newInstance()
    reader.parseAsArrayBuffer(arrayBuffer)
    const polyData = reader.getOutputData()

    const mapper = vtkMapper.newInstance()
    mapper.setInputData(polyData)

    const actor = vtkActor.newInstance()
    actor.setMapper(mapper)

    return {
      actors: [actor],
      data: polyData,
      metadata: { format: 'stl', vertices: polyData.getNumberOfPoints() }
    }
  }
}
