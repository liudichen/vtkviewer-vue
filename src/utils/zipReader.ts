/**
 * ZIP 文件读取器工具
 * 支持两种 ZIP 格式：
 * 1. VTK.js 原生 ZIP (.vtkjs) - 包含 index.json 场景描述
 * 2. 通用 ZIP 包 - 包含 OBJ/MTL/贴图等文件
 */

import vtkOBJReader from '@kitware/vtk.js/IO/Misc/OBJReader'
import vtkMTLReader from '@kitware/vtk.js/IO/Misc/MTLReader'
import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader'
import vtkPLYReader from '@kitware/vtk.js/IO/Geometry/PLYReader'
import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader'
import vtkXMLImageDataReader from '@kitware/vtk.js/IO/XML/XMLImageDataReader'
import DataAccessHelper from '@kitware/vtk.js/IO/Core/DataAccessHelper'
import vtkHttpDataSetReader from '@kitware/vtk.js/IO/Core/HttpDataSetReader'

import { unzipSync, strFromU8 } from 'fflate'

import { i18n } from '@/core'

/** ZIP 解压后的文件映射 */
interface ZipFiles {
  [path: string]: Uint8Array
}

/** OBJ+MTL 单个材质组的输出 */
interface ObjOutput {
  /** PolyData 数据 */
  polyData: any
  /** 材质组名称（来自 OBJ usemtl 指令） */
  name: string
}

/** OBJ+MTL 解析结果 */
interface ObjParseResult {
  /** 多个材质组的输出（splitMode: 'usemtl'） */
  outputs: ObjOutput[]
  /** MTL Reader 实例（已解析材质和纹理） */
  mtlReader?: any
}

/**
 * 解压 ZIP 文件
 * @param arrayBuffer ZIP 文件的 ArrayBuffer 数据
 * @returns 解压后的文件映射
 */
export function decompressZip(arrayBuffer: ArrayBuffer): ZipFiles {
  const uint8Array = new Uint8Array(arrayBuffer)
  return unzipSync(uint8Array)
}

/**
 * 检测是否为 VTK.js 原生 ZIP 格式（.vtkjs）
 * 判断依据：解压后包含 index.json 文件
 * @param files 解压后的文件映射
 * @returns 是否为 vtkjs 格式
 */
export function isVtkJsZip(files: ZipFiles): boolean {
  return Object.keys(files).some(
    path => path.endsWith('index.json') || path.endsWith('index.json/')
  )
}

/**
 * 查找指定扩展名的文件
 * @param files 文件映射
 * @param extensions 扩展名列表（如 ['.obj', '.mtl']）
 * @returns 匹配的文件路径列表
 */
function findFilesByExtension(files: ZipFiles, extensions: string[]): string[] {
  return Object.keys(files).filter(path => {
    const lowerPath = path.toLowerCase()
    return extensions.some(ext => lowerPath.endsWith(ext))
  })
}

/**
 * 解析 VTK.js 原生 ZIP 场景
 * 从 index.json 中提取场景信息和数据
 * @param files 解压后的文件映射
 * @returns 解析结果
 */
export function parseVtkJsScene(files: ZipFiles): {
  scene: any
  dataMap: Map<string, Uint8Array>
} {
  // 查找 index.json
  const indexPath = Object.keys(files).find(path => path.endsWith('index.json'))

  if (!indexPath) {
    throw new Error(i18n.translate('vtkviewer.zip.noIndexJson'))
  }

  // 解析场景描述
  const sceneJson = strFromU8(files[indexPath])
  const scene = JSON.parse(sceneJson)

  // 构建数据映射（去除路径前缀，统一使用小写键名）
  const dataMap = new Map<string, Uint8Array>()
  const basePath = indexPath.replace(/index\.json$/, '')

  Object.entries(files).forEach(([path, data]) => {
    if (path !== indexPath) {
      // 存储两种路径：完整路径和相对路径
      dataMap.set(path, data)
      if (basePath && path.startsWith(basePath)) {
        const relativePath = path.substring(basePath.length)
        dataMap.set(relativePath, data)
      }
    }
  })

  return { scene, dataMap }
}

