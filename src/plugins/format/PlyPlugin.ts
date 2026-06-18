/**
 * PLY格式插件
 * 支持 PLY 格式（ASCII 和二进制）
 * 支持顶点颜色和标量数据颜色映射
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps'
import { ColorMode, ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'
import vtkPLYReader from '@kitware/vtk.js/IO/Geometry/PLYReader'

import { i18n } from '@/core'
import { collectColorableArrays, selectBestColorArray, parseColorByValue } from '@/utils'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** PLY格式插件配置 */
export interface PlyPluginConfig extends PluginConfig {
  // 目前没有额外配置项，预留扩展
}

/**
 * PLY格式插件
 * 支持 PLY 格式（ASCII 和二进制）
 * 支持顶点颜色和标量数据颜色映射
 */
export class PlyPlugin extends PluginBase<PlyPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'ply',
    name: 'PlyPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.ply.description')
  }
  readonly formats = ['ply']
  readonly priority = 10
  readonly defaultConfig: PlyPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'ply'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      const reader = vtkPLYReader.newInstance()
      reader.parseAsArrayBuffer(arrayBuffer)
      const polyData = reader.getOutputData()

      const mapper = vtkMapper.newInstance()
      mapper.setInputData(polyData)

      // 配置颜色映射（如果有标量数据）
      const pointData = polyData.getPointData()
      const cellData = polyData.getCellData()

      // 使用统一的工具函数收集颜色可用的数组
      const { options: colorByOptions, features: arrayFeatures } = collectColorableArrays(
        pointData,
        cellData
      )

      // 如果有可用的颜色数组，自动配置颜色映射
      const hasColorArrays = colorByOptions.length > 1
      if (hasColorArrays) {
        // 设置颜色映射模式
        mapper.setColorMode(ColorMode.MAP_SCALARS)
        mapper.setScalarMode(ScalarMode.USE_POINT_FIELD_DATA)
        mapper.setScalarVisibility(true)

        // 使用智能选择算法选择最佳默认数组
        const bestValue = selectBestColorArray(colorByOptions, arrayFeatures)
        const [location, arrayName] = parseColorByValue(bestValue)

        if (location && arrayName) {
          if (location === 'PointData') {
            mapper.setScalarModeToUsePointFieldData()
          } else {
            mapper.setScalarModeToUseCellFieldData()
          }
          // 使用 set() 方法设置颜色数组名称（VTK.js API）
          mapper.set({ colorByArrayName: arrayName })

          // 检查是否是 RGB/RGBA 数据（3-4个分量）
          const bestFeature = arrayFeatures.find(
            f => f.name === arrayName && f.location === location
          )
          if (
            bestFeature &&
            (bestFeature.numberOfComponents === 3 || bestFeature.numberOfComponents === 4)
          ) {
            mapper.setColorMode(ColorMode.DIRECT_SCALARS)
          }
        }

        // 创建颜色传递函数（vtkColorTransferFunction）
        const colorTransferFunction = vtkColorTransferFunction.newInstance()
        const preset = vtkColorMaps.getPresetByName('Cool to Warm')
        colorTransferFunction.applyColorMap(preset)
        colorTransferFunction.setMappingRange(
          mapper.getScalarRange()[0],
          mapper.getScalarRange()[1]
        )
        colorTransferFunction.updateRange()
        mapper.setLookupTable(colorTransferFunction)
      }

      const actor = vtkActor.newInstance()
      actor.setMapper(mapper)

      const points = polyData.getPoints()
      const cells = polyData.getPolys()

      // 检查是否有顶点颜色
      const hasColor = pointData?.getScalars() !== null
      // 检查是否有法线
      const hasNormals = pointData?.getNormals() !== null

      return {
        actors: [actor],
        data: polyData,
        metadata: {
          format: 'ply',
          vertexCount: points?.getNumberOfPoints() || 0,
          triangleCount: cells?.getNumberOfCells() || 0,
          hasTexture: hasColor,
          hasNormals,
          colorByOptions: hasColorArrays ? colorByOptions : undefined
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
}
