/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-13 19:22:31
 * @LastEditTime: 2026-06-13 20:45:28
 * @Description:
 */

import type { ThemeConfig } from '@/core'

/**
 * VtkViewer 内置语言包。
 * 当外部未注入 t 函数时，PluginBase.t() 从此处按当前 locale 取值作为 fallback。
 *
 * 所有 value 均为纯静态字符串，不包含 {param} 插值占位符。
 * 带参数的文本（如快捷键组合）由调用方手动拼接。
 */
export const BUILTIN_LANGS: Record<string, Record<string, string>> = {
  zh: {
    // ============================================================
    // toolbar 容器
    // ============================================================
    'vtkviewer.toolbar.collapseExtra': '收起面板',
    'vtkviewer.toolbar.expandExtra': '展开面板',

    // ============================================================
    // 语言切换
    // ============================================================
    'vtkviewer.lang.zh': '中文',
    'vtkviewer.lang.en': 'English',
    'vtkviewer.lang.title': '语言',
    'vtkviewer.plugin.languageSwitch.name': '语言',
    'vtkviewer.plugin.languageSwitch.description': '切换界面语言（中文/English）',

    // ============================================================
    // interaction/
    // ============================================================
    'vtkviewer.plugin.rotate.name': '旋转',
    'vtkviewer.plugin.rotate.description': '启用/禁用旋转交互',
    'vtkviewer.plugin.rotate.tooltip': '旋转',

    'vtkviewer.plugin.zoom.name': '缩放',
    'vtkviewer.plugin.zoom.description': '启用/禁用缩放交互',
    'vtkviewer.plugin.zoom.tooltip': '缩放',

    'vtkviewer.plugin.pan.name': '平移',
    'vtkviewer.plugin.pan.description': '启用/禁用平移交互',
    'vtkviewer.plugin.pan.tooltip': '平移',

    'vtkviewer.plugin.centerModel.name': '居中模型',
    'vtkviewer.plugin.centerModel.description': '将相机聚焦到模型中心',
    'vtkviewer.plugin.centerModel.tooltip': '居中模型',
    'vtkviewer.plugin.centerModel.shortcutDesc': '居中模型',

    'vtkviewer.plugin.resetAll.name': '重置所有',
    'vtkviewer.plugin.resetAll.description': '重置相机和所有工具状态',
    'vtkviewer.plugin.resetAll.tooltip': '重置所有',
    'vtkviewer.plugin.resetAll.shortcutDesc': '重置所有',
    'vtkviewer.plugin.resetAll.resetDesc': '重置相机视角并恢复所有交互工具默认状态',

    'vtkviewer.plugin.fullscreen.name': '全屏',
    'vtkviewer.plugin.fullscreen.description': '切换全屏显示',
    'vtkviewer.plugin.fullscreen.tooltip': '全屏',
    'vtkviewer.plugin.fullscreen.shortcutDesc': '切换全屏',

    // ============================================================
    // model/
    // ============================================================
    'vtkviewer.plugin.loadModel.name': '加载模型',
    'vtkviewer.plugin.loadModel.description': '从本地文件或远程URL加载模型',
    'vtkviewer.plugin.loadModel.tooltip': '加载模型',
    'vtkviewer.plugin.loadModel.tooltipClose': '关闭加载面板',
    'vtkviewer.plugin.loadModel.title': '加载模型',
    'vtkviewer.plugin.loadModel.tabLocal': '本地文件',
    'vtkviewer.plugin.loadModel.tabRemote': '远程 URL',
    'vtkviewer.plugin.loadModel.selectFile': '选择文件',
    'vtkviewer.plugin.loadModel.urlPlaceholder': '请输入模型文件URL...',
    'vtkviewer.plugin.loadModel.load': '加载',
    'vtkviewer.plugin.loadModel.reading': '正在读取文件...',
    'vtkviewer.plugin.loadModel.downloading': '正在下载模型...',
    'vtkviewer.plugin.loadModel.parsing': '正在解析模型...',
    'vtkviewer.plugin.loadModel.rendering': '正在渲染模型...',
    'vtkviewer.plugin.loadModel.loaded': '加载完成',
    'vtkviewer.plugin.loadModel.invalidUrl': '请输入合法的URL地址',
    'vtkviewer.plugin.loadModel.selectHint': '点击下方按钮选择要加载的3D模型文件',
    'vtkviewer.plugin.loadModel.urlHint': '输入模型文件的URL地址',
    'vtkviewer.plugin.loadModel.remoteHint': '远程模型将自动检测格式并下载后加载',
    'vtkviewer.plugin.loadModel.loading': '加载中...',
    'vtkviewer.plugin.loadModel.unsupportedFormat': '不支持的文件格式',
    'vtkviewer.plugin.loadModel.supportedFormats': '支持格式',

    'vtkviewer.plugin.viewSelect.name': '视图选择',
    'vtkviewer.plugin.viewSelect.description': '选择预设视角',
    'vtkviewer.plugin.viewSelect.tooltip': '选择预设视角',
    'vtkviewer.plugin.viewSelect.placeholder': '选择视角',
    'vtkviewer.plugin.viewSelect.resetDesc': '重置视图选择下拉框到默认状态',
    'vtkviewer.plugin.viewSelect.front': '前视图',
    'vtkviewer.plugin.viewSelect.back': '后视图',
    'vtkviewer.plugin.viewSelect.left': '左视图',
    'vtkviewer.plugin.viewSelect.right': '右视图',
    'vtkviewer.plugin.viewSelect.top': '顶视图',
    'vtkviewer.plugin.viewSelect.bottom': '底视图',
    'vtkviewer.plugin.viewSelect.iso': '等轴测',

    'vtkviewer.plugin.unloadModel.name': '卸载模型',
    'vtkviewer.plugin.unloadModel.description': '卸载当前模型并释放资源',
    'vtkviewer.plugin.unloadModel.tooltip': '卸载模型',

    // ============================================================
    // DragDrop
    // ============================================================
    'vtkviewer.plugin.dragDrop.name': '拖拽加载',
    'vtkviewer.plugin.dragDrop.description': '提供文件拖拽加载功能',
    'vtkviewer.plugin.dragDrop.dropHint': '释放文件以加载',
    'vtkviewer.plugin.dragDrop.supportedFormats': '支持格式',
    'vtkviewer.plugin.dragDrop.unsupportedFormat': '不支持的文件格式',
    'vtkviewer.plugin.dragDrop.zoneNotFound': '找不到拖拽区域元素',
    'vtkviewer.plugin.dragDrop.unsupportedFile': '文件不支持',

    // ============================================================
    // KeyBinding
    // ============================================================
    'vtkviewer.plugin.keyBinding.description': '管理键盘快捷键，支持延迟收集和冲突检测',
    'vtkviewer.plugin.keyBinding.conflict': '快捷键冲突',
    'vtkviewer.plugin.keyBinding.collected': '已收集快捷键',

    // ============================================================
    // MemoryPressure
    // ============================================================
    'vtkviewer.plugin.memoryPressure.description': '监控内存压力，提供自动清理策略',
    'vtkviewer.plugin.memoryPressure.levelChanged': '压力等级变更',
    'vtkviewer.plugin.memoryPressure.conservativeCleanup': '执行保守清理',
    'vtkviewer.plugin.memoryPressure.aggressiveCleanup': '执行激进清理',

    'vtkviewer.plugin.clipping.name': '剖切',
    'vtkviewer.plugin.clipping.description': '3D 模型剖切面视图，支持半剖、截面、切口三种模式',
    'vtkviewer.plugin.clipping.mode.clip': '半剖',
    'vtkviewer.plugin.clipping.mode.cut': '截面',
    'vtkviewer.plugin.clipping.mode.slice': '切口',
    'vtkviewer.plugin.clipping.title': '剖切设置',
    'vtkviewer.plugin.clipping.flipDirection': '翻转方向',
    'vtkviewer.plugin.clipping.showModel': '显示模型',
    'vtkviewer.plugin.clipping.showTool': '显示剖切工具',
    'vtkviewer.plugin.clipping.info.origin': '原点',
    'vtkviewer.plugin.clipping.info.normal': '法线',
    'vtkviewer.plugin.clipping.axis': '轴',

    'vtkviewer.plugin.renderStyle.name': '渲染样式',
    'vtkviewer.plugin.renderStyle.description': '控制网格的渲染模式、边缘、透明度等外观属性',
    'vtkviewer.plugin.renderStyle.title': '渲染样式',
    'vtkviewer.plugin.renderStyle.lighting.phong': '冯氏',

    'vtkviewer.plugin.renderPrecision.name': '渲染精度',
    'vtkviewer.plugin.renderPrecision.description': '调节模型渲染精度（LOD级别、边缘细化等）',
    'vtkviewer.plugin.renderPrecision.title': '渲染精度',

    'vtkviewer.plugin.renderPrecision.level.low': '低精度',
    'vtkviewer.plugin.renderPrecision.level.medium': '中精度',
    'vtkviewer.plugin.renderPrecision.level.high': '高精度',
    'vtkviewer.plugin.renderPrecision.level.ultra': '超高精度',
    'vtkviewer.plugin.renderPrecision.level.custom': '自定义',
    'vtkviewer.plugin.renderPrecision.aa.on': '开',
    'vtkviewer.plugin.renderPrecision.aa.off': '关',
    'vtkviewer.plugin.renderPrecision.panel.title': '渲染精度',
    'vtkviewer.plugin.renderPrecision.panel.level': '精度级别',
    'vtkviewer.plugin.renderPrecision.panel.polygonDivision': '多边形细分',
    'vtkviewer.plugin.renderPrecision.panel.edgeAngle': '边缘角度',
    'vtkviewer.plugin.renderPrecision.panel.antiAliasing': '抗锯齿',
    'vtkviewer.plugin.renderPrecision.panel.showInfo': '在信息区显示',
    'vtkviewer.plugin.renderPrecision.panel.reset': '重置默认',
    'vtkviewer.plugin.renderPrecision.info.label': '精度',
    'vtkviewer.plugin.renderPrecision.info.aa': '抗锯齿',
    'vtkviewer.plugin.renderPrecision.info.triangles': '多边形',
    'vtkviewer.plugin.renderPrecision.info.vertices': '顶点',
    'vtkviewer.plugin.renderPrecision.show.on': '开',
    'vtkviewer.plugin.renderPrecision.show.off': '关',

    // ============================================================
    // scene/
    // ============================================================
    'vtkviewer.plugin.axes.name': '坐标轴',
    'vtkviewer.plugin.axes.description': '显示/隐藏坐标轴方向指示器（支持多种坐标系模式）',
    'vtkviewer.axes.mode.none': '无',
    'vtkviewer.axes.mode.world': '世界',
    'vtkviewer.axes.mode.display': '方向',
    'vtkviewer.axes.mode.both': '全部',

    'vtkviewer.plugin.backgroundColor.name': '背景色',
    'vtkviewer.plugin.backgroundColor.description': '点击打开颜色选择器，选取任意背景色',

    'vtkviewer.plugin.lightIntensity.name': '光照强度',
    'vtkviewer.plugin.lightIntensity.description': '调节场景光照强度',
    'vtkviewer.plugin.lightIntensity.tooltip': '光照强度',
    'vtkviewer.plugin.lightIntensity.title': '光照强度',
    'vtkviewer.plugin.lightIntensity.value': '强度',
    'vtkviewer.plugin.lightIntensity.decrease': '-',
    'vtkviewer.plugin.lightIntensity.increase': '+',

    'vtkviewer.plugin.renderGrid.name': '空间网格',
    'vtkviewer.plugin.renderGrid.description': '在3D场景中显示XYZ坐标网格',
    'vtkviewer.plugin.renderGrid.xy': 'XY平面',
    'vtkviewer.plugin.renderGrid.yz': 'YZ平面',
    'vtkviewer.plugin.renderGrid.xz': 'XZ平面',
    'vtkviewer.plugin.renderGrid.tooltip': '空间网格设置',
    'vtkviewer.plugin.renderGrid.title': '空间网格',
    'vtkviewer.plugin.renderGrid.color': '颜色',
    'vtkviewer.plugin.renderGrid.spacing': '间距',
    'vtkviewer.plugin.renderGrid.opacity': '透明度',
    'vtkviewer.plugin.renderGrid.extension': '空间扩展',
    'vtkviewer.plugin.renderGrid.collapse': '折叠',
    'vtkviewer.plugin.renderGrid.expand': '展开',
    'vtkviewer.plugin.renderGrid.on': '开',
    'vtkviewer.plugin.renderGrid.off': '关',
    'vtkviewer.plugin.renderGrid.autoHint': '自动',
    'vtkviewer.plugin.renderGrid.resetDesc': '重置空间网格到默认状态',

    'vtkviewer.plugin.themeSwitch.name': '主题切换',
    'vtkviewer.plugin.themeSwitch.description': '切换查看器主题',
    'vtkviewer.plugin.themeSwitch.title': '选择主题',

    // ============================================================
    // tools/
    // ============================================================
    'vtkviewer.plugin.screenshot.name': '截图',
    'vtkviewer.plugin.screenshot.description':
      '捕获当前视图截图，支持高分辨率、透明背景和多格式导出',
    'vtkviewer.plugin.screenshot.capturing': '截图中...',
    'vtkviewer.plugin.screenshot.saved': '已保存',
    'vtkviewer.plugin.screenshot.selectFormat': '选择格式',
    'vtkviewer.plugin.screenshot.multiplier': '截图倍率',
    'vtkviewer.plugin.screenshot.multiplier.1x': '1x 原始尺寸',
    'vtkviewer.plugin.screenshot.multiplier.2x': '2x 高清',
    'vtkviewer.plugin.screenshot.multiplier.4x': '4x 超高清',
    'vtkviewer.plugin.screenshot.tooltip': '截图',
    'vtkviewer.plugin.screenshot.tooltipClose': '关闭截图面板',
    'vtkviewer.plugin.screenshot.shortcutDesc': '截图',
    'vtkviewer.plugin.screenshot.title': '截图导出',
    'vtkviewer.plugin.screenshot.resolution': '分辨率倍率',
    'vtkviewer.plugin.screenshot.format': '图片格式',
    'vtkviewer.plugin.screenshot.quality': '图片质量',
    'vtkviewer.plugin.screenshot.transparent': '透明背景',
    'vtkviewer.plugin.screenshot.exporting': '导出中...',
    'vtkviewer.plugin.screenshot.export': '导出截图',
    'vtkviewer.plugin.screenshot.errorEmpty': '截图数据为空',
    'vtkviewer.plugin.screenshot.labelQuality': '图片质量',
    'vtkviewer.plugin.screenshot.btnExporting': '导出中...',
    'vtkviewer.plugin.screenshot.btnExport': '导出截图',
    'vtkviewer.plugin.screenshot.failedToCapture': '截图捕获失败',

    'vtkviewer.plugin.themeSwitch.ctxThemeNotFound': 'ctx.theme 未找到',

    'vtkviewer.plugin.backgroundColor.tooltip': '背景色',
    'vtkviewer.plugin.backgroundColor.resetDesc': '恢复背景色为默认值',

    'vtkviewer.plugin.lightIntensity.resetDesc': '恢复光照强度为默认值',
    'vtkviewer.plugin.lightIntensity.reset': '重置',

    'vtkviewer.plugin.axes.getShortcutConfig': '切换坐标轴',
    'vtkviewer.plugin.axes.resetDesc': '恢复坐标轴为默认显示状态',

    'vtkviewer.plugin.clipping.resetDesc': '重置剖切到默认状态',
    'vtkviewer.plugin.clipping.resetClose': '关闭剖切视图',
    'vtkviewer.plugin.clipping.reset': '重置',
    'vtkviewer.plugin.clipping.noSession': '当前没有启用剖切',
    'vtkviewer.plugin.clipping.tooltipEnable': '开启剖切',
    'vtkviewer.plugin.clipping.tooltipDisable': '关闭剖切',
    'vtkviewer.plugin.clipping.tooltip': '剖切设置',
    'vtkviewer.plugin.clipping.getShortcutConfig': '剖切',

    'vtkviewer.plugin.renderStyle.mode.surface': '实体',
    'vtkviewer.plugin.renderStyle.mode.wireframe': '线框',
    'vtkviewer.plugin.renderStyle.mode.points': '点云',
    'vtkviewer.plugin.renderStyle.mode.surfaceEdges': '实体+边缘',
    'vtkviewer.plugin.renderStyle.lighting.pbr': 'PBR',

    'vtkviewer.plugin.renderGrid.getShortcutConfig': '空间网格',
    'vtkviewer.plugin.renderGrid.refresh': '刷新',
    'vtkviewer.plugin.renderGrid.refreshTitle': '重新根据模型大小适配',
    'vtkviewer.plugin.renderGrid.autoSpacing': '自动适配间距',

    'vtkviewer.plugin.measurement.mode.point': '点',
    'vtkviewer.plugin.measurement.mode.distance': '距离',
    'vtkviewer.plugin.measurement.mode.angle': '角度',

    'vtkviewer.plugin.measurement.name': '测量',
    'vtkviewer.plugin.measurement.description': '支持点拾取、距离测量、角度测量',
    'vtkviewer.plugin.measurement.tooltip': '选择测量模式',
    'vtkviewer.plugin.measurement.tooltipEnable': '开启测量',
    'vtkviewer.plugin.measurement.tooltipDisable': '关闭测量',
    'vtkviewer.plugin.measurement.noSession': '当前没有活跃的测量会话',
    'vtkviewer.plugin.measurement.extensionLabel': '测量模式',
    'vtkviewer.plugin.measurement.resetDesc.clear': '清除所有测量数据、激活状态和模式',
    'vtkviewer.plugin.measurement.resetDesc.deactivate': '退出测量模式（不清除历史数据）',

    'vtkviewer.plugin.bookmark.name': '书签',
    'vtkviewer.plugin.bookmark.description': '保存和恢复多个相机视角书签',
    'vtkviewer.plugin.bookmark.tooltip': '书签',
    'vtkviewer.plugin.bookmark.tooltipClose': '关闭书签',
    'vtkviewer.plugin.bookmark.shortcutDesc': '书签',
    'vtkviewer.plugin.bookmark.title': '视角书签',
    'vtkviewer.plugin.bookmark.cleared': '已清除全部书签',
    'vtkviewer.plugin.bookmark.clearAll': '清除全部',
    'vtkviewer.plugin.bookmark.clearAllTitle': '清除全部书签',
    'vtkviewer.plugin.bookmark.full': '已满',
    'vtkviewer.plugin.bookmark.save': '保存',
    'vtkviewer.plugin.bookmark.saveCurrent': '保存当前',
    'vtkviewer.plugin.bookmark.saveTip': '保存当前视角',
    'vtkviewer.plugin.bookmark.delete': '删除',
    'vtkviewer.plugin.bookmark.autoName': '视角',
    'vtkviewer.plugin.bookmark.maxFeedback': '最多保存',
    'vtkviewer.plugin.bookmark.savedFeedback': '已保存',
    'vtkviewer.plugin.bookmark.emptyHint': '点击下方按钮收藏当前视角',
    'vtkviewer.plugin.bookmark.resetDesc': '重置书签插件到默认状态',
    'vtkviewer.plugin.bookmark.restore': '恢复视角',
    'vtkviewer.plugin.bookmark.inputPlaceholder': '输入名称（留空自动命名）...',
    'vtkviewer.plugin.bookmark.maxHint': '已达上限',

    'vtkviewer.plugin.performance.name': '性能',
    'vtkviewer.plugin.performance.description': '显示渲染性能指标（内存、FPS、渲染时间等）',
    'vtkviewer.plugin.performance.tooltipEnable': '开启性能监控',
    'vtkviewer.plugin.performance.tooltipDisable': '关闭性能监控',
    'vtkviewer.plugin.performance.label.fps': 'FPS',
    'vtkviewer.plugin.performance.label.renderTime': '渲染',
    'vtkviewer.plugin.performance.label.triangles': '多边形',
    'vtkviewer.plugin.performance.label.memory': '内存',

    // ============================================================
    // animation/
    // ============================================================
    'vtkviewer.plugin.animation.name': '动画',
    'vtkviewer.plugin.animation.description': '场景动画播放控制',
    'vtkviewer.plugin.animation.play': '播放',
    'vtkviewer.plugin.animation.pause': '暂停',

    // ============================================================
    // viewPreset
    // ============================================================
    'vtkviewer.viewPreset.front': '前视图',
    'vtkviewer.viewPreset.back': '后视图',
    'vtkviewer.viewPreset.left': '左视图',
    'vtkviewer.viewPreset.right': '右视图',
    'vtkviewer.viewPreset.top': '顶视图',
    'vtkviewer.viewPreset.bottom': '底视图',
    'vtkviewer.viewPreset.iso': '等轴测',

    // ============================================================
    // theme
    // ============================================================
    'vtkviewer.theme.current': '当前主题',
    'vtkviewer.theme.dark': '深色主题',
    'vtkviewer.theme.light': '浅色主题',
    'vtkviewer.theme.ocean': '海洋主题',
    'vtkviewer.theme.forest': '森林主题',
    'vtkviewer.theme.sunset': '日落主题',

    'vtkviewer.plugin.renderStyle.lighting.flat': '平面',
    'vtkviewer.plugin.renderStyle.lighting.gouraud': '高洛德',
    'vtkviewer.plugin.renderStyle.opacity': '透明度',
    'vtkviewer.plugin.renderStyle.pointSize': '点大小',
    'vtkviewer.plugin.renderStyle.edgeWidth': '线宽',
    'vtkviewer.plugin.renderStyle.showEdges': '显示边缘',
    'vtkviewer.plugin.renderStyle.lighting': '光照',
    'vtkviewer.plugin.renderStyle.resetDesc': '重置渲染样式到默认状态',
    'vtkviewer.plugin.renderStyle.interpolation': '插值方式',
    'vtkviewer.plugin.renderStyle.edgeColor': '边缘颜色',
    'vtkviewer.plugin.renderStyle.on': '开',
    'vtkviewer.plugin.renderStyle.off': '关',

    // ============================================================
    // format/aggregate/
    // ============================================================
    'vtkviewer.plugin.format.parseError': '解析错误',
    'vtkviewer.plugin.zip.description': 'ZIP聚合格式处理器（自动识别内部格式）',
    'vtkviewer.plugin.zip.detectVtkjs': '检测到 VTKJS 格式（包含 index.json），按 vtkjs 模式处理',
    'vtkviewer.plugin.zip.invalidVtkjs': 'Invalid VTK.js ZIP format',
    'vtkviewer.plugin.zip.noSupportedModel': 'ZIP 中未找到支持的模型文件',

    // ============================================================
    // utils/zipReader (非插件工具函数级别的翻译)
    // ============================================================
    'vtkviewer.zip.noObjFile': 'ZIP 中未找到 OBJ 文件',
    'vtkviewer.zip.noSupportedModel': 'ZIP 中未找到支持的 3D 模型文件',
    'vtkviewer.zip.textureLoadFailed': '纹理图片加载失败',
    'vtkviewer.zip.textureNotFound': '未找到 MTL 引用的图片文件',
    'vtkviewer.zip.noIndexJson': 'VTK.js ZIP: 未找到 index.json 文件',
    'vtkviewer.zip.emptyScene': 'VTK.js ZIP: 场景为空或格式不正确',
    'vtkviewer.zip.noDataType': 'VTK.js ZIP: 未指定数据集类型',
    'vtkviewer.zip.cannotParseScene': 'VTK.js ZIP: 无法解析场景数据',
    'vtkviewer.zip.noValidData': 'VTK.js ZIP: HttpDataSetReader 未返回有效数据',
    'vtkviewer.zip.loadFailed': 'VTK.js ZIP: HttpDataSetReader 加载失败',
    'vtkviewer.zip.unsupportedFormat': '不支持的格式',

    // ============================================================
    // format/advanced/
    // ============================================================
    'vtkviewer.plugin.drc.decoderModuleNotFound':
      '加载 Draco 解码器脚本后未找到 DracoDecoderModule',
    'vtkviewer.plugin.drc.loadFailed': '从以下路径加载 Draco 解码器失败：',
    'vtkviewer.plugin.drc.decoderReady': 'Draco 解码器已就绪',
    'vtkviewer.plugin.drc.initFailed': 'Draco 解码器初始化失败：',
    'vtkviewer.plugin.drc.description': 'Draco压缩格式处理器',
    'vtkviewer.plugin.drc.decoderNotReady':
      'Draco 解码器未就绪。请通过 decoders prop 配置解码器路径，或安装 draco3d 包。',
    'vtkviewer.plugin.glb.description': 'GLB格式处理器 (glTF Binary)',
    'vtkviewer.plugin.pdb.description': 'PDB分子格式处理器',
    'vtkviewer.plugin.vti.description': 'VTK ImageData格式处理器（体渲染）',
    'vtkviewer.plugin.vtp.description': 'VTK PolyData格式处理器',
    'vtkviewer.plugin.vtu.description': 'VTK UnstructuredGrid格式处理器（表面渲染）',

    // ============================================================
    // format/geometry/
    // ============================================================
    'vtkviewer.plugin.obj.description': 'OBJ格式处理器',
    'vtkviewer.plugin.ply.description': 'PLY格式处理器',
    'vtkviewer.plugin.stl.description': 'STL格式处理器（支持ASCII和二进制）',

    // ============================================================
    // overlay/
    // ============================================================
    'vtkviewer.plugin.loading.name': '加载进度',
    'vtkviewer.plugin.loading.description': '显示文件加载进度',
    'vtkviewer.plugin.loading.stage.idle': '准备中',
    'vtkviewer.plugin.loading.stage.downloading': '正在下载',
    'vtkviewer.plugin.loading.stage.reading': '正在读取',
    'vtkviewer.plugin.loading.stage.parsing': '正在解析',
    'vtkviewer.plugin.loading.stage.rendering': '正在渲染',
    'vtkviewer.plugin.loading.stage.complete': '加载完成',
    'vtkviewer.plugin.loading.stage.unknown': '加载中',
    'vtkviewer.plugin.loading.fileSize': '文件大小: ',
    'vtkviewer.plugin.webgl.name': 'WebGL上下文丢失',
    'vtkviewer.plugin.webgl.description': 'WebGL上下文丢失提示和恢复操作',
    'vtkviewer.plugin.webgl.title': 'WebGL上下文丢失',
    'vtkviewer.plugin.webgl.message': '图形渲染上下文已丢失，正在尝试恢复...',
    'vtkviewer.plugin.webgl.retry': '重试',
    'vtkviewer.plugin.error.name': '错误提示',
    'vtkviewer.plugin.error.description': '显示错误信息和恢复操作',
    'vtkviewer.plugin.error.retry': '重试',
    'vtkviewer.plugin.error.dismiss': '关闭',

    // ============================================================
    // source（数据源加载）
    // ============================================================
    'vtkviewer.source.viewerNotReady': '查看器未初始化，无法加载数据源',
    'vtkviewer.source.unsupportedFormat': '不支持的文件格式',
    'vtkviewer.source.formatNotDetected': '无法识别文件格式，请提供 sourceFormat',
    'vtkviewer.source.loadFailed': '加载数据源失败',
    'vtkviewer.source.httpError': '下载失败',
    'vtkviewer.source.autoLoadFailed': '自动加载数据源失败',
    'vtkviewer.source.retryLoadFailed': '重试加载数据源失败',
    'vtkviewer.source.builtinThemesRegistered': '内置主题已注册',
    'vtkviewer.source.fileLoadFailed': '文件加载处理失败',
    'vtkviewer.source.filesLoadFailed': '文件批量加载处理失败',
    'vtkviewer.source.pluginReinitFailed': '插件重新初始化失败',
    'vtkviewer.source.ctxNotFound': '无法获取 ViewerContext',
    'vtkviewer.scene.failedReset': '重置插件状态失败',
    'vtkviewer.context.canvasNotFound': '高清截图不可用：Canvas 未找到',
    'vtkviewer.context.2dContextFailed': '透明截图处理失败：无法获取 2D 上下文',
    'vtkviewer.context.transparentExportFailed': '透明截图导出失败',
    'vtkviewer.context.hiResCaptureFailed': '高清截图捕获失败',
    'vtkviewer.context.captureFailed': '截图捕获失败',
    'vtkviewer.context.renderWindowNotAvailable': '渲染窗口不可用',
    'vtkviewer.context.noRenderViewsAvailable': '无可用渲染视图',
    'vtkviewer.context.failedReadWebGLCanvas': '读取 WebGL 画布失败',
    'vtkviewer.context.webglContextLost': 'WebGL 上下文已丢失',
    'vtkviewer.context.webglContextRestored': 'WebGL 上下文已恢复',
    'vtkviewer.context.containerNotAvailable': '容器不可用，无法切换全屏',
    'vtkviewer.context.failedExitFullscreen': '退出全屏失败',
    'vtkviewer.context.failedEnterFullscreen': '进入全屏失败',
    'vtkviewer.context.renderWindowNotAvailableError': '渲染窗口不可用',
    'vtkviewer.context.noRenderViewsAvailableError': '无可用渲染视图',
    'vtkviewer.context.canvasNotAvailable': '画布不可用',
    'vtkviewer.context.captureImagesFailed': 'captureImages 方法失败，回退到 canvas',
    'vtkviewer.interaction.renderWindowNotAvailable': '渲染窗口不可用，跳过初始化',
    'vtkviewer.context.initFailed': '初始化失败',
    'vtkviewer.context.viewerNotInitialized': '查看器未初始化',
    'vtkviewer.context.debug.attachToContainer': 'attachToContainer 已调用',
    'vtkviewer.context.debug.renderPipelineReady': '发出 RENDER_PIPELINE_READY 事件',
    'vtkviewer.command.alreadyRegistered': '命令已注册，将被覆盖',
    'vtkviewer.command.notFound': '命令未找到',
    'vtkviewer.command.cannotExecute': '命令无法执行',
    'vtkviewer.disposal.errorDisposing': '释放资源时出错',
    'vtkviewer.disposal.errorInRelease': '释放函数执行出错',
    'vtkviewer.reset.stoppingDueToFailure': '因插件失败而停止重置',
    'vtkviewer.reset.duplicateAction': '重置动作键重复，将被覆盖',
    'vtkviewer.reset.failedToCollect': '收集插件重置动作失败',
    'vtkviewer.reset.actionNotFound': '重置动作未找到',
    'vtkviewer.reset.noActionsRegistered': '插件未注册重置动作',
    'vtkviewer.reset.guardConditionNotMet': '守卫条件未满足',
    'vtkviewer.reset.guardCheckFailed': '守卫检查失败',
    'vtkviewer.reset.actionFailed': '重置动作执行失败',
    'vtkviewer.state.pluginStateAlreadyRegistered': '插件状态已注册',
    'vtkviewer.state.pluginStateNotFound': '插件状态未找到',
    'vtkviewer.theme.notRegistered': '主题未注册',
    'vtkviewer.toolbar.extensionNotFound': '扩展区未找到，无法',
    'vtkviewer.toolbar.infoItemNotFound': '信息项未找到，无法',
    'vtkviewer.context.missingSubContexts': 'ViewerContextBuilder 缺少必需的子上下文',
    'vtkviewer.plugin.clipping.cutterFailed': '剖切工具执行失败',
    'vtkviewer.plugin.clipping.scheduleUpdateError': '剖切更新调度出错',
    'vtkviewer.plugin.clipping.vtkResourcesInitialized': 'VTK 资源已初始化',
    'vtkviewer.plugin.clipping.cannotInitWidget': '无法初始化 Widget：渲染器或交互器缺失',
    'vtkviewer.plugin.clipping.cannotEnableClipping': '无法启用剖切：平面未初始化',
    'vtkviewer.plugin.clipping.inputType': '输入类型',

    'vtkviewer.plugin.colorBy.name': '颜色映射',
    'vtkviewer.plugin.colorBy.description': '控制颜色映射数组和范围',
    'vtkviewer.plugin.colorBy.colorBy': '颜色映射',
    'vtkviewer.plugin.colorBy.pickPoint': '点拾取',
    'vtkviewer.plugin.colorBy.pickCount': '拾取',
    'vtkviewer.plugin.colorBy.solidColor': 'Solid Color',
    'vtkviewer.plugin.colorBy.cellPickerNotInitialized': 'CellPicker 未初始化',
    'vtkviewer.plugin.colorBy.collectArrayError': '收集颜色数组时出错',
    'vtkviewer.plugin.colorBy.noAvailableArrays': '无可用数组',
    'vtkviewer.plugin.colorBy.preset': '颜色预设',
    'vtkviewer.plugin.loadModel.loadFailed': '加载失败',
    'vtkviewer.plugin.loadModel.formatHandlerNotFound': '未找到格式处理器',
    'vtkviewer.plugin.axes.renderWindowNotAvailable': '渲染窗口或渲染器不可用，跳过初始化',
    'vtkviewer.plugin.axes.interactorNull': '渲染窗口交互器为空，方向指示器可能无法响应交互'
  },

  en: {
    // ============================================================
    // toolbar container
    // ============================================================
    'vtkviewer.toolbar.collapseExtra': 'Collapse',
    'vtkviewer.toolbar.expandExtra': 'Expand',

    // ============================================================
    // language switch
    // ============================================================
    'vtkviewer.lang.zh': '中文',
    'vtkviewer.lang.en': 'English',
    'vtkviewer.lang.title': 'Language',
    'vtkviewer.plugin.languageSwitch.name': 'Language',
    'vtkviewer.plugin.languageSwitch.description': 'Switch interface language (中文/English)',

    // ============================================================
    // interaction/
    // ============================================================
    'vtkviewer.plugin.rotate.name': 'Rotate',
    'vtkviewer.plugin.rotate.description': 'Enable/disable rotation interaction',
    'vtkviewer.plugin.rotate.tooltip': 'Rotate',

    'vtkviewer.plugin.zoom.name': 'Zoom',
    'vtkviewer.plugin.zoom.description': 'Enable/disable zoom interaction',
    'vtkviewer.plugin.zoom.tooltip': 'Zoom',

    'vtkviewer.plugin.pan.name': 'Pan',
    'vtkviewer.plugin.pan.description': 'Enable/disable pan interaction',
    'vtkviewer.plugin.pan.tooltip': 'Pan',

    'vtkviewer.plugin.centerModel.name': 'Center Model',
    'vtkviewer.plugin.centerModel.description': 'Focus camera on model center',
    'vtkviewer.plugin.centerModel.tooltip': 'Center Model',
    'vtkviewer.plugin.centerModel.shortcutDesc': 'Center Model',

    'vtkviewer.plugin.resetAll.name': 'Reset All',
    'vtkviewer.plugin.resetAll.description': 'Reset camera and all tool states',
    'vtkviewer.plugin.resetAll.tooltip': 'Reset All',
    'vtkviewer.plugin.resetAll.shortcutDesc': 'Reset All',
    'vtkviewer.plugin.resetAll.resetDesc':
      'Reset camera view and restore all interaction tool defaults',

    'vtkviewer.plugin.fullscreen.name': 'Fullscreen',
    'vtkviewer.plugin.fullscreen.description': 'Toggle fullscreen display',
    'vtkviewer.plugin.fullscreen.tooltip': 'Fullscreen',
    'vtkviewer.plugin.fullscreen.shortcutDesc': 'Toggle Fullscreen',

    // ============================================================
    // model/
    // ============================================================
    'vtkviewer.plugin.loadModel.name': 'Load Model',
    'vtkviewer.plugin.loadModel.description': 'Load a model from local file or remote URL',
    'vtkviewer.plugin.loadModel.tooltip': 'Load Model',
    'vtkviewer.plugin.loadModel.tooltipClose': 'Close load panel',
    'vtkviewer.plugin.loadModel.title': 'Load Model',
    'vtkviewer.plugin.loadModel.tabLocal': 'Local File',
    'vtkviewer.plugin.loadModel.tabRemote': 'Remote URL',
    'vtkviewer.plugin.loadModel.selectFile': 'Select File',
    'vtkviewer.plugin.loadModel.urlPlaceholder': 'Enter model file URL...',
    'vtkviewer.plugin.loadModel.load': 'Load',
    'vtkviewer.plugin.loadModel.reading': 'Reading file...',
    'vtkviewer.plugin.loadModel.downloading': 'Downloading model...',
    'vtkviewer.plugin.loadModel.parsing': 'Parsing model...',
    'vtkviewer.plugin.loadModel.rendering': 'Rendering model...',
    'vtkviewer.plugin.loadModel.loaded': 'Load complete',
    'vtkviewer.plugin.loadModel.invalidUrl': 'Please enter a valid URL',
    'vtkviewer.plugin.loadModel.selectHint': 'Click the button below to select a 3D model file',
    'vtkviewer.plugin.loadModel.urlHint': 'Enter the model file URL',
    'vtkviewer.plugin.loadModel.remoteHint': 'Remote models will be auto-detected and downloaded',
    'vtkviewer.plugin.loadModel.loading': 'Loading...',
    'vtkviewer.plugin.loadModel.unsupportedFormat': 'Unsupported file format',
    'vtkviewer.plugin.loadModel.supportedFormats': 'Supported formats',

    // ============================================================
    // DragDrop
    // ============================================================
    'vtkviewer.plugin.dragDrop.name': 'Drag & Drop',
    'vtkviewer.plugin.dragDrop.description': 'Drag and drop files to load',
    'vtkviewer.plugin.dragDrop.dropHint': 'Release to load file',
    'vtkviewer.plugin.dragDrop.supportedFormats': 'Supported formats',
    'vtkviewer.plugin.dragDrop.unsupportedFormat': 'Unsupported file format',
    'vtkviewer.plugin.dragDrop.zoneNotFound': 'Drop zone element not found',
    'vtkviewer.plugin.dragDrop.unsupportedFile': 'Unsupported file',

    // ============================================================
    // KeyBinding
    // ============================================================
    'vtkviewer.plugin.keyBinding.description':
      'Manage keyboard shortcuts with delayed collection and conflict detection',
    'vtkviewer.plugin.keyBinding.conflict': 'Keyboard shortcut conflict',
    'vtkviewer.plugin.keyBinding.collected': 'Collected shortcuts',

    // ============================================================
    // MemoryPressure
    // ============================================================
    'vtkviewer.plugin.memoryPressure.description':
      'Monitor memory pressure and provide automatic cleanup strategies',
    'vtkviewer.plugin.memoryPressure.levelChanged': 'Pressure level changed',
    'vtkviewer.plugin.memoryPressure.conservativeCleanup': 'Performing conservative cleanup',
    'vtkviewer.plugin.memoryPressure.aggressiveCleanup': 'Performing aggressive cleanup',

    'vtkviewer.plugin.viewSelect.name': 'View Select',
    'vtkviewer.plugin.viewSelect.description': 'Select preset viewing angle',
    'vtkviewer.plugin.viewSelect.tooltip': 'Select preset view',
    'vtkviewer.plugin.viewSelect.placeholder': 'Select view',
    'vtkviewer.plugin.viewSelect.resetDesc': 'Reset view selection dropdown to default',
    'vtkviewer.plugin.viewSelect.front': 'Front',
    'vtkviewer.plugin.viewSelect.back': 'Back',
    'vtkviewer.plugin.viewSelect.left': 'Left',
    'vtkviewer.plugin.viewSelect.right': 'Right',
    'vtkviewer.plugin.viewSelect.top': 'Top',
    'vtkviewer.plugin.viewSelect.bottom': 'Bottom',
    'vtkviewer.plugin.viewSelect.iso': 'Isometric',

    'vtkviewer.plugin.unloadModel.name': 'Unload Model',
    'vtkviewer.plugin.unloadModel.description': 'Unload current model and release resources',
    'vtkviewer.plugin.unloadModel.tooltip': 'Unload Model',

    'vtkviewer.plugin.clipping.name': 'Clipping',
    'vtkviewer.plugin.clipping.description':
      '3D model cross-section view, supports clip, cut, and slice modes',
    'vtkviewer.plugin.clipping.mode.clip': 'Clip',
    'vtkviewer.plugin.clipping.mode.cut': 'Cut',
    'vtkviewer.plugin.clipping.mode.slice': 'Slice',
    'vtkviewer.plugin.clipping.title': 'Clipping Settings',
    'vtkviewer.plugin.clipping.flipDirection': 'Flip Direction',
    'vtkviewer.plugin.clipping.showModel': 'Show Model',
    'vtkviewer.plugin.clipping.showTool': 'Show Tool',
    'vtkviewer.plugin.clipping.info.origin': 'Origin',
    'vtkviewer.plugin.clipping.info.normal': 'Normal',
    'vtkviewer.plugin.clipping.axis': 'Axis',

    'vtkviewer.plugin.renderStyle.name': 'Render Style',
    'vtkviewer.plugin.renderStyle.description':
      'Control mesh rendering mode, edges, opacity and other appearance attributes',
    'vtkviewer.plugin.renderStyle.title': 'Render Style',
    'vtkviewer.plugin.renderStyle.lighting.phong': 'Phong',

    'vtkviewer.plugin.renderPrecision.name': 'Render Precision',
    'vtkviewer.plugin.renderPrecision.description':
      'Adjust model rendering precision (LOD level, edge refinement, etc.)',
    'vtkviewer.plugin.renderPrecision.title': 'Render Precision',

    'vtkviewer.plugin.renderPrecision.level.low': 'Low',
    'vtkviewer.plugin.renderPrecision.level.medium': 'Medium',
    'vtkviewer.plugin.renderPrecision.level.high': 'High',
    'vtkviewer.plugin.renderPrecision.level.ultra': 'Ultra',
    'vtkviewer.plugin.renderPrecision.level.custom': 'Custom',
    'vtkviewer.plugin.renderPrecision.aa.on': 'On',
    'vtkviewer.plugin.renderPrecision.aa.off': 'Off',
    'vtkviewer.plugin.renderPrecision.panel.title': 'Render Precision',
    'vtkviewer.plugin.renderPrecision.panel.level': 'Precision Level',
    'vtkviewer.plugin.renderPrecision.panel.polygonDivision': 'Polygon Division',
    'vtkviewer.plugin.renderPrecision.panel.edgeAngle': 'Edge Angle',
    'vtkviewer.plugin.renderPrecision.panel.antiAliasing': 'Anti-Aliasing',
    'vtkviewer.plugin.renderPrecision.panel.showInfo': 'Show in Info Panel',
    'vtkviewer.plugin.renderPrecision.panel.reset': 'Reset Defaults',
    'vtkviewer.plugin.renderPrecision.info.label': 'Precision',
    'vtkviewer.plugin.renderPrecision.info.aa': 'AA',
    'vtkviewer.plugin.renderPrecision.info.triangles': 'Triangles',
    'vtkviewer.plugin.renderPrecision.info.vertices': 'Vertices',
    'vtkviewer.plugin.renderPrecision.show.on': 'On',
    'vtkviewer.plugin.renderPrecision.show.off': 'Off',

    // ============================================================
    // scene/
    // ============================================================
    'vtkviewer.plugin.axes.name': 'Axes',
    'vtkviewer.plugin.axes.description':
      'Show/hide coordinate axes indicator (supports multiple coordinate system modes)',
    'vtkviewer.axes.mode.none': 'None',
    'vtkviewer.axes.mode.world': 'World',
    'vtkviewer.axes.mode.display': 'Display',
    'vtkviewer.axes.mode.both': 'Both',

    'vtkviewer.plugin.backgroundColor.name': 'Background Color',
    'vtkviewer.plugin.backgroundColor.description':
      'Open color picker to choose any background color',

    'vtkviewer.plugin.lightIntensity.name': 'Light Intensity',
    'vtkviewer.plugin.lightIntensity.description': 'Adjust scene lighting intensity',
    'vtkviewer.plugin.lightIntensity.tooltip': 'Light intensity',
    'vtkviewer.plugin.lightIntensity.title': 'Light Intensity',
    'vtkviewer.plugin.lightIntensity.value': 'Intensity',
    'vtkviewer.plugin.lightIntensity.decrease': '-',
    'vtkviewer.plugin.lightIntensity.increase': '+',

    'vtkviewer.plugin.renderGrid.name': 'Render Grid',
    'vtkviewer.plugin.renderGrid.description': 'Display XYZ coordinate grid in 3D scene',
    'vtkviewer.plugin.renderGrid.xy': 'XY Plane',
    'vtkviewer.plugin.renderGrid.yz': 'YZ Plane',
    'vtkviewer.plugin.renderGrid.xz': 'XZ Plane',
    'vtkviewer.plugin.renderGrid.tooltip': 'Grid settings',
    'vtkviewer.plugin.renderGrid.title': 'Render Grid',
    'vtkviewer.plugin.renderGrid.color': 'Color',
    'vtkviewer.plugin.renderGrid.spacing': 'Spacing',
    'vtkviewer.plugin.renderGrid.opacity': 'Opacity',
    'vtkviewer.plugin.renderGrid.extension': 'Extension',
    'vtkviewer.plugin.renderGrid.collapse': 'Collapse',
    'vtkviewer.plugin.renderGrid.expand': 'Expand',
    'vtkviewer.plugin.renderGrid.on': 'ON',
    'vtkviewer.plugin.renderGrid.off': 'OFF',
    'vtkviewer.plugin.renderGrid.autoHint': 'Auto',
    'vtkviewer.plugin.renderGrid.resetDesc': 'Reset spatial grid to default state',

    'vtkviewer.plugin.themeSwitch.name': 'Theme Switch',
    'vtkviewer.plugin.themeSwitch.description': 'Switch viewer theme',
    'vtkviewer.plugin.themeSwitch.title': 'Select Theme',

    // ============================================================
    // tools/
    // ============================================================
    'vtkviewer.plugin.screenshot.capturing': 'Capturing...',
    'vtkviewer.plugin.screenshot.saved': 'Saved',
    'vtkviewer.plugin.screenshot.selectFormat': 'Select Format',
    'vtkviewer.plugin.screenshot.multiplier': 'Multiplier',
    'vtkviewer.plugin.screenshot.transparent': 'Transparent Background',
    'vtkviewer.plugin.screenshot.multiplier.1x': '1x Original',
    'vtkviewer.plugin.screenshot.multiplier.2x': '2x HD',
    'vtkviewer.plugin.screenshot.multiplier.4x': '4x Ultra HD',
    'vtkviewer.plugin.screenshot.name': 'Screenshot',
    'vtkviewer.plugin.screenshot.description':
      'Capture current view screenshot, supports high resolution, transparent background and multiple export formats',
    'vtkviewer.plugin.screenshot.tooltip': 'Screenshot',
    'vtkviewer.plugin.screenshot.tooltipClose': 'Close screenshot panel',
    'vtkviewer.plugin.screenshot.shortcutDesc': 'Screenshot',
    'vtkviewer.plugin.screenshot.title': 'Screenshot Export',
    'vtkviewer.plugin.screenshot.resolution': 'Resolution Scale',
    'vtkviewer.plugin.screenshot.format': 'Image Format',
    'vtkviewer.plugin.screenshot.quality': 'Image Quality',
    'vtkviewer.plugin.screenshot.exporting': 'Exporting...',
    'vtkviewer.plugin.screenshot.export': 'Export Screenshot',
    'vtkviewer.plugin.screenshot.errorEmpty': 'Screenshot data is empty',
    'vtkviewer.plugin.screenshot.labelQuality': 'Image Quality',
    'vtkviewer.plugin.screenshot.btnExporting': 'Exporting...',
    'vtkviewer.plugin.screenshot.btnExport': 'Export Screenshot',
    'vtkviewer.plugin.screenshot.failedToCapture': 'Failed to capture screenshot',

    'vtkviewer.plugin.themeSwitch.ctxThemeNotFound': 'ctx.theme not found',

    'vtkviewer.plugin.backgroundColor.tooltip': 'Background Color',
    'vtkviewer.plugin.backgroundColor.resetDesc': 'Restore background color to default',

    'vtkviewer.plugin.lightIntensity.resetDesc': 'Restore light intensity to default',
    'vtkviewer.plugin.lightIntensity.reset': 'Reset',

    'vtkviewer.plugin.axes.getShortcutConfig': 'Toggle Axes',
    'vtkviewer.plugin.axes.resetDesc': 'Restore axes to default display state',

    'vtkviewer.plugin.clipping.resetDesc': 'Reset clipping to default state',
    'vtkviewer.plugin.clipping.resetClose': 'Close clipping view',
    'vtkviewer.plugin.clipping.reset': 'Reset',
    'vtkviewer.plugin.clipping.noSession': 'No active clipping session',
    'vtkviewer.plugin.clipping.tooltipEnable': 'Enable Clipping',
    'vtkviewer.plugin.clipping.tooltipDisable': 'Disable Clipping',
    'vtkviewer.plugin.clipping.tooltip': 'Clipping Settings',
    'vtkviewer.plugin.clipping.getShortcutConfig': 'Clipping',

    'vtkviewer.plugin.renderStyle.mode.surface': 'Surface',
    'vtkviewer.plugin.renderStyle.mode.wireframe': 'Wireframe',
    'vtkviewer.plugin.renderStyle.mode.points': 'Points',
    'vtkviewer.plugin.renderStyle.mode.surfaceEdges': 'Surface + Edges',
    'vtkviewer.plugin.renderStyle.lighting.pbr': 'PBR',

    'vtkviewer.plugin.renderGrid.getShortcutConfig': 'Render Grid',
    'vtkviewer.plugin.renderGrid.refresh': 'Refresh',
    'vtkviewer.plugin.renderGrid.refreshTitle': 'Re-adapt to model size',
    'vtkviewer.plugin.renderGrid.autoSpacing': 'Auto Spacing',

    'vtkviewer.plugin.measurement.mode.point': 'Point',
    'vtkviewer.plugin.measurement.mode.distance': 'Distance',
    'vtkviewer.plugin.measurement.mode.angle': 'Angle',

    'vtkviewer.plugin.measurement.name': 'Measurement',
    'vtkviewer.plugin.measurement.description':
      'Supports point pick, distance measurement, and angle measurement',
    'vtkviewer.plugin.measurement.tooltip': 'Select measurement mode',
    'vtkviewer.plugin.measurement.tooltipEnable': 'Enable Measurement',
    'vtkviewer.plugin.measurement.tooltipDisable': 'Disable Measurement',
    'vtkviewer.plugin.measurement.noSession': 'No active measurement session',
    'vtkviewer.plugin.measurement.extensionLabel': 'Measurement Mode',
    'vtkviewer.plugin.measurement.resetDesc.deactivate': 'Exit measurement mode (keep history)',
    'vtkviewer.plugin.measurement.resetDesc.clear':
      'Clear all measurement data, activation state and mode',

    'vtkviewer.plugin.bookmark.name': 'Bookmark',
    'vtkviewer.plugin.bookmark.description': 'Save and restore multiple camera view bookmarks',
    'vtkviewer.plugin.bookmark.tooltip': 'Bookmark',
    'vtkviewer.plugin.bookmark.tooltipClose': 'Close Bookmarks',
    'vtkviewer.plugin.bookmark.shortcutDesc': 'Bookmark',
    'vtkviewer.plugin.bookmark.title': 'View Bookmarks',
    'vtkviewer.plugin.bookmark.cleared': 'All bookmarks cleared',
    'vtkviewer.plugin.bookmark.clearAll': 'Clear All',
    'vtkviewer.plugin.bookmark.clearAllTitle': 'Clear All Bookmarks',
    'vtkviewer.plugin.bookmark.full': 'Full',
    'vtkviewer.plugin.bookmark.save': 'Save',
    'vtkviewer.plugin.bookmark.saveCurrent': 'Save Current',
    'vtkviewer.plugin.bookmark.saveTip': 'Save current view',
    'vtkviewer.plugin.bookmark.delete': 'Delete',
    'vtkviewer.plugin.bookmark.autoName': 'View',
    'vtkviewer.plugin.bookmark.maxFeedback': 'Max',
    'vtkviewer.plugin.bookmark.savedFeedback': 'Saved',
    'vtkviewer.plugin.bookmark.emptyHint': 'Click the button below to bookmark the current view',
    'vtkviewer.plugin.bookmark.resetDesc': 'Reset bookmark plugin to default state',
    'vtkviewer.plugin.bookmark.restore': 'Restore View',
    'vtkviewer.plugin.bookmark.inputPlaceholder': 'Enter name (leave blank for auto-name)...',
    'vtkviewer.plugin.bookmark.maxHint': 'Limit reached',

    'vtkviewer.plugin.performance.name': 'Performance',
    'vtkviewer.plugin.performance.description':
      'Display rendering performance metrics (memory, FPS, render time, etc.)',
    'vtkviewer.plugin.performance.tooltipEnable': 'Enable Performance Monitor',
    'vtkviewer.plugin.performance.tooltipDisable': 'Disable Performance Monitor',
    'vtkviewer.plugin.performance.label.fps': 'FPS',
    'vtkviewer.plugin.performance.label.renderTime': 'Render',
    'vtkviewer.plugin.performance.label.triangles': 'Triangles',
    'vtkviewer.plugin.performance.label.memory': 'Memory',

    // ============================================================
    // animation/
    // ============================================================
    'vtkviewer.plugin.animation.name': 'Animation',
    'vtkviewer.plugin.animation.description': 'Scene animation playback control',
    'vtkviewer.plugin.animation.play': 'Play',
    'vtkviewer.plugin.animation.pause': 'Pause',

    // ============================================================
    // viewPreset
    // ============================================================
    'vtkviewer.viewPreset.front': 'Front',
    'vtkviewer.viewPreset.back': 'Back',
    'vtkviewer.viewPreset.left': 'Left',
    'vtkviewer.viewPreset.right': 'Right',
    'vtkviewer.viewPreset.top': 'Top',
    'vtkviewer.viewPreset.bottom': 'Bottom',
    'vtkviewer.viewPreset.iso': 'Isometric',

    // ============================================================
    // theme
    // ============================================================
    'vtkviewer.theme.current': 'Current Theme',
    'vtkviewer.theme.dark': 'Dark',
    'vtkviewer.theme.light': 'Light',
    'vtkviewer.theme.ocean': 'Ocean',
    'vtkviewer.theme.forest': 'Forest',
    'vtkviewer.theme.sunset': 'Sunset',

    'vtkviewer.plugin.renderStyle.lighting.flat': 'Flat',
    'vtkviewer.plugin.renderStyle.lighting.gouraud': 'Gouraud',
    'vtkviewer.plugin.renderStyle.opacity': 'Opacity',
    'vtkviewer.plugin.renderStyle.pointSize': 'Point Size',
    'vtkviewer.plugin.renderStyle.edgeWidth': 'Edge Width',
    'vtkviewer.plugin.renderStyle.showEdges': 'Show Edges',
    'vtkviewer.plugin.renderStyle.lighting': 'Lighting',
    'vtkviewer.plugin.renderStyle.resetDesc': 'Reset render style to default',
    'vtkviewer.plugin.renderStyle.interpolation': 'Interpolation',
    'vtkviewer.plugin.renderStyle.edgeColor': 'Edge Color',
    'vtkviewer.plugin.renderStyle.on': 'ON',
    'vtkviewer.plugin.renderStyle.off': 'OFF',

    // ============================================================
    // format/aggregate/
    // ============================================================
    'vtkviewer.plugin.format.parseError': 'Parse Error',
    'vtkviewer.plugin.zip.description':
      'ZIP aggregate format processor (auto-detects internal format)',
    'vtkviewer.plugin.zip.detectVtkjs':
      'Detected VTKJS format (contains index.json), processing as vtkjs mode',
    'vtkviewer.plugin.zip.invalidVtkjs': 'Invalid VTK.js ZIP format',
    'vtkviewer.plugin.zip.noSupportedModel': 'No supported model files found in ZIP',

    // ============================================================
    // utils/zipReader (translation keys for utility-level functions)
    // ============================================================
    'vtkviewer.zip.noObjFile': 'No OBJ file found in ZIP',
    'vtkviewer.zip.noSupportedModel': 'No supported 3D model files found in ZIP',
    'vtkviewer.zip.textureLoadFailed': 'Texture load failed',
    'vtkviewer.zip.textureNotFound': 'Texture image referenced by MTL not found',
    'vtkviewer.zip.noIndexJson': 'VTK.js ZIP: index.json file not found',
    'vtkviewer.zip.emptyScene': 'VTK.js ZIP: Scene is empty or invalid',
    'vtkviewer.zip.noDataType': 'VTK.js ZIP: Dataset type not specified',
    'vtkviewer.zip.cannotParseScene': 'VTK.js ZIP: Cannot parse scene data',
    'vtkviewer.zip.noValidData': 'VTK.js ZIP: HttpDataSetReader returned no valid data',
    'vtkviewer.zip.loadFailed': 'VTK.js ZIP: HttpDataSetReader load failed',
    'vtkviewer.zip.unsupportedFormat': 'Unsupported format',

    // ============================================================
    // format/advanced/
    // ============================================================
    'vtkviewer.plugin.drc.decoderModuleNotFound':
      'DracoDecoderModule not found after script loaded',
    'vtkviewer.plugin.drc.loadFailed': 'Failed to load Draco decoder from: ',
    'vtkviewer.plugin.drc.decoderReady': 'Draco decoder ready',
    'vtkviewer.plugin.drc.initFailed': 'Draco decoder initialization failed:',
    'vtkviewer.plugin.drc.description': 'DRC format processor (Draco compressed)',
    'vtkviewer.plugin.drc.decoderNotReady':
      'Draco decoder not ready. Configure via decoders prop or install draco3d package.',
    'vtkviewer.plugin.glb.description': 'GLB format processor (glTF Binary)',
    'vtkviewer.plugin.pdb.description': 'PDB molecular format processor',
    'vtkviewer.plugin.vti.description': 'VTK ImageData format processor (volume rendering)',
    'vtkviewer.plugin.vtp.description': 'VTK PolyData format processor',
    'vtkviewer.plugin.vtu.description': 'VTK UnstructuredGrid format processor (surface rendering)',

    // ============================================================
    // format/geometry/
    // ============================================================
    'vtkviewer.plugin.obj.description': 'OBJ format processor',
    'vtkviewer.plugin.ply.description': 'PLY format processor',
    'vtkviewer.plugin.stl.description': 'STL format processor (supports ASCII and binary)',

    // ============================================================
    // overlay/
    // ============================================================
    'vtkviewer.plugin.loading.name': 'Loading',
    'vtkviewer.plugin.loading.description': 'Display file loading progress',
    'vtkviewer.plugin.loading.stage.idle': 'Preparing',
    'vtkviewer.plugin.loading.stage.downloading': 'Downloading',
    'vtkviewer.plugin.loading.stage.reading': 'Reading',
    'vtkviewer.plugin.loading.stage.parsing': 'Parsing',
    'vtkviewer.plugin.loading.stage.rendering': 'Rendering',
    'vtkviewer.plugin.loading.stage.complete': 'Complete',
    'vtkviewer.plugin.loading.stage.unknown': 'Loading',
    'vtkviewer.plugin.loading.fileSize': 'File size: ',
    'vtkviewer.plugin.webgl.name': 'WebGL Context Lost',
    'vtkviewer.plugin.webgl.description': 'WebGL context lost notification and recovery',
    'vtkviewer.plugin.webgl.title': 'WebGL Context Lost',
    'vtkviewer.plugin.webgl.message': 'Graphics rendering context lost, attempting to recover...',
    'vtkviewer.plugin.webgl.retry': 'Retry',
    'vtkviewer.plugin.error.name': 'Error',
    'vtkviewer.plugin.error.description': 'Display error messages and recovery actions',
    'vtkviewer.plugin.error.retry': 'Retry',
    'vtkviewer.plugin.error.dismiss': 'Dismiss',

    // ============================================================
    // source
    // ============================================================
    'vtkviewer.source.viewerNotReady': 'Viewer not initialized, unable to load data source',
    'vtkviewer.source.unsupportedFormat': 'Unsupported file format',
    'vtkviewer.source.formatNotDetected':
      'Unable to detect file format, please provide sourceFormat',
    'vtkviewer.source.loadFailed': 'Failed to load data source',
    'vtkviewer.source.httpError': 'Download failed',
    'vtkviewer.source.autoLoadFailed': 'Auto-load data source failed',
    'vtkviewer.source.retryLoadFailed': 'Retry load data source failed',
    'vtkviewer.source.builtinThemesRegistered': 'Built-in themes registered',
    'vtkviewer.source.fileLoadFailed': 'File load failed',
    'vtkviewer.source.filesLoadFailed': 'Files batch load failed',
    'vtkviewer.source.pluginReinitFailed': 'Plugin re-initialization failed',
    'vtkviewer.source.ctxNotFound': 'Cannot access ViewerContext',
    'vtkviewer.scene.failedReset': 'Failed to reset plugin states',
    'vtkviewer.context.canvasNotFound': 'Hi-res screenshot unavailable: Canvas not found',
    'vtkviewer.context.2dContextFailed':
      'Transparent screenshot processing failed: Cannot get 2D context',
    'vtkviewer.context.transparentExportFailed': 'Transparent screenshot export failed',
    'vtkviewer.context.hiResCaptureFailed': 'Hi-res screenshot capture failed',
    'vtkviewer.context.captureFailed': 'Screenshot capture failed',
    'vtkviewer.context.renderWindowNotAvailable': 'Render window not available',
    'vtkviewer.context.noRenderViewsAvailable': 'No available render views',
    'vtkviewer.context.failedReadWebGLCanvas': 'Failed to read WebGL canvas',
    'vtkviewer.context.webglContextLost': 'WebGL context lost',
    'vtkviewer.context.webglContextRestored': 'WebGL context restored',
    'vtkviewer.context.containerNotAvailable': 'Container not available for fullscreen',
    'vtkviewer.context.failedExitFullscreen': 'Failed to exit fullscreen',
    'vtkviewer.context.failedEnterFullscreen': 'Failed to enter fullscreen',
    'vtkviewer.context.renderWindowNotAvailableError': 'Render window not available',
    'vtkviewer.context.noRenderViewsAvailableError': 'No render views available',
    'vtkviewer.context.canvasNotAvailable': 'Canvas not available',
    'vtkviewer.context.captureImagesFailed': 'captureImages failed, falling back to canvas',
    'vtkviewer.interaction.renderWindowNotAvailable': 'renderWindow not available, skip init',
    'vtkviewer.context.initFailed': 'Initialization failed',
    'vtkviewer.context.viewerNotInitialized': 'Viewer not initialized',
    'vtkviewer.context.debug.attachToContainer': 'attachToContainer called',
    'vtkviewer.context.debug.renderPipelineReady': 'emitting RENDER_PIPELINE_READY event',
    'vtkviewer.command.alreadyRegistered': 'Command already registered, overwriting',
    'vtkviewer.command.notFound': 'Command not found',
    'vtkviewer.command.cannotExecute': 'Command cannot be executed',
    'vtkviewer.disposal.errorDisposing': 'Error disposing resource',
    'vtkviewer.disposal.errorInRelease': 'Error in release function',
    'vtkviewer.reset.stoppingDueToFailure': 'Stopping reset due to failure in',
    'vtkviewer.reset.duplicateAction': 'Duplicate reset action key, overriding',
    'vtkviewer.reset.failedToCollect': 'Failed to collect reset actions from plugin',
    'vtkviewer.reset.actionNotFound': 'Reset action not found',
    'vtkviewer.reset.noActionsRegistered': 'No reset actions registered for plugin',
    'vtkviewer.reset.guardConditionNotMet': 'guard condition not met',
    'vtkviewer.reset.guardCheckFailed': 'Guard check failed for',
    'vtkviewer.reset.actionFailed': 'Reset action failed',
    'vtkviewer.state.pluginStateAlreadyRegistered': 'Plugin state already registered',
    'vtkviewer.state.pluginStateNotFound': 'Plugin state not found',
    'vtkviewer.theme.notRegistered': 'Theme not registered',
    'vtkviewer.toolbar.extensionNotFound': 'Extension not found, cannot',
    'vtkviewer.toolbar.infoItemNotFound': 'Item not found, cannot',
    'vtkviewer.context.missingSubContexts': 'ViewerContextBuilder missing required sub-contexts',
    'vtkviewer.plugin.clipping.cutterFailed': 'Cutter failed',
    'vtkviewer.plugin.clipping.scheduleUpdateError': 'Schedule clip update error',
    'vtkviewer.plugin.clipping.vtkResourcesInitialized': 'VTK resources initialized',
    'vtkviewer.plugin.clipping.cannotInitWidget':
      'Cannot init widget: renderer or interactor missing',
    'vtkviewer.plugin.clipping.cannotEnableClipping':
      'Cannot enable clipping: plane not initialized',
    'vtkviewer.plugin.clipping.inputType': 'input type',
    'vtkviewer.plugin.colorBy.cellPickerNotInitialized': 'cellPicker not initialized',
    'vtkviewer.plugin.colorBy.collectArrayError': 'Error collecting color arrays',
    'vtkviewer.plugin.colorBy.noAvailableArrays': 'No available arrays',
    'vtkviewer.plugin.colorBy.name': 'Color Map',
    'vtkviewer.plugin.colorBy.description': 'Control color mapping array and range',
    'vtkviewer.plugin.colorBy.colorBy': 'Color By',
    'vtkviewer.plugin.colorBy.pickPoint': 'Pick Point',
    'vtkviewer.plugin.colorBy.pickCount': 'Picked',
    'vtkviewer.plugin.colorBy.solidColor': 'Solid Color',
    'vtkviewer.plugin.colorBy.preset': 'Color Preset',
    'vtkviewer.plugin.loadModel.loadFailed': 'Load failed',
    'vtkviewer.plugin.loadModel.formatHandlerNotFound': 'Format handler not found',
    'vtkviewer.plugin.axes.renderWindowNotAvailable':
      'renderWindow or renderer not available, skip init',
    'vtkviewer.plugin.axes.interactorNull':
      'renderWindow.getInteractor() returned null, orientation widget may not respond to interaction',
    'vtkviewer.plugin.measurement.rendererNotAvailable': 'renderer not available, skip init',
    'vtkviewer.plugin.measurement.interactorNotAvailable': 'interactor not available'
  }
}