/**
 * 从 VTK.js 场景中提取主数据
 * 使用 HttpDataSetReader + JSZipDataAccessHelper 加载数据
 * @param scene 场景描述对象
 * @param arrayBuffer 原始 ZIP ArrayBuffer 数据
 * @returns PolyData 或其他 VTK 数据对象
 */
export async function extractVtkJsData(scene: any, arrayBuffer: ArrayBuffer): Promise<any> {
  if (!scene.scene || !Array.isArray(scene.scene) || scene.scene.length === 0) {
    throw new Error(i18n.translate('vtkviewer.zip.emptyScene'))
  }

  // 获取第一个场景项
  const firstItem = scene.scene[0]

  // 检查数据集类型
  if (!firstItem.type) {
    throw new Error(i18n.translate('vtkviewer.zip.noDataType'))
  }

  // 根据类型处理
  const itemType = firstItem.type.toLowerCase()

  if (itemType.includes('httpdatasetreader') || itemType.includes('vtkhttpdatasetreader')) {
    // 使用 VTK.js 的 HttpDataSetReader + JSZipDataAccessHelper 加载
    return loadWithHttpDataSetReader(arrayBuffer, firstItem)
  }

  // 如果是其他类型，尝试查找已知格式文件
  const files = decompressZip(arrayBuffer)
  const knownExtensions = [
    { ext: 'obj', format: 'obj' },
    { ext: 'stl', format: 'stl' },
    { ext: 'ply', format: 'ply' },
    { ext: 'vtp', format: 'vtp' },
    { ext: 'vti', format: 'vti' }
  ]

  for (const { ext, format } of knownExtensions) {
    const filePaths = Object.keys(files).filter(key => key.toLowerCase().endsWith(`.${ext}`))

    if (filePaths.length > 0) {
      const data = files[filePaths[0]]
      return parseDataByFormat(data.buffer as ArrayBuffer, format)
    }
  }

  throw new Error(i18n.translate('vtkviewer.zip.cannotParseScene') + `: ${firstItem.type}`)
}

/**
 * 使用 HttpDataSetReader 从 ZIP 加载数据
 * @param arrayBuffer ZIP 文件的 ArrayBuffer
 * @param sceneItem 场景项配置
 * @returns VTK 数据对象
 */
async function loadWithHttpDataSetReader(arrayBuffer: ArrayBuffer, sceneItem: any): Promise<any> {
  // 创建 ZIP 数据访问助手，使用 callback 等待就绪
  const dataAccessHelper = await new Promise<any>((resolve, _reject) => {
    const helper = DataAccessHelper.get('zip', {
      zipContent: arrayBuffer,
      callback: () => {
        // ZIP 解压完成后，助手已就绪
        resolve(helper)
      }
    })
  })

  // 创建 HttpDataSetReader
  const reader = vtkHttpDataSetReader.newInstance({
    dataAccessHelper
  } as any)

  // 构建数据集 URL
  // .vtkjs 文件中，数据通常在 sceneItem[sceneItem.type].url 指定的路径
  const datasetUrl = sceneItem[sceneItem.type]?.url || ''

  // 加载数据
  return new Promise((resolve, reject) => {
    reader
      .setUrl(datasetUrl, { loadData: true })
      .then(() => {
        const data = reader.getOutputData()
        if (data) {
          resolve(data)
        } else {
          reject(new Error(i18n.translate('vtkviewer.zip.noValidData')))
        }
      })
      .catch((err: Error) => {
        reject(new Error(i18n.translate('vtkviewer.zip.loadFailed') + `: ${err.message}`))
      })
  })
}

/**
 * 根据格式解析数据
 * @param buffer 数据 ArrayBuffer
 * @param format 数据格式
 * @returns VTK 数据对象
 */
