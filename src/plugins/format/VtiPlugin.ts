/**
 * VTI格式插件
 * 支持 VTK ImageData 格式（体渲染）
 */

import vtkVolume from '@kitware/vtk.js/Rendering/Core/Volume'
import vtkVolumeMapper from '@kitware/vtk.js/Rendering/Core/VolumeMapper'
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader'

import { i18n } from '@/core'
import { createDefaultVolumeProperty, calcSampleDistance } from '@/utils'
import {
  type IFormatPlugin,
  type FormatParseResult,
  type PluginConfig,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** 体渲染传递函数控制点 */
export interface VolumeTransferPoint {
  /** 在数据范围中的位置 (0-1)，0=最小值，1=最大值 */
  position: number
  /** 该位置的透明度 (0-1) */
  opacity: number
}

/** 体渲染颜色控制点 */
export interface VolumeColorPoint extends VolumeTransferPoint {
  /** RGB 颜色分量 (0-1) */
  r: number
  g: number
  b: number
}

/** 体渲染参数（可在插件注册时配置） */
export interface VolumeRenderingConfig {
  /** 采样距离缩放因子，越小越精细（性能开销越大），默认 0.7 */
  sampleDistanceScale?: number
  /** 颜色控制点列表（按 position 排序），不传则用默认冷暖渐变 */
  colorPoints?: VolumeColorPoint[]
  /** 透明度控制点列表（按 position 排序），不传则用默认 S 型曲线 */
  opacityPoints?: VolumeTransferPoint[]
  /** 环境光强度 (0-1)，默认 0.2 */
  ambient?: number
  /** 漫反射强度 (0-1)，默认 0.7 */
  diffuse?: number
  /** 镜面反射强度 (0-1)，默认 0.3 */
  specular?: number
  /** 镜面反射锐度，默认 8.0 */
  specularPower?: number
  /** 是否启用光照着色，默认 true */
  shade?: boolean
  /** 梯度透明度最大值的缩放因子（相对于数据范围），默认 0.05 */
  gradientOpacityScale?: number
}

/** VTI格式插件配置 */
export interface VtiPluginConfig extends PluginConfig {
  /** 体渲染参数 */
  volumeRendering?: VolumeRenderingConfig
}

/**
 * VTI格式插件
 * 支持 VTK ImageData 格式（体渲染）
 */
export class VtiPlugin extends PluginBase<VtiPluginConfig> implements IFormatPlugin {
  readonly metadata = {
    id: 'vti',
    name: 'VtiPlugin',
    type: PluginType.FORMAT,
    description: i18n.translate('vtkviewer.plugin.vti.description')
  }
  readonly formats = ['vti']
  readonly priority = 10
  readonly defaultConfig: VtiPluginConfig = { enabled: true }

  dispose(): void {}

  canHandle(format: string): boolean {
    return format.toLowerCase() === 'vti'
  }

  async parse(
    arrayBuffer: ArrayBuffer,
    _format: string,
    _options?: Record<string, any>
  ): Promise<FormatParseResult> {
    const cfg = this.config.volumeRendering ?? {}

    const reader = vtkXMLImageDataReader.newInstance()
    reader.parseAsArrayBuffer(arrayBuffer)
    const source = reader.getOutputData(0)

    // 体渲染属性（传递函数 + 光照 + 梯度 — 统一由 volumeUtils 创建）
    const property = createDefaultVolumeProperty(source, cfg)

    // 采样距离
    const sampleDistance = calcSampleDistance(source, cfg.sampleDistanceScale ?? 0.7)

    const mapper = vtkVolumeMapper.newInstance()
    mapper.setInputData(source)
    mapper.setSampleDistance(sampleDistance)

    const volume = vtkVolume.newInstance()
    volume.setMapper(mapper)
    volume.setProperty(property)

    return {
      volumes: [volume],
      data: source,
      isVolume: true,
      metadata: { format: 'vti', dimensions: source.getDimensions() }
    }
  }
}
