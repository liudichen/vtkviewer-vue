/**
 * ColorBy 智能选择工具
 *
 * 提供自动识别和选择最佳颜色映射数组的功能，
 * 根据数组名称、分量数、数据位置等特征进行智能匹配。
 */

/** 颜色选项数据结构 */
export interface ColorByOption {
  label: string
  value: string // 格式：'PointData:arrayName' 或 'CellData:arrayName' 或 ':' (Solid Color)
}

/** 数组特征信息 */
export interface ArrayFeature {
  name: string
  location: 'PointData' | 'CellData'
  numberOfComponents: number
  dataRange?: [number, number]
}

/**
 * 数组名称优先级配置
 *
 * 评分规则：
 * - 高优先级（+10）：常见的科学数据名称
 * - 中优先级（+5）：可能有用的数据名称
 * - 低优先级（+1）：通用名称
 * - 排除（-100）：不应作为颜色映射的名称
 */
const NAME_PRIORITIES: { pattern: RegExp; score: number }[] = [
  // 高优先级：科学数据常见名称
  { pattern: /^(scalar|data|value|field)$/i, score: 10 },
  { pattern: /(temperature|temp|heat)/i, score: 10 },
  { pattern: /(pressure|stress|strain)/i, score: 10 },
  { pattern: /(displacement|deformation)/i, score: 10 },
  { pattern: /(elevation|height|depth)/i, score: 10 },
  { pattern: /(density|concentration)/i, score: 10 },
  { pattern: /(intensity|magnitude)/i, score: 10 },
  { pattern: /(velocity|speed|acceleration)/i, score: 10 },
  { pattern: /(curvature|torsion)/i, score: 10 },
  { pattern: /(error|residual|deviation)/i, score: 10 },

  // 中优先级：可能的颜色数据
  { pattern: /(color|colour|rgb|rgba)/i, score: 5 },
  { pattern: /(opacity|alpha|transparency)/i, score: 5 },

  // 低优先级：通用名称
  { pattern: /^(x|y|z|w)$/i, score: 1 },
  { pattern: /(index|id|label|type|material)/i, score: 1 },
  { pattern: /(position|coord|point)/i, score: 1 },

  // 排除：不应作为颜色映射的数据（兜底规则，供 selectBestColorArray 直接调用时使用）
  // collectColorableArrays 的 isColorableArray 是第一层过滤，此处是第二层兜底
  { pattern: /(normal|norm)/i, score: -100 },
  { pattern: /(texcoord|tcoord|texture)/i, score: -100 },
  { pattern: /(tangent|bitangent)/i, score: -100 },
  {
    pattern: /^(red|green|blue|alpha|diffuse_red|diffuse_green|diffuse_blue|rgb|rgba)$/i,
    score: -100
  },
  { pattern: /^attribute$/i, score: -100 }
]

/**
 * 计算数组名称的匹配分数
 * @param name 数组名称
 * @returns 匹配分数（越高越适合颜色映射）
 */
function getNameScore(name: string): number {
  let score = 0

  for (const { pattern, score: patternScore } of NAME_PRIORITIES) {
    if (pattern.test(name)) {
      score += patternScore
    }
  }

  // 如果没有匹配任何规则，默认给中等分数
  if (score === 0) {
    score = 3
  }

  return score
}

/**
 * 计算数组特征的综合匹配分数
 * @param feature 数组特征信息
 * @returns 匹配分数（越高越适合颜色映射）
 */
function calculateArrayScore(feature: ArrayFeature): number {
  let score = 0

  // 1. 名称匹配分数（权重最高）
  score += getNameScore(feature.name) * 10

  // 2. 分量数分数
  // 标量（1分量）最适合颜色映射
  if (feature.numberOfComponents === 1) {
    score += 20
  }
  // RGB（3分量）可以用 DIRECT_SCALARS
  else if (feature.numberOfComponents === 3) {
    score += 10
  }
  // RGBA（4分量）可以用 DIRECT_SCALARS
  else if (feature.numberOfComponents === 4) {
    score += 8
  }
  // 向量（2或3分量）不太适合颜色映射
  else {
    score += 2
  }

  // 3. 数据位置分数
  // PointData 比 CellData 更常见，通常更平滑
  if (feature.location === 'PointData') {
    score += 5
  } else {
    score += 3
  }

  // 4. 数据范围分数（如果可用）
  if (feature.dataRange) {
    const [min, max] = feature.dataRange
    const range = max - min
    // 有变化的数据更适合颜色映射
    if (range > 0) {
      score += 5
    }
    // 非零数据
    if (min !== 0 || max !== 0) {
      score += 2
    }
  }

  return score
}

/**
 * 智能选择最佳颜色映射数组
 *
 * @param options 颜色选项列表（不包含 Solid Color）
 * @param arrayFeatures 数组特征信息（可选，用于更精确的匹配）
 * @returns 最佳选项的 value，如果没有合适选项返回 ':'
 */
