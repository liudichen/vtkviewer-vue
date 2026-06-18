/**
 * VTU (VTK UnstructuredGrid) 文件加载器
 *
 * 解析 VTU 格式的 ArrayBuffer，提取几何数据并转换为 vtkPolyData 用于渲染。
 * 支持 raw 和 base64 编码的附加数据，以及 zlib 压缩。
 *
 * 参考实现：https://github.com/SilentCodeSamurai/vtk-renderer-js
 */

import Base64 from '@kitware/vtk.js/Common/Core/Base64'
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData'
import vtkXMLReader from '@kitware/vtk.js/IO/XML/XMLReader'
import { decompressSync } from 'fflate'

/** 点数据数组信息 */
interface PointArrayInfo {
  name: string
  components: number
}

/** VTU 加载结果 */
export interface LoadedVtuModel {
  polyData: any // vtkPolyData
  pointArrays: PointArrayInfo[]
}

/** XMLReader 静态方法类型 */
interface XmlReaderStatics {
  processDataArray: (
    size: number,
    dataArrayElem: HTMLElement,
    compressor: string,
    byteOrder: string,
    headerType: string,
    binaryBuffer: ArrayBuffer
  ) => { values: ArrayLike<number>; numberOfComponents: number }
  processFieldData: (
    size: number,
    fieldElem: HTMLElement,
    fieldContainer: HTMLElement,
    compressor: string,
    byteOrder: string,
    headerType: string,
    binaryBuffer: ArrayBuffer
  ) => void
}

/** 访问 vtkXMLReader 的静态方法 */
const xmlReaderStatics = vtkXMLReader as unknown as XmlReaderStatics

/** 头部字节大小映射 */
const HEADER_BYTE_SIZE: Record<string, number> = {
  UInt32: 4,
  UInt64: 8
}

/**
 * 读取压缩数据的头部信息
 * @param bytes 压缩数据的 Uint8Array
 * @param headerType 头部类型（UInt32 或 UInt64）
 * @returns 头部信息数组 [headerSize, nbBlocks, s1, s2, ...blockSizes]
 */
function readHeaderWords(bytes: Uint8Array, headerType: string): number[] {
  if (headerType === 'UInt64') {
    const uint32 = new Uint32Array(bytes.buffer, bytes.byteOffset, 6)
    const nbBlocks = uint32[0]
    const s1 = uint32[2]
    const s2 = uint32[4]
    const result = [8, nbBlocks, s1, s2]
    const blockSizes = new Uint32Array(bytes.buffer, bytes.byteOffset + 24, nbBlocks * 2)
    for (let i = 0; i < nbBlocks; i++) {
      result.push(blockSizes[i * 2])
    }
    return result
  }

  const uint32 = new Uint32Array(bytes.buffer, bytes.byteOffset, 3)
  const nbBlocks = uint32[0]
  const s1 = uint32[1]
  const s2 = uint32[2]
  const result = [4, nbBlocks, s1, s2]
  const blockSizes = new Uint32Array(bytes.buffer, bytes.byteOffset + 12, nbBlocks)
  for (let i = 0; i < nbBlocks; i++) {
    result.push(blockSizes[i])
  }
  return result
}

/**
 * 解压 zlib 压缩的数据块
 * @param bytes 压缩数据
 * @param headerType 头部类型
 * @returns 解压后的数据
 */
function decompressZLibBlock(bytes: Uint8Array, headerType: string): Uint8Array {
  const header = readHeaderWords(bytes, headerType)
  const nbBlocks = header[1]
  const s1 = header[2]
  const s2 = header[3]

  let dataByteLength = 0
  if (nbBlocks > 0) {
    dataByteLength = s2 === 0 ? nbBlocks * s1 : (nbBlocks - 1) * s1 + s2
  }

  const output = new Uint8Array(dataByteLength)
  let outputOffset = 0
  let offset = (header.length - 1) * header[0]

  // 跳过到 zlib 数据开始位置 (0x78)
  while (offset < bytes.length && bytes[offset] !== 0x78) {
    offset++
  }

  for (let i = 0; i < nbBlocks; i++) {
    const blockSize = header[4 + i]
    const compressedBlock = bytes.slice(offset, offset + blockSize)
    const uncompressedBlock = decompressSync(compressedBlock)
    output.set(uncompressedBlock, outputOffset)
    outputOffset += uncompressedBlock.length
    offset += blockSize
  }

  return output
}

/**
 * 在数据前添加长度头部
 * @param data 原始数据
 * @param headerType 头部类型
 * @returns 带头部的数据
 */