/**
 * 内置事件常量
 */

export const BuiltinEvents = {
  SCENE_LOADED: 'scene:loaded',
  SCENE_CLEARED: 'scene:cleared',
  RENDER_START: 'render:start',
  RENDER_END: 'render:end',
  RENDER_PIPELINE_READY: 'render:pipelineReady', // 渲染管线就绪（attachToContainer 完成后触发）
  TOOL_CHANGED: 'interaction:toolChanged',
  MEASUREMENT_START: 'measurement:start',
  MEASUREMENT_COMPLETE: 'measurement:complete',
  MEASUREMENT_CLEAR: 'measurement:clear',
  COLORBY_PICKING_START: 'colorBy:pickingStart',
  ANIMATION_PLAY: 'animation:play',
  ANIMATION_PAUSE: 'animation:pause',
  VOLUME_PRESET_CHANGED: 'volume:presetChanged',
  COLOR_ARRAY_CHANGED: 'colorBy:arrayChanged',
  PERFORMANCE_UPDATE: 'performance:update',
  PLUGINS_INITIALIZED: 'plugins:initialized',
  KEY_BINDING_REGISTRY_READY: 'keyBinding:registry-ready',
  ERROR_OCCURRED: 'error:occurred',
  ERROR_CLEARED: 'error:cleared',
  WEBGL_CONTEXT_LOST: 'webgl:contextLost',
  WEBGL_CONTEXT_RESTORED: 'webgl:contextRestored',
  MEMORY_PRESSURE_CHANGED: 'memory:pressureChanged',
  MEMORY_CLEANUP: 'memory:cleanup',
  THEME_CHANGED: 'theme:changed',
  LOCALE_CHANGED: 'locale:changed',
  FILE_LOAD: 'file:load',
  FILES_LOAD: 'files:load',
  RESET_START: 'reset:start',
  RESET_COMPLETE: 'reset:complete'
} as const