export function selectBestColorArray(
  options: ColorByOption[],
  arrayFeatures?: ArrayFeature[]
): string {
  // 过滤掉 Solid Color
  const dataOptions = options.filter(opt => opt.value !== ':')

  if (dataOptions.length === 0) {
    return ':'
  }

  // 如果只有一个数据选项，直接返回
  if (dataOptions.length === 1) {
    return dataOptions[0].value
  }

  // 如果有数组特征信息，使用智能选择
  if (arrayFeatures && arrayFeatures.length > 0) {
    let bestOption = dataOptions[0]
    let bestScore = -Infinity

    for (const option of dataOptions) {
      // 解析 option.value 获取 location 和 arrayName
      const [location, arrayName] = parseColorByValue(option.value)
      if (!location || !arrayName) continue

      // 查找对应的数组特征
      const feature = arrayFeatures.find(f => f.name === arrayName && f.location === location)

      if (feature) {
        const score = calculateArrayScore(feature)
        if (score > bestScore) {
          bestScore = score
          bestOption = option
        }
      }
    }

    // 如果所有选项都是负分（被排除的），返回 Solid Color
    if (bestScore < 0) {
      return ':'
    }
    return bestOption.value
  }

  // 没有特征信息时，使用简单的名称匹配
  let bestOption = dataOptions[0]
  let bestScore = -Infinity

  for (const option of dataOptions) {
    const [, arrayName] = parseColorByValue(option.value)
    if (arrayName) {
      const score = getNameScore(arrayName)
      if (score > bestScore) {
        bestScore = score
        bestOption = option
      }
    }
  }

  // 如果所有选项都是负分（被排除的），返回 Solid Color
  if (bestScore < 0) {
    return ':'
  }

  return bestOption.value
}

/**
 * 解析 ColorBy 选项的 value
 * @param value 格式：'PointData:arrayName' 或 'CellData:arrayName' 或 ':'
 * @returns [location, arrayName] 或 [null, null]
 */
export function parseColorByValue(value: string): ['PointData' | 'CellData' | null, string | null] {
  if (value === ':') {
    return [null, null]
  }

  const parts = value.split(':')
  if (parts.length !== 2) {
    return [null, null]
  }

  const [locationPart, arrayName] = parts

  // 统一转换为标准格式
  let location: 'PointData' | 'CellData' | null = null
  if (locationPart === 'PointData' || locationPart === 'point') {
    location = 'PointData'
  } else if (locationPart === 'CellData' || locationPart === 'cell') {
    location = 'CellData'
  }

  return [location, arrayName || null]
}

/**
 * 创建颜色选项（与官网 Geometry Viewer 标签格式一致）
 * @param arrayName 数组名称
 * @param location 数据位置
 * @returns 颜色选项对象
 */
export function createColorByOption(
  arrayName: string,
  location: 'PointData' | 'CellData'
): ColorByOption {
  const prefix = location === 'PointData' ? '(p)' : '(c)'
  return {
    label: `${prefix} ${arrayName}`,
    value: `${location}:${arrayName}`
  }
}

/**
 * 创建 Solid Color 选项
 * @returns Solid Color 选项对象
 */
export function createSolidColorOption(): ColorByOption {
  return {
    label: 'Solid Color',
    value: ':'
  }
}

/**
 * 从 PolyData 中收集颜色可用的数组
 *
 * @param pointData 点数据
 * @param cellData 单元数据
 * @returns 颜色选项列表和数组特征信息
 */
export function collectColorableArrays(
  pointData: any,
  cellData: any
): { options: ColorByOption[]; features: ArrayFeature[] } {
  const options: ColorByOption[] = [createSolidColorOption()]
  const features: ArrayFeature[] = []

  // 过滤掉不应作为颜色映射的数组
  const isColorableArray = (name: string): boolean => {
    const lowerName = name.toLowerCase()
    // 法线、纹理坐标、切线等几何辅助数据
    if (
      lowerName.includes('normal') ||
      lowerName.includes('texcoord') ||
      lowerName.includes('texture') ||
      lowerName.includes('tcoord') ||
      lowerName.includes('tangent') ||
      lowerName.includes('bitangent')
    ) {
      return false
    }
    // 顶点颜色分量（PLY 等格式的 red/green/blue/alpha 不是标量场数据）
    if (
      /^(red|green|blue|alpha|diffuse_red|diffuse_green|diffuse_blue|rgb|rgba)$/i.test(lowerName)
    ) {
      return false
    }
    // STL 文件中的 Attribute 等元数据数组
    if (/^attribute$/i.test(lowerName)) {
      return false
    }
    return true
  }

  // 收集 PointData 数组
  if (pointData) {
    const arrays = pointData.getArrays()
    for (const arr of arrays) {
      const name = arr.getName()
      if (isColorableArray(name)) {
        options.push(createColorByOption(name, 'PointData'))
        features.push({
          name,
          location: 'PointData',
          numberOfComponents: arr.getNumberOfComponents(),
          dataRange: arr.getRange()
        })
      }
    }
  }

  // 收集 CellData 数组
  if (cellData) {
    const arrays = cellData.getArrays()
    for (const arr of arrays) {
      const name = arr.getName()
      if (isColorableArray(name)) {
        options.push(createColorByOption(name, 'CellData'))
        features.push({
          name,
          location: 'CellData',
          numberOfComponents: arr.getNumberOfComponents(),
          dataRange: arr.getRange()
        })
      }
    }
  }

  return { options, features }
}