function prependLengthHeader(data: Uint8Array, headerType: string): Uint8Array {
  const headerSize = HEADER_BYTE_SIZE[headerType] ?? 4
  const out = new Uint8Array(headerSize + data.length)
  const view = new DataView(out.buffer)
  view.setUint32(0, data.length, true)
  out.set(data, headerSize)
  return out
}

/**
 * 标准化附加数据
 * 处理附加数据的解码、解压和重定位
 */
function normalizeAppendedData(
  rootElem: Element,
  encoding: 'raw' | 'base64',
  appended: ArrayBuffer | string,
  compressor: string,
  headerType: string
): ArrayBuffer {
  const arrays = Array.from(rootElem.querySelectorAll("[format='appended'][offset]"))
    .map(node => ({
      node,
      offset: Number(node.getAttribute('offset') ?? '0')
    }))
    .sort((a, b) => a.offset - b.offset)

  const decodedChunks: Uint8Array[] = []
  for (let i = 0; i < arrays.length; i++) {
    const offset = arrays[i].offset
    const nextOffset =
      i === arrays.length - 1
        ? encoding === 'base64'
          ? (appended as string).length
          : (appended as ArrayBuffer).byteLength
        : arrays[i + 1].offset

    let chunk: Uint8Array
    if (encoding === 'base64') {
      const chunkText = (appended as string).substring(offset, nextOffset)
      chunk = new Uint8Array(Base64.toArrayBuffer(chunkText))
    } else {
      chunk = new Uint8Array((appended as ArrayBuffer).slice(offset, nextOffset))
    }

    if (compressor === 'vtkZLibDataCompressor') {
      chunk = prependLengthHeader(decompressZLibBlock(chunk, headerType), headerType)
    }
    decodedChunks.push(chunk)
  }

  const totalLength = decodedChunks.reduce((acc, arr) => acc + arr.length, 0)
  const buffer = new ArrayBuffer(totalLength)
  const view = new Uint8Array(buffer)
  let writeOffset = 0
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].node.setAttribute('offset', String(writeOffset))
    view.set(decodedChunks[i], writeOffset)
    writeOffset += decodedChunks[i].length
  }

  return buffer
}

/**
 * 从 ArrayBuffer 中提取附加数据
 * 分离 XML 文本和二进制附加数据
 */
function extractAppendedData(arrayBuffer: ArrayBuffer): {
  xmlText: string
  appendedEncoding?: 'raw' | 'base64'
  appendedPayload?: ArrayBuffer | string
} {
  const decoder = new TextDecoder('latin1')
  const text = decoder.decode(arrayBuffer)

  const openTagRegex = /<AppendedData\s+encoding="([^"]+)"[^>]*>/i
  const openTagMatch = openTagRegex.exec(text)
  if (!openTagMatch) {
    return { xmlText: text }
  }

  const encoding = openTagMatch[1].toLowerCase()
  if (encoding !== 'raw' && encoding !== 'base64') {
    return { xmlText: text }
  }

  const openTagStart = openTagMatch.index
  const dataStart = openTagStart + openTagMatch[0].length
  const closeTagStart = text.indexOf('</AppendedData>', dataStart)
  if (closeTagStart < 0) {
    return { xmlText: text }
  }

  if (encoding === 'base64') {
    const appendedText = text.slice(dataStart, closeTagStart).trim()
    // VTK 附加数据可能以前缀 '_' 开头
    const encodedData = appendedText.startsWith('_') ? appendedText.slice(1) : appendedText
    return {
      xmlText: text,
      appendedEncoding: 'base64',
      appendedPayload: encodedData
    }
  }

  if (encoding === 'raw') {
    let binaryStart = dataStart
    while (binaryStart < closeTagStart && /\s/.test(text[binaryStart])) {
      binaryStart++
    }
    if (text[binaryStart] === '_') {
      binaryStart++
    }
    return {
      xmlText: text.slice(0, binaryStart) + text.slice(closeTagStart),
      appendedEncoding: 'raw',
      appendedPayload: arrayBuffer.slice(binaryStart, closeTagStart)
    }
  }

  return { xmlText: text }
}

/**
 * 获取单元的面信息
 * @param cellType VTK 单元类型 ID
 * @param ids 单元的顶点 ID 数组
 * @returns 面的顶点 ID 数组
 */