export type BuiltinEventType = (typeof BuiltinEvents)[keyof typeof BuiltinEvents]

/**
 * 内置命令常量
 * 命令ID命名规范：{pluginId}:{commandName}
 */

export const BuiltinCommands = {
  RENDER: 'render',
  RESET_CAMERA: 'resetCamera',
  RESET_TO_DEFAULT_VIEW: 'resetToDefaultView',
  RESET_ALL: 'resetAll',
  SET_CAMERA_VIEW: 'setCameraView',
  RESTORE_CAMERA: 'restoreCamera',
  TOGGLE_TOOL: 'toggleTool',
  CAPTURE_SCREENSHOT: 'captureScreenshot',
  TOGGLE_FULLSCREEN: 'toggleFullscreen',
  TOGGLE_AXES: 'toggleAxes',
  SET_BACKGROUND_COLOR: 'setBackgroundColor',
  APPLY_VIEW_PRESET: 'applyViewPreset',
  START_MEASUREMENT: 'startMeasurement',
  CLEAR_MEASUREMENT: 'clearMeasurement',
  PLAY_ANIMATION: 'playAnimation',
  PAUSE_ANIMATION: 'pauseAnimation',
  GO_TO_FRAME: 'goToFrame',
  SET_VOLUME_PRESET: 'setVolumePreset',
  SET_VOLUME_QUALITY: 'setVolumeQuality',
  SET_COLOR_BY_ARRAY: 'setColorByArray',
  GET_PERFORMANCE_DATA: 'getPerformanceData',
  RETRY_LOAD: 'retryLoad',
  DISMISS_ERROR: 'dismissError'
} as const