async function parseDataByFormat(buffer: ArrayBuffer, format: string): Promise<any> {
  switch (format) {
    case 'obj': {
      const text = new TextDecoder().decode(buffer)
      const reader = vtkOBJReader.newInstance()
      reader.parseAsText(text)
      return reader.getOutputData()
    }
    case 'stl': {
      const reader = vtkSTLReader.newInstance()
      reader.parseAsArrayBuffer(buffer)
      return reader.getOutputData()
    }
    case 'ply': {
      const reader = vtkPLYReader.newInstance()
      reader.parseAsArrayBuffer(buffer)
      return reader.getOutputData()
    }
    case 'vtp': {
      const reader = vtkXMLPolyDataReader.newInstance()
      reader.parseAsArrayBuffer(buffer)
      return reader.getOutputData()
    }
    case 'vti': {
      const reader = vtkXMLImageDataReader.newInstance()
      reader.parseAsArrayBuffer(buffer)
      return reader.getOutputData()
    }
    default:
      throw new Error(i18n.translate('vtkviewer.zip.unsupportedFormat') + `: ${format}`)
  }
}

/**
 * 解析通用 ZIP 包中的 OBJ 模型
 * 支持 OBJ + MTL + 贴图的组合
 * 注意：此函数为异步，因为 MTLReader.setImageSrc() 返回 Promise
 * @param files 解压后的文件映射
 * @returns 解析结果（Promise）
 */
export async function parseObjFromZip(files: ZipFiles): Promise<ObjParseResult> {
  // 查找 OBJ 文件
  const objPaths = findFilesByExtension(files, ['.obj'])
  if (objPaths.length === 0) {
    throw new Error(i18n.translate('vtkviewer.zip.noObjFile'))
  }

  // 使用第一个找到的 OBJ 文件
  const objPath = objPaths[0]
  const objData = files[objPath]
  const objText = strFromU8(objData)

  // 解析 OBJ，使用 splitMode: 'usemtl' 使每个材质组成为独立输出
  const objReader = vtkOBJReader.newInstance({ splitMode: 'usemtl' })
  objReader.parseAsText(objText)

  // 获取所有输出端口（每个 usemtl 材质组一个）
  const outputs: ObjOutput[] = []
  const outputCount = objReader.getNumberOfOutputPorts()
  for (let i = 0; i < outputCount; i++) {
    const polyData = objReader.getOutputData(i)
    const name = polyData.get('name').name || ''
    outputs.push({ polyData, name })
  }
  // 查找 MTL 文件
  let mtlReader: any = undefined
  const mtlPaths = findFilesByExtension(files, ['.mtl'])

  if (mtlPaths.length > 0) {
    // 优先查找与 OBJ 同名的 MTL 文件
    const objBaseName = objPath.replace(/\.obj$/i, '')
    const matchingMtl =
      mtlPaths.find(mtlPath => mtlPath.replace(/\.mtl$/i, '') === objBaseName) || mtlPaths[0]

    const mtlContent = strFromU8(files[matchingMtl])

    // 创建 MTL Reader 并解析
    mtlReader = vtkMTLReader.newInstance()
    mtlReader.parseAsText(mtlContent)

    // 获取 MTL 引用的图片列表（来自 map_Kd 等）和 ZIP 中的图片文件
    const mtlImages = mtlReader.listImages()
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tga', '.tiff']
    const imagePaths = findFilesByExtension(files, imageExtensions)

    // 构建文件名到 ZIP 路径的映射
    const imageFileMap = new Map<string, string>()
    imagePaths.forEach(imagePath => {
      // 仅文件名（不含路径）
      const fileName = imagePath.split('/').pop() || imagePath
      imageFileMap.set(fileName, imagePath)
      // 也保留完整路径
      imageFileMap.set(imagePath, imagePath)
    })

    // 收集所有图片加载 Promise
    const imageLoadPromises: Promise<void>[] = []

    // 使用 MTL 中引用的图片名称来精确匹配
    for (const mtlImageName of mtlImages) {
      // 先尝试 MTL 中引用的原始名称
      let matchedPath = imageFileMap.get(mtlImageName)

      if (!matchedPath) {
        // 尝试仅文件名匹配
        const mtlBaseName = mtlImageName.split(/[\\/]/).pop() || mtlImageName
        matchedPath = imageFileMap.get(mtlBaseName)
      }

      if (!matchedPath) {
        // 尝试模糊匹配（不区分大小写）
        const mtlBaseLower = (mtlImageName.split(/[\\/]/).pop() || mtlImageName).toLowerCase()
        for (const [key, path] of imageFileMap) {
          if (key.split(/[\\/]/).pop()?.toLowerCase() === mtlBaseLower) {
            matchedPath = path
            break
          }
        }
      }

      if (matchedPath) {
        const imageData = files[matchedPath]
        const base64 = uint8ArrayToBase64(imageData)
        const ext = matchedPath.split('.').pop()?.toLowerCase() || 'png'
        const mimeType = getMimeType(ext)
        const dataUrl = `data:${mimeType};base64,${base64}`

        // 使用 MTL 中引用的原始名称来设置（确保精确匹配）
        const loadPromise = mtlReader.setImageSrc(mtlImageName, dataUrl).catch((err: Error) => {
          console.warn(
            `[ZipReader] ${i18n.translate('vtkviewer.zip.textureLoadFailed')}: ${mtlImageName}`,
            err
          )
        })

        imageLoadPromises.push(loadPromise)
      } else {
        console.warn(
          `[ZipReader] ${i18n.translate('vtkviewer.zip.textureNotFound')}: ${mtlImageName}`
        )
      }
    }

    // 等待所有图片加载完成
    if (imageLoadPromises.length > 0) {
      await Promise.all(imageLoadPromises)
    }
  }

  return {
    outputs,
    mtlReader
  }
}

