/**
 * VTK.js 缺失模块的类型声明
 *
 * 本文件为 @kitware/vtk.js 中缺少 .d.ts 类型声明的模块提供类型定义。
 * 基于源码分析生成，确保类型安全。
 */

declare module '@kitware/vtk.js/Filters/General/MoleculeToRepresentation' {
  import { vtkObject, vtkAlgorithm } from '@kitware/vtk.js/interfaces'

  /**
   * MoleculeToRepresentation 初始值配置
   */
  export interface IMoleculeToRepresentationInitialValues {
    /** 原子半径缩放因子，默认 0.3 */
    atomicRadiusScaleFactor?: number
    /** 化学键半径，默认 0.075 */
    bondRadius?: number
    /** 化学键增量因子，默认 0.6 */
    deltaBondFactor?: number
    /** 隐藏的元素（逗号分隔的元素符号），默认 "" */
    hideElements?: string
    /** 半径类型，默认 "radiusVDW" */
    radiusType?: string
    /** 球体缩放数组名称，默认 "radius" */
    sphereScaleArrayName?: string
    /** 容差，默认 0.45 */
    tolerance?: number
  }

  type vtkMoleculeToRepresentationBase = vtkObject & vtkAlgorithm

  /**
   * vtkMoleculeToRepresentation - 将分子数据转换为可渲染的几何表示
   *
   * 该过滤器接受 vtkMolecule 作为输入，输出两个端口：
   * - 端口 0：原子球体 PolyData（包含 radius scale array）
   * - 端口 1：化学键棍棒 PolyData（包含 stickScales 和 orientation arrays）
   */
  export interface vtkMoleculeToRepresentation extends vtkMoleculeToRepresentationBase {
    getAtomicRadiusScaleFactor(): number
    getBondRadius(): number
    getDeltaBondFactor(): number
    getHideElements(): string
    getRadiusType(): string
    getSphereScaleArrayName(): string
    getTolerance(): number
    setAtomicRadiusScaleFactor(atomicRadiusScaleFactor: number): boolean
    setBondRadius(bondRadius: number): boolean
    setDeltaBondFactor(deltaBondFactor: number): boolean
    setHideElements(hideElements: string): boolean
    setRadiusType(radiusType: string): boolean
    setSphereScaleArrayName(sphereScaleArrayName: string): boolean
    setTolerance(tolerance: number): boolean
  }

  export function extend(
    publicAPI: object,
    model: object,
    initialValues?: IMoleculeToRepresentationInitialValues
  ): void

  export function newInstance(
    initialValues?: IMoleculeToRepresentationInitialValues
  ): vtkMoleculeToRepresentation

  const vtkMoleculeToRepresentation: {
    newInstance: typeof newInstance
    extend: typeof extend
  }
  export default vtkMoleculeToRepresentation
}

/** draco3d 浏览器版类型声明 */
declare module 'draco3d' {
  /** 创建 Draco 解码器模块的工厂函数 */
  export function createDecoderModule(): Promise<{
    Decoder: new () => any
  }>
}