export type BuiltinCommandType = (typeof BuiltinCommands)[keyof typeof BuiltinCommands]

/** 内置主题预设（只用于 UI 显示，状态管理在 ctx.theme 中） */
export const BUILTIN_THEMES: Record<string, ThemeConfig> = {
  dark: {
    id: 'dark',
    name: '深色主题',
    isDark: true,
    colors: {
      toolbarBg: 'rgba(40, 40, 55, 0.85)',
      toolbarBorder: 'rgba(255, 255, 255, 0.08)',
      btnBg: 'rgba(255, 255, 255, 0.06)',
      btnBgHover: 'rgba(255, 255, 255, 0.12)',
      btnBgActive: 'rgba(100, 255, 218, 0.18)',
      btnColor: '#c8c8d0',
      btnColorHover: '#ffffff',
      btnColorActive: '#64ffda',
      separatorColor: 'rgba(255, 255, 255, 0.12)',
      popupBg: '#1e1e2e',
      popupBorder: 'rgba(255, 255, 255, 0.08)',
      popupColor: '#c8c8d0',
      popupLabelColor: 'rgba(255, 255, 255, 0.5)',
      inputBg: 'rgba(0, 0, 0, 0.35)',
      inputBorder: 'rgba(255, 255, 255, 0.08)',
      inputColor: '#c8c8d0',
      loadingBg: 'rgba(0, 0, 0, 0.65)',
      loadingCardBg: 'rgba(255, 255, 255, 0.05)',
      loadingText: '#e0e0e0',
      loadingTextSecondary: 'rgba(255, 255, 255, 0.6)',
      infoPanelBg: 'rgba(40, 40, 55, 0.85)',
      infoPanelLabel: 'rgba(255, 255, 255, 0.5)',
      infoPanelValue: 'rgba(255, 255, 255, 0.9)',
      errorBg: 'rgba(239, 68, 68, 0.15)',
      errorBorder: 'rgba(239, 68, 68, 0.3)',
      errorColor: '#ef4444',
      extensionBg: 'rgba(40, 40, 55, 0.85)',
      extensionSeparatorColor: 'rgba(255, 255, 255, 0.1)'
    }
  },
  light: {
    id: 'light',
    name: '浅色主题',
    isDark: false,
    colors: {
      toolbarBg: 'rgba(255, 255, 255, 0.88)',
      toolbarBorder: 'rgba(0, 0, 0, 0.08)',
      btnBg: 'rgba(0, 0, 0, 0.04)',
      btnBgHover: 'rgba(0, 0, 0, 0.08)',
      btnBgActive: 'rgba(0, 100, 80, 0.12)',
      btnColor: '#3a3a4a',
      btnColorHover: '#1a1a2e',
      btnColorActive: '#00796b',
      separatorColor: 'rgba(0, 0, 0, 0.1)',
      popupBg: '#ffffff',
      popupBorder: 'rgba(0, 0, 0, 0.1)',
      popupColor: '#3a3a4a',
      popupLabelColor: 'rgba(0, 0, 0, 0.45)',
      inputBg: 'rgba(0, 0, 0, 0.04)',
      inputBorder: 'rgba(0, 0, 0, 0.12)',
      inputColor: '#3a3a4a',
      loadingBg: 'rgba(255, 255, 255, 0.75)',
      loadingCardBg: 'rgba(255, 255, 255, 0.9)',
      loadingText: 'rgba(0, 0, 0, 0.85)',
      loadingTextSecondary: 'rgba(0, 0, 0, 0.55)',
      infoPanelBg: 'rgba(255, 255, 255, 0.88)',
      infoPanelLabel: 'rgba(0, 0, 0, 0.45)',
      infoPanelValue: 'rgba(0, 0, 0, 0.85)',
      errorBg: 'rgba(220, 38, 38, 0.08)',
      errorBorder: 'rgba(220, 38, 38, 0.2)',
      errorColor: '#dc2626',
      extensionBg: 'rgba(255, 255, 255, 0.88)',
      extensionSeparatorColor: 'rgba(0, 0, 0, 0.1)'
    }
  },
  ocean: {
    id: 'ocean',
    name: '海洋主题',
    isDark: true,
    colors: {
      toolbarBg: 'rgba(20, 40, 60, 0.9)',
      toolbarBorder: 'rgba(100, 200, 255, 0.15)',
      btnBg: 'rgba(100, 200, 255, 0.08)',
      btnBgHover: 'rgba(100, 200, 255, 0.15)',
      btnBgActive: 'rgba(100, 200, 255, 0.25)',
      btnColor: '#8ec8e8',
      btnColorHover: '#b0e0ff',
      btnColorActive: '#64c8ff',
      separatorColor: 'rgba(100, 200, 255, 0.15)',
      popupBg: '#0a1929',
      popupBorder: 'rgba(100, 200, 255, 0.12)',
      popupColor: '#8ec8e8',
      popupLabelColor: 'rgba(100, 200, 255, 0.5)',
      inputBg: 'rgba(0, 20, 40, 0.5)',
      inputBorder: 'rgba(100, 200, 255, 0.12)',
      inputColor: '#8ec8e8',
      loadingBg: 'rgba(10, 25, 41, 0.8)',
      loadingCardBg: 'rgba(20, 50, 80, 0.6)',
      loadingText: '#b0e0ff',
      loadingTextSecondary: 'rgba(100, 200, 255, 0.6)',
      infoPanelBg: 'rgba(20, 40, 60, 0.9)',
      infoPanelLabel: 'rgba(100, 200, 255, 0.5)',
      infoPanelValue: 'rgba(100, 200, 255, 0.9)',
      errorBg: 'rgba(255, 100, 100, 0.15)',
      errorBorder: 'rgba(255, 100, 100, 0.3)',
      errorColor: '#ff6b6b',
      extensionBg: 'rgba(20, 40, 60, 0.9)',
      extensionSeparatorColor: 'rgba(100, 200, 255, 0.1)'
    }
  },
  forest: {
    id: 'forest',
    name: '森林主题',
    isDark: true,
    colors: {
      toolbarBg: 'rgba(20, 40, 30, 0.9)',
      toolbarBorder: 'rgba(100, 200, 150, 0.15)',
      btnBg: 'rgba(100, 200, 150, 0.08)',
      btnBgHover: 'rgba(100, 200, 150, 0.15)',
      btnBgActive: 'rgba(100, 255, 180, 0.25)',
      btnColor: '#8ec8a8',
      btnColorHover: '#b0e0c0',
      btnColorActive: '#64ff96',
      separatorColor: 'rgba(100, 200, 150, 0.15)',
      popupBg: '#0a1910',
      popupBorder: 'rgba(100, 200, 150, 0.12)',
      popupColor: '#8ec8a8',
      popupLabelColor: 'rgba(100, 200, 150, 0.5)',
      inputBg: 'rgba(0, 20, 15, 0.5)',
      inputBorder: 'rgba(100, 200, 150, 0.12)',
      inputColor: '#8ec8a8',
      loadingBg: 'rgba(10, 25, 16, 0.8)',
      loadingCardBg: 'rgba(20, 50, 35, 0.6)',
      loadingText: '#b0e0c0',
      loadingTextSecondary: 'rgba(100, 200, 150, 0.6)',
      infoPanelBg: 'rgba(20, 40, 30, 0.9)',
      infoPanelLabel: 'rgba(100, 200, 150, 0.5)',
      infoPanelValue: 'rgba(100, 200, 150, 0.9)',
      errorBg: 'rgba(255, 100, 100, 0.15)',
      errorBorder: 'rgba(255, 100, 100, 0.3)',
      errorColor: '#ff6b6b',
      extensionBg: 'rgba(20, 40, 30, 0.9)',
      extensionSeparatorColor: 'rgba(100, 200, 150, 0.1)'
    }
  },
  sunset: {
    id: 'sunset',
    name: '日落主题',
    isDark: true,
    colors: {
      toolbarBg: 'rgba(50, 30, 20, 0.9)',
      toolbarBorder: 'rgba(255, 150, 100, 0.15)',
      btnBg: 'rgba(255, 150, 100, 0.08)',
      btnBgHover: 'rgba(255, 150, 100, 0.15)',
      btnBgActive: 'rgba(255, 180, 120, 0.25)',
      btnColor: '#e8a888',
      btnColorHover: '#ffc0a0',
      btnColorActive: '#ff9060',
      separatorColor: 'rgba(255, 150, 100, 0.15)',
      popupBg: '#1a0f0a',
      popupBorder: 'rgba(255, 150, 100, 0.12)',
      popupColor: '#e8a888',
      popupLabelColor: 'rgba(255, 150, 100, 0.5)',
      inputBg: 'rgba(40, 20, 10, 0.5)',
      inputBorder: 'rgba(255, 150, 100, 0.12)',
      inputColor: '#e8a888',
      loadingBg: 'rgba(26, 15, 10, 0.8)',
      loadingCardBg: 'rgba(50, 30, 20, 0.6)',
      loadingText: '#ffc0a0',
      loadingTextSecondary: 'rgba(255, 150, 100, 0.6)',
      infoPanelBg: 'rgba(50, 30, 20, 0.9)',
      infoPanelLabel: 'rgba(255, 150, 100, 0.5)',
      infoPanelValue: 'rgba(255, 150, 100, 0.9)',
      errorBg: 'rgba(255, 100, 100, 0.15)',
      errorBorder: 'rgba(255, 100, 100, 0.3)',
      errorColor: '#ff6b6b',
      extensionBg: 'rgba(50, 30, 20, 0.9)',
      extensionSeparatorColor: 'rgba(255, 150, 100, 0.1)'
    }
  }
}