function getCellFaces(cellType: number, ids: number[]): number[][] {
  switch (cellType) {
    case 5: // VTK_TRIANGLE
      return ids.length >= 3 ? [[ids[0], ids[1], ids[2]]] : []
    case 7: // VTK_POLYGON
      return ids.length >= 3 ? [ids] : []
    case 9: // VTK_QUAD
      return ids.length >= 4 ? [[ids[0], ids[1], ids[2], ids[3]]] : []
    case 10: // VTK_TETRA
      if (ids.length < 4) return []
      return [
        [ids[0], ids[2], ids[1]],
        [ids[0], ids[1], ids[3]],
        [ids[1], ids[2], ids[3]],
        [ids[2], ids[0], ids[3]]
      ]
    case 11: // VTK_VOXEL
      if (ids.length < 8) return []
      return [
        [ids[0], ids[1], ids[3], ids[2]],
        [ids[4], ids[6], ids[7], ids[5]],
        [ids[0], ids[4], ids[5], ids[1]],
        [ids[2], ids[3], ids[7], ids[6]],
        [ids[0], ids[2], ids[6], ids[4]],
        [ids[1], ids[5], ids[7], ids[3]]
      ]
    case 12: // VTK_HEXAHEDRON
      if (ids.length < 8) return []
      return [
        [ids[0], ids[3], ids[2], ids[1]],
        [ids[4], ids[5], ids[6], ids[7]],
        [ids[0], ids[1], ids[5], ids[4]],
        [ids[1], ids[2], ids[6], ids[5]],
        [ids[2], ids[3], ids[7], ids[6]],
        [ids[3], ids[0], ids[4], ids[7]]
      ]
    case 13: // VTK_WEDGE
      if (ids.length < 6) return []
      return [
        [ids[0], ids[2], ids[1]],
        [ids[3], ids[4], ids[5]],
        [ids[0], ids[1], ids[4], ids[3]],
        [ids[1], ids[2], ids[5], ids[4]],
        [ids[2], ids[0], ids[3], ids[5]]
      ]
    case 14: // VTK_PYRAMID
      if (ids.length < 5) return []
      return [
        [ids[0], ids[3], ids[2], ids[1]],
        [ids[0], ids[1], ids[4]],
        [ids[1], ids[2], ids[4]],
        [ids[2], ids[3], ids[4]],
        [ids[3], ids[0], ids[4]]
      ]
    default:
      return []
  }
}

/**
 * 构建表面多边形
 * 从单元连接信息中提取外表面（去除内部相邻面）
 *
 * @param connectivity 顶点连接数组
 * @param offsets 单元偏移数组
 * @param types 单元类型数组
 * @returns 表面多边形数据（适合 vtkPolyData 的 polys 格式）
 */
function buildSurfacePolys(
  connectivity: ArrayLike<number>,
  offsets: ArrayLike<number>,
  types: ArrayLike<number>
): Uint32Array {
  const faceMap = new Map<string, number[]>()
  let start = 0
  const cellCount = Math.min(offsets.length, types.length)

  for (let cellId = 0; cellId < cellCount; cellId++) {
    const end = Number(offsets[cellId])
    const ids: number[] = []
    for (let i = start; i < end; i++) {
      ids.push(Number(connectivity[i]))
    }
    start = end

    const faces = getCellFaces(Number(types[cellId]), ids)
    for (const face of faces) {
      if (face.length < 3) continue
      // 排序顶点 ID 生成唯一键
      const key = [...face].sort((a, b) => a - b).join(',')
      if (faceMap.has(key)) {
        // 如果面已存在，说明是内部面，删除
        faceMap.delete(key)
      } else {
        faceMap.set(key, face)
      }
    }
  }

  // 构建 polys 数据格式：[npts, id0, id1, ..., npts, id0, id1, ...]
  const polys: number[] = []
  for (const face of faceMap.values()) {
    polys.push(face.length, ...face)
  }
  return Uint32Array.from(polys)
}

/**
 * 获取单个 XML 元素
 */
function getSingleElement(parent: Element | Document, tag: string): Element {
  const el = parent.getElementsByTagName(tag)[0]
  if (!el) {
    throw new Error(`Missing required XML tag: ${tag}`)
  }
  return el
}

/**
 * 从 ArrayBuffer 加载 VTU 文件
 *
 * @param fileBuffer VTU 文件的 ArrayBuffer
 * @returns 包含 vtkPolyData 和点数据数组信息的结果
 */
