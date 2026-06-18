/**
 * VTK.js 辅助工具函数
 * 提供 VTK.js 常用操作的封装和类型安全工具
 */

/**
 * 安全获取 VTK 对象（延迟加载兼容）
 * VTK.js 的动态 import 返回的模块可能需要 .default 取值
 */
export async function getVtkModule(modulePath: string): Promise<any> {
  const mod = await import(/* @vite-ignore */ modulePath)
  return mod.default || mod
}

/**
 * 从 ArrayBuffer 创建 VTK PolyData 的通用模式
 * 大部分格式插件都需要执行此流程
 */
export function createActorFromPolyData(vtk: any, polyData: any): any {
  const mapper = vtk.Rendering.Core.vtkMapper.newInstance()
  mapper.setInputData(polyData)

  const actor = vtk.Rendering.Core.vtkActor.newInstance()
  actor.setMapper(mapper)

  return actor
}

/**
 * 创建 Volume（体渲染）
 */
export function createVolumeFromImageData(vtk: any, imageData: any, volumeProperty?: any): any {
  const mapper = vtk.Rendering.Core.vtkVolumeMapper.newInstance()
  mapper.setInputData(imageData)
  mapper.setSampleDistance(0.5)

  const volume = vtk.Rendering.Core.vtkVolume.newInstance()
  volume.setMapper(mapper)

  if (volumeProperty) {
    volume.setProperty(volumeProperty)
  }

  return volume
}

/**
 * 计算 PolyData 的边界信息
 */
export function getPolyDataBounds(polyData: any): {
  bounds: number[]
  center: number[]
  diagonal: number
} {
  const bounds = polyData.getBounds()
  const center = [
    (bounds[0] + bounds[1]) / 2,
    (bounds[2] + bounds[3]) / 2,
    (bounds[4] + bounds[5]) / 2
  ]
  const diagonal = Math.sqrt(
    (bounds[1] - bounds[0]) ** 2 + (bounds[3] - bounds[2]) ** 2 + (bounds[5] - bounds[4]) ** 2
  )

  return { bounds, center, diagonal }
}

/**
 * 将十六进制颜色转换为 [r, g, b] 归一化数组
 */
export function hexToRgbNormalized(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0.5, 0.5, 0.5]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255
  ]
}

/**
 * 创建默认的标量映射（ColorBy）
 */
export function setupScalarMapping(actor: any, arrayName: string, componentIndex = -1): void {
  const mapper = actor.getMapper()
  if (!mapper) return

  mapper.setScalarModeToDefault()
  if (arrayName) {
    mapper.setColorByArrayName(arrayName)
    mapper.setScalarVisibility(true)
  } else {
    mapper.setScalarVisibility(false)
  }

  const lut = mapper.getLookupTable()
  if (lut && componentIndex >= 0) {
    lut.setVectorComponent(componentIndex)
    lut.setVectorModeToComponent()
  }
}

/**
 * 释放 VTK.js 对象（安全销毁）
 */
export function safeDeleteVtkObject(obj: any): void {
  if (obj && typeof obj.delete === 'function') {
    try {
      obj.delete()
    } catch {
      // 已经被释放或无效对象
    }
  }
}

/**
 * 判断浏览器是否支持 WebGL 2.0
 */
export function isWebGL2Supported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/**
 * 获取设备像素比（用于高DPI渲染）
 */
export function getDevicePixelRatio(): number {
  return typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
}
