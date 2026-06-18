/**
 * VTU格式插件
 * 支持 VTK UnstructuredGrid XML 格式
 * 支持标量数据颜色映射（ColorBy 功能）
 *
 * 注意：VTK.js 不内置 XMLUnstructuredGridReader，本插件使用自定义解析器
 * 将 UnstructuredGrid 转换为 PolyData 表面进行渲染。
 */

import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkColorMaps from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction/ColorMaps'
import { ColorMode, ScalarMode } from '@kitware/vtk.js/Rendering/Core/Mapper/Constants'
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper'

import { i18n } from '@/core'
import {
  collectColorableArrays,
  loadVtuFromArrayBuffer,
  selectBestColorArray,
  parseColorByValue
} from '@/utils'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** VTU格式插件配置 */
export interface VtuPluginConfig extends PluginConfig {
  // 目前没有额外配置项，预留扩展
}

/**
 * VTU格式插件
 * 支持 VTK UnstructuredGrid XML 格式
 * 通过提取表面多边形转换为 PolyData 进行渲染
 * 支持标量数据颜色映射（ColorBy 功能）
 */
export class VtuPlugin extends PluginBase<VtuPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'vtu',
    name: 'VtuPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.vtu.description')
  }
  readonly formats = ['vtu']
  readonly priority = 10
  readonly defaultConfig: VtuPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'vtu'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      // 使用自定义 VTU 加载器解析文件
      const { polyData, pointArrays } = loadVtuFromArrayBuffer(arrayBuffer)

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
          mapper.set({ colorByArrayName: arrayName })
        }

        // 创建颜色传递函数
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
      const polys = polyData.getPolys()

      return {
        actors: [actor],
        data: polyData,
        metadata: {
          format: 'vtu',
          vertexCount: points?.getNumberOfPoints() || 0,
          triangleCount: polys?.getNumberOfCells() || 0,
          pointDataArrays: pointData?.getNumberOfArrays() || 0,
          cellDataArrays: cellData?.getNumberOfArrays() || 0,
          colorByOptions: hasColorArrays ? colorByOptions : undefined,
          pointArrays,
          // 标记这是从 UnstructuredGrid 转换的表面
          isSurfaceExtraction: true
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
