/**
 * 格式检测器（迁移自FormatRegistry）
 * 提供统一的格式检测接口，支持扩展名+魔数+内容分析
 */

export interface FormatDetectionResult {
  format: string
  confidence: number // 0-1，置信度
  method: 'extension' | 'magic' | 'content'
}

export class FormatDetector {
  private static readonly MAGIC_NUMBERS: Record<string, { magic: Uint8Array; offset: number }[]> = {
    stl: [
      { magic: new Uint8Array([0x53, 0x54, 0x4c, 0x42]), offset: 0 } // "STLB"
    ],
    // glTF JSON 无魔数，通过内容分析检测（{ + "asset"）
    // GLB 的魔数与 "glTF" 文本相同，但后面跟着 binary version header
    glb: [
      { magic: new Uint8Array([0x67, 0x6c, 0x54, 0x46]), offset: 0 } // "glTF" (GLB binary header)
    ],
    drc: [
      { magic: new Uint8Array([0x44, 0x52, 0x41, 0x43, 0x4f]), offset: 0 } // "DRACO"
    ],
    pdb: [
      { magic: new Uint8Array([0x48, 0x45, 0x41, 0x44, 0x45, 0x52]), offset: 0 } // "HEADER"
    ],
    vtk: [
      { magic: new Uint8Array([0x23, 0x20, 0x76, 0x74, 0x6b]), offset: 0 } // "# vtk"
    ],
    obj: [
      { magic: new Uint8Array([0x23, 0x20, 0x4f, 0x62, 0x6a, 0x65, 0x63, 0x74]), offset: 0 } // "# Object"
    ],
    ply: [
      { magic: new Uint8Array([0x70, 0x6c, 0x79]), offset: 0 } // "ply"
    ],
    zip: [
      { magic: new Uint8Array([0x50, 0x4b, 0x03, 0x04]), offset: 0 } // "PK.."
    ]
    // 注意：VTK XML 格式（VTP/VTU/VTI/VTR/VTS 等）都以 <VTKFile 开头，
    // 无法通过魔术数字区分，需要解析 type 属性，见 analyzeContent 方法。
  }

  /** VTK XML type 属性到格式的映射 */
  private static readonly VTK_XML_TYPE_MAP: Record<string, string> = {
    PolyData: 'vtp',
    UnstructuredGrid: 'vtu',
    ImageData: 'vti',
    RectilinearGrid: 'vtr',
    StructuredGrid: 'vts'
  }

  private static readonly EXTENSION_MAP: Record<string, string> = {
    '.stl': 'stl',
    '.stla': 'stl',
    '.stlb': 'stl',
    '.obj': 'obj',
    '.ply': 'ply',
    '.vtp': 'vtp',
    '.vtu': 'vtu',
    '.vti': 'vti',
    '.vtr': 'vtr',
    '.vts': 'vts',
    '.glb': 'glb',
    '.drc': 'drc',
    '.pdb': 'pdb',
    '.zip': 'zip',
    '.vtkjs': 'zip',
    '.obz': 'zip'
  }

  /**
   * 根据文件扩展名检测格式
   * @param filename 可选，文件名
   */
  static detectFormat(filename?: string): FormatDetectionResult | null {
    if (!filename) return null
    const ext = this.getExtension(filename).toLowerCase()
    const format = this.EXTENSION_MAP[ext]

    if (format) {
      return { format, confidence: 0.8, method: 'extension' }
    }

    return null
  }

  /**
   * 根据文件内容检测格式
   */
  static detectFormatFromBuffer(buffer: ArrayBuffer): FormatDetectionResult | null {
    const uint8 = new Uint8Array(buffer.slice(0, 128)) // 读取前128字节（VTK XML需要解析type属性）

    // 1. 特殊处理 VTK XML 格式（需要解析 type 属性）
    const vtkResult = this.detectVtkXmlFormat(uint8)
    if (vtkResult) return vtkResult

    // 2. 通用魔术数字检测
    for (const [format, magics] of Object.entries(this.MAGIC_NUMBERS)) {
      for (const { magic, offset } of magics) {
        if (this.matchMagic(uint8, magic, offset)) {
          return { format, confidence: 0.95, method: 'magic' }
        }
      }
    }

    // 3. 尝试内容分析
    const contentResult = this.analyzeContent(uint8)
    if (contentResult) {
      return contentResult
    }

    return null
  }

  /**
   * 检测 VTK XML 格式（通过解析 type 属性区分 VTP/VTU/VTI 等）
   *
   * VTK XML 文件都以 <VTKFile 开头，但 type 属性不同：
   * - VTP: <VTKFile type="PolyData" ...
   * - VTU: <?xml ...><VTKFile type="UnstructuredGrid" ...
   * - VTI: <VTKFile type="ImageData" ...
   */
  private static detectVtkXmlFormat(uint8: Uint8Array): FormatDetectionResult | null {
    const text = new TextDecoder().decode(uint8)

    // 查找 <VTKFile 标记（可能在开头或 <?xml 之后）
    const vtkFileIndex = text.indexOf('<VTKFile')
    if (vtkFileIndex === -1) return null

    // 从 <VTKFile 开始解析 type 属性
    const afterVtkFile = text.substring(vtkFileIndex)
    const typeMatch = afterVtkFile.match(/type\s*=\s*"([^"]+)"/)
    if (!typeMatch) return null

    const vtkType = typeMatch[1]
    const format = this.VTK_XML_TYPE_MAP[vtkType]
    if (format) {
      return { format, confidence: 0.98, method: 'magic' }
    }

    // 未知的 VTK XML 类型
    return null
  }

  /**
   * 综合检测格式（优先使用内容检测）
   * @param filename 可选，文件名（用于扩展名检测）
   * @param buffer 可选，文件内容（用于魔术数字和内容分析）
   */
  static detect(filename?: string, buffer?: ArrayBuffer): FormatDetectionResult | null {
    // 1. 首先尝试内容检测（更准确）
    if (buffer) {
      const contentResult = this.detectFormatFromBuffer(buffer)
      if (contentResult) {
        return contentResult
      }
    }

    // 2. 然后尝试扩展名检测
    if (filename) {
      const extResult = this.detectFormat(filename)
      if (extResult) {
        return extResult
      }
    }

    return null
  }

  /**
   * 获取文件扩展名
   */
  private static getExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.')
    if (lastDot === -1) return ''
    return filename.substring(lastDot)
  }

  /**
   * 匹配魔术数字
   */
  private static matchMagic(data: Uint8Array, magic: Uint8Array, offset: number): boolean {
    if (data.length < offset + magic.length) {
      return false
    }

    for (let i = 0; i < magic.length; i++) {
      if (data[offset + i] !== magic[i]) {
        return false
      }
    }

    return true
  }

  /**
   * 分析内容特征
   */
  private static analyzeContent(_data: Uint8Array): FormatDetectionResult | null {
    return null
  }

  /**
   * 根据格式ID列表构建 HTML input[accept] 属性字符串。
   * 从 EXTENSION_MAP 动态查找对应扩展名，无硬编码。
   *
   * @param formats 格式ID数组（如 ['stl', 'obj', 'ply']）
   * @returns HTML accept 属性值（如 ".stl,.stla,.stlb,.obj,.ply"）
   */
  static getAcceptedExtensions(formats: string[]): string {
    const inSet = new Set(formats.map(f => f.toLowerCase()))
    const extensions = Object.entries(this.EXTENSION_MAP)
      .filter(([, fmt]) => inSet.has(fmt))
      .map(([ext]) => ext)
    return [...new Set(extensions)].join(',')
  }
}
