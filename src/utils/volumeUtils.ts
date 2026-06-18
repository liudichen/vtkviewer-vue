/**
 * 体渲染工具
 * 提供默认传递函数和 VolumeProperty 创建，避免在多处重复
 *
 * @module utils/volumeUtils
 */

import vtkBoundingBox from '@kitware/vtk.js/Common/DataModel/BoundingBox'
import vtkColorTransferFunction from '@kitware/vtk.js/Rendering/Core/ColorTransferFunction'
import vtkPiecewiseFunction from '@kitware/vtk.js/Common/DataModel/PiecewiseFunction'
import vtkVolumeProperty from '@kitware/vtk.js/Rendering/Core/VolumeProperty'

import type { VolumeColorPoint, VolumeTransferPoint, VolumeRenderingConfig } from '@/plugins'

/** 默认颜色控制点（冷暖渐变，位置按数据范围归一化） */
const DEFAULT_COLOR_POINTS: VolumeColorPoint[] = [
  { position: 0, r: 0.0, g: 0.0, b: 0.0, opacity: 0 },
  { position: 0.25, r: 0.0, g: 0.2, b: 0.6, opacity: 0 },
  { position: 0.5, r: 0.5, g: 0.5, b: 0.5, opacity: 0 },
  { position: 0.75, r: 0.8, g: 0.3, b: 0.1, opacity: 0 },
  { position: 1, r: 1.0, g: 1.0, b: 1.0, opacity: 0 }
]

/** 默认透明度控制点（S 型曲线） */
const DEFAULT_OPACITY_POINTS: VolumeTransferPoint[] = [
  { position: 0, opacity: 0 },
  { position: 0.05, opacity: 0 },
  { position: 0.15, opacity: 0.02 },
  { position: 0.35, opacity: 0.25 },
  { position: 0.55, opacity: 0.55 },
  { position: 0.75, opacity: 0.85 },
  { position: 1, opacity: 1.0 }
]

/**
 * 为给定的 ImageData 创建默认体渲染属性。
 * 所有控制点位置按数据范围归一化（0=min, 1=max），与具体数据值解耦。
 *
 * @param source VTK ImageData 对象
 * @param cfg 可选的体渲染配置覆盖
 * @returns 配置好的 vtkVolumeProperty
 */
export function createDefaultVolumeProperty(source: any, cfg?: VolumeRenderingConfig): any {
  const dataArray = source.getPointData().getScalars() || source.getPointData().getArrays()[0]
  const dataRange = dataArray.getRange()
  const dataMin = dataRange[0] as number
  const dataMax = dataRange[1] as number
  const rangeSize = dataMax - dataMin

  // 颜色
  const colorFunc = vtkColorTransferFunction.newInstance()
  const colorPoints = cfg?.colorPoints ?? DEFAULT_COLOR_POINTS
  for (const pt of colorPoints) {
    colorFunc.addRGBPoint(dataMin + rangeSize * pt.position, pt.r, pt.g, pt.b)
  }

  // 透明度
  const opacityFunc = vtkPiecewiseFunction.newInstance()
  const opacityPoints = cfg?.opacityPoints ?? DEFAULT_OPACITY_POINTS
  for (const pt of opacityPoints) {
    opacityFunc.addPoint(dataMin + rangeSize * pt.position, pt.opacity)
  }

  // 属性
  const property = vtkVolumeProperty.newInstance()
  property.setRGBTransferFunction(0, colorFunc)
  property.setScalarOpacity(0, opacityFunc)
  property.setInterpolationTypeToLinear()

  property.setScalarOpacityUnitDistance(
    0,
    vtkBoundingBox.getDiagonalLength(source.getBounds())! /
      Math.max(...(source.getDimensions() as number[]))
  )

  property.setGradientOpacityMinimumValue(0, 0)
  property.setGradientOpacityMaximumValue(0, rangeSize * (cfg?.gradientOpacityScale ?? 0.05))
  property.setUseGradientOpacity(0, true)
  property.setGradientOpacityMinimumOpacity(0, 0.0)
  property.setGradientOpacityMaximumOpacity(0, 1.0)

  property.setShade(cfg?.shade ?? true)
  property.setAmbient(cfg?.ambient ?? 0.2)
  property.setDiffuse(cfg?.diffuse ?? 0.7)
  property.setSpecular(cfg?.specular ?? 0.3)
  property.setSpecularPower(cfg?.specularPower ?? 8.0)

  return property
}

/**
 * 计算采样距离（基于 spacing）
 */
export function calcSampleDistance(source: any, scale = 0.7): number {
  const spacing = source.getSpacing() as number[]
  return (
    scale * Math.sqrt(spacing.map((v: number) => v * v).reduce((a: number, b: number) => a + b, 0))
  )
}
