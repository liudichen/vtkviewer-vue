/**
 * PDB格式插件
 * 支持 Protein Data Bank 分子格式
 *
 * 渲染管线：
 * PDBReader → Molecule → MoleculeToRepresentation → SphereMapper + StickMapper
 *
 * 使用专用 vtkSphereMapper/vtkStickMapper 渲染原子球体和化学键棍棒。
 * MoleculeToRepresentation 输出的 PolyData 包含 radius/stickScales/orientation
 * 等专用标量数组，标准 vtkMapper 无法正确处理这些数据。
 */

import vtkMoleculeToRepresentation from '@kitware/vtk.js/Filters/General/MoleculeToRepresentation'
import vtkPDBReader from '@kitware/vtk.js/IO/Misc/PDBReader'
import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor'
import vtkSphereMapper from '@kitware/vtk.js/Rendering/Core/SphereMapper'
import vtkStickMapper from '@kitware/vtk.js/Rendering/Core/StickMapper'
// 注册 SphereMapper 和 StickMapper 的 OpenGL 渲染实现
import '@kitware/vtk.js/Rendering/OpenGL/SphereMapper'
import '@kitware/vtk.js/Rendering/OpenGL/StickMapper'

import { i18n } from '@/core'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** PDB格式插件配置 */
export interface PdbPluginConfig extends PluginConfig {
  /** 原子半径缩放因子 */
  atomicRadiusScaleFactor?: number
  /** 化学键半径 */
  bondRadius?: number
}

/**
 * PDB格式插件
 * 支持 Protein Data Bank 分子格式
 *
 * 渲染管线：
 * PDBReader → Molecule → MoleculeToRepresentation → SphereMapper + StickMapper
 */
export class PdbPlugin extends PluginBase<PdbPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'pdb',
    name: 'PdbPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.pdb.description')
  }
  readonly formats = ['pdb']
  readonly priority = 10
  readonly defaultConfig: PdbPluginConfig = {
    enabled: true,
    atomicRadiusScaleFactor: 0.3,
    bondRadius: 0.075
  }

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'pdb'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    try {
      const textDecoder = new TextDecoder()
      const text = textDecoder.decode(arrayBuffer)

      const reader = vtkPDBReader.newInstance()
      reader.parseAsText(text)

      const filter = vtkMoleculeToRepresentation.newInstance({
        atomicRadiusScaleFactor: this.config.atomicRadiusScaleFactor ?? 0.3,
        bondRadius: this.config.bondRadius ?? 0.075,
        tolerance: 0.45
      })
      filter.setInputConnection(reader.getOutputPort())

      // 球体（原子）
      const sphereMapper = vtkSphereMapper.newInstance()
      sphereMapper.setInputConnection(filter.getOutputPort(0))
      sphereMapper.setScaleArray(filter.getSphereScaleArrayName())

      const sphereActor = vtkActor.newInstance()
      sphereActor.setMapper(sphereMapper)
      sphereActor.getProperty().setColor(0.2, 0.6, 1.0)

      // 棍棒（化学键）
      const stickMapper = vtkStickMapper.newInstance()
      stickMapper.setInputConnection(filter.getOutputPort(1))
      ;(stickMapper as any).setScaleArray('stickScales')
      ;(stickMapper as any).setOrientationArray('orientation')

      const stickActor = vtkActor.newInstance()
      stickActor.setMapper(stickMapper)
      stickActor.getProperty().setColor(1.0, 0.5, 0.3)

      const atomCount = reader.getNumberOfAtoms?.() ?? 0

      return {
        actors: [sphereActor, stickActor],
        data: null,
        metadata: {
          format: 'pdb',
          vertexCount: atomCount,
          triangleCount: 0,
          atomCount,
          bondCount: 0,
          hasHydrogen: this.checkForHydrogen(arrayBuffer),
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
   * 检查是否包含氢原子
   */
  private checkForHydrogen(arrayBuffer: ArrayBuffer): boolean {
    const text = new TextDecoder().decode(arrayBuffer)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('ATOM') || line.startsWith('HETATM')) {
        // 检查原子类型（第77-78列）
        const element = line.substring(76, 78).trim()
        if (element === 'H') {
          return true
        }
      }
    }

    return false
  }
}