/**
 * 解析通用 ZIP 包
 * 自动检测内部文件格式并解析
 * @param files 解压后的文件映射
 * @returns 解析后的数据对象（如果是 OBJ+MTL，会包含 mtlReader）
 */
export async function parseGenericZip(files: ZipFiles): Promise<any> {
  // 按优先级查找 3D 模型文件
  const formatPriority = [
    { extensions: ['.obj'], format: 'obj' },
    { extensions: ['.stl'], format: 'stl' },
    { extensions: ['.ply'], format: 'ply' },
    { extensions: ['.vtp'], format: 'vtp' },
    { extensions: ['.vti'], format: 'vti' },
    { extensions: ['.glb'], format: 'glb' }
  ]

  for (const { extensions, format } of formatPriority) {
    const filePaths = findFilesByExtension(files, extensions)
    if (filePaths.length > 0) {
      const data = files[filePaths[0]]

      if (format === 'obj') {
        // OBJ 格式需要文本解析，并且可能有 MTL 和贴图
        const result = await parseObjFromZip(files)
        // 返回带有 outputs 和 mtlReader 的包装对象
        return {
          outputs: result.outputs,
          mtlReader: result.mtlReader,
          _isObjWithMtl: true
        }
      }

      return parseDataByFormat(data.buffer as ArrayBuffer, format)
    }
  }

  throw new Error(i18n.translate('vtkviewer.zip.noSupportedModel'))
}

/**
 * Uint8Array 转 Base64
 * @param uint8Array Uint8Array 数据
 * @returns Base64 字符串
 */
function uint8ArrayToBase64(uint8Array: Uint8Array): string {
  let binary = ''
  const len = uint8Array.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }
  return btoa(binary)
}

/**
 * 根据文件扩展名获取 MIME 类型
 * @param ext 文件扩展名（不含点号）
 * @returns MIME 类型字符串
 */
function getMimeType(ext: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    bmp: 'image/bmp',
    tga: 'image/x-tga',
    tiff: 'image/tiff',
    tif: 'image/tiff'
  }
  return mimeTypes[ext] || 'application/octet-stream'
}