export function loadVtuFromArrayBuffer(fileBuffer: ArrayBuffer): LoadedVtuModel {
  const extracted = extractAppendedData(fileBuffer)
  const xmlText = extracted.xmlText
  const xml = new DOMParser().parseFromString(xmlText, 'text/xml')

  const vtkFile = getSingleElement(xml, 'VTKFile')
  if (vtkFile.getAttribute('type') !== 'UnstructuredGrid') {
    throw new Error('Only VTK UnstructuredGrid (.vtu) files are supported.')
  }

  const compressor = vtkFile.getAttribute('compressor') ?? ''
  const byteOrder = vtkFile.getAttribute('byte_order') ?? 'LittleEndian'
  const headerType = vtkFile.getAttribute('header_type') ?? 'UInt32'

  let binaryBuffer: ArrayBuffer | undefined
  const appendedDataElem = vtkFile.getElementsByTagName('AppendedData')[0] ?? null

  if (appendedDataElem && extracted.appendedEncoding && extracted.appendedPayload) {
    binaryBuffer = normalizeAppendedData(
      vtkFile,
      extracted.appendedEncoding,
      extracted.appendedPayload,
      compressor,
      headerType
    )
  }

  if (!binaryBuffer) {
    throw new Error('VTU appended binary data was not found.')
  }

  const unstructuredGrid = getSingleElement(vtkFile, 'UnstructuredGrid')
  const piece = getSingleElement(unstructuredGrid, 'Piece')

  const numberOfPoints = Number(piece.getAttribute('NumberOfPoints') ?? '0')
  const numberOfCells = Number(piece.getAttribute('NumberOfCells') ?? '0')

  if (numberOfPoints <= 0 || numberOfCells <= 0) {
    throw new Error('VTU file does not contain valid point/cell data.')
  }

  // 解析点坐标
  const pointsDataArray = getSingleElement(getSingleElement(piece, 'Points'), 'DataArray')
  const points = xmlReaderStatics.processDataArray(
    numberOfPoints,
    pointsDataArray as unknown as HTMLElement,
    compressor,
    byteOrder,
    headerType,
    binaryBuffer
  )

  // 解析单元数据
  const cellsElem = getSingleElement(piece, 'Cells')
  const cellDataArrays = Array.from(cellsElem.getElementsByTagName('DataArray'))

  const connectivityElem = cellDataArrays.find(el => el.getAttribute('Name') === 'connectivity')
  const offsetsElem = cellDataArrays.find(el => el.getAttribute('Name') === 'offsets')
  const typesElem = cellDataArrays.find(el => el.getAttribute('Name') === 'types')

  if (!connectivityElem || !offsetsElem || !typesElem) {
    throw new Error('VTU Cells section is missing connectivity/offsets/types arrays.')
  }

  const offsets = xmlReaderStatics.processDataArray(
    numberOfCells,
    offsetsElem as unknown as HTMLElement,
    compressor,
    byteOrder,
    headerType,
    binaryBuffer
  ).values as ArrayLike<number>

  const connectivitySize = Number(offsets[offsets.length - 1] ?? 0)
  const connectivity = xmlReaderStatics.processDataArray(
    connectivitySize,
    connectivityElem as unknown as HTMLElement,
    compressor,
    byteOrder,
    headerType,
    binaryBuffer
  ).values as ArrayLike<number>

  const types = xmlReaderStatics.processDataArray(
    numberOfCells,
    typesElem as unknown as HTMLElement,
    compressor,
    byteOrder,
    headerType,
    binaryBuffer
  ).values as ArrayLike<number>

  // 构建 PolyData
  const polyData = vtkPolyData.newInstance()
  polyData.getPoints().setData(points.values as unknown as number[], points.numberOfComponents)
  polyData.getPolys().setData(buildSurfacePolys(connectivity, offsets, types))

  // 处理点数据
  const pointDataElem = piece.getElementsByTagName('PointData')[0] ?? null
  if (pointDataElem) {
    xmlReaderStatics.processFieldData(
      numberOfPoints,
      pointDataElem as unknown as HTMLElement,
      polyData.getPointData() as unknown as HTMLElement,
      compressor,
      byteOrder,
      headerType,
      binaryBuffer
    )
  }

  // 收集点数据数组信息
  const pointArrays: PointArrayInfo[] = []
  if (pointDataElem) {
    const dataArrays = pointDataElem.getElementsByTagName('DataArray')
    for (const dataArray of Array.from(dataArrays)) {
      const name = dataArray.getAttribute('Name')
      if (!name) continue
      const components = Number(dataArray.getAttribute('NumberOfComponents') ?? '1')
      pointArrays.push({ name, components })
    }
  }

  return { polyData, pointArrays }
}
