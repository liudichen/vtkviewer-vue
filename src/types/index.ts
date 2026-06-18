import type { Ref } from 'vue'

import type { I18nTranslateFunction, LanguageOption, ThemeConfig, ViewerContext } from '@/core'
import type { PluginsConfig } from '@/plugins'

/** 工具栏组件Props */
export interface PluginToolbarProps {
  /** 查看器上下文 */
  ctx: ViewerContext
  /** 自定义类名 */
  class?: string | string[]
  /** i18n 版本号（locale 变更时递增，用于清空 renderCache） */
  localeVersion?: number | Ref<number>
}

/** 工具栏扩展区Props */
export interface ToolbarExtensionProps {
  /** 查看器上下文 */
  ctx: ViewerContext
  /** 自定义类名 */
  class?: string | string[]
  /** 背景色 */
  background?: string
  /** 圆角（px），默认 8 */
  borderRadius?: number
  /** 内边距（px），默认 4 8 */
  padding?: string
  /** 分隔线颜色 */
  separatorColor?: string
  /** 按钮间距（px），默认 2 */
  gap?: number
}

/** 工具栏信息区Props */
export interface ToolbarInfoPanelProps {
  /** 查看器上下文 */
  ctx: ViewerContext
  /** 自定义类名 */
  class?: string | string[]
  /** 背景色 */
  background?: string
  /** 圆角（px），默认 8 */
  borderRadius?: number
  /** 内边距（px），默认 4 8 */
  padding?: string
  /** 字体大小，默认 12px */
  fontSize?: number
  /** 最大高度（px），超出后滚动，默认 120 */
  maxHeight?: number
}

/** 工具栏配置 */
export interface ToolbarConfig {
  /** 图标尺寸（px），默认 20 */
  iconSize?: number
  /** 按钮尺寸（px），默认 32 */
  buttonSize?: number
  /** 背景色，默认 rgba(167, 165, 165, 0.6) */
  background?: string
  /** 圆角（px），默认 8 */
  borderRadius?: number
  /** 内边距（px），默认 8 */
  padding?: number
  /** 按钮间距（px），默认 2 */
  gap?: number
  /** 按钮背景色，默认 rgba(255, 255, 255, 0.06) */
  buttonBackground?: string
  /** 按钮圆角（px），默认 6 */
  buttonBorderRadius?: number
  /** 分隔线颜色，默认 rgba(255, 255, 255, 0.2) */
  separatorColor?: string
}

/** UI插件配置 */
export interface UIConfig {
  /** 没有模型时是否隐藏UI插件，默认 false */
  hideWhenNoModel?: boolean
}

/** 信息面板配置 */
export interface InfoPanelConfig {
  /** 是否显示信息面板，默认 true */
  show?: boolean
  /** 背景色 */
  background?: string
  /** 圆角（px），默认 8 */
  borderRadius?: number
  /** 内边距，默认 '4px 8px' */
  padding?: string
  /** 字体大小（px），默认 12 */
  fontSize?: number
  /** 最大高度（px），默认 120 */
  maxHeight?: number
}

/** 数据源类型 */
export type VtkViewerSource = File | string | ArrayBuffer | ReadableStream

/** VtkViewer组件属性 */
export interface VtkViewerProps {
  /** 默认背景色（响应式，支持外部动态修改）
   * @default '#e6e6e6'
   */
  background?: string
  /** 自定义类名 */
  class?: string | string[]
  /** 工具栏配置，false 则隐藏工具栏 */
  toolbar?: ToolbarConfig | boolean
  /** 传递到 PluginToolbar 的自定义 CSS class */
  toolbarClass?: string | string[]
  /** 信息面板配置，false 则隐藏信息面板 */
  infoPanel?: InfoPanelConfig | boolean
  /** 传递到 ToolbarInfoPanel 的自定义 CSS class */
  toolbarInfoPanelClass?: string | string[]
  /** 传递到 ToolbarExtension 的自定义 CSS class */
  toolbarExtensionClass?: string | string[]
  /** UI插件配置 */
  ui?: UIConfig
  /**
   * 插件配置（高优先级）
   * 采用分类配置格式，按插件类型分组：
   *   - format:  格式插件
   *   - toolbar: 工具栏插件
   *   - ui:      UI 插件
   *   - service: 服务插件
   *
   * 当 ctx 由外部传入时，同分类配置将覆盖 useViewer 中的默认配置。
   * 当 ctx 由内部创建时，作为 useViewer 的 plugins 参数。
   */
  plugins?: PluginsConfig
  /**
   * 数据源（File/URL/ArrayBuffer/ReadableStream），组件内部自动加载
   * 设置后外部无需手动调用 loadFile 等操作
   */
  source?: VtkViewerSource | null
  /**
   * 数据源格式（可选，但建议提供）
   * 当 source 为 File 或 URL 时，可以从文件扩展名自动检测
   * 当 source 为 ArrayBuffer 或 ReadableStream 时，建议提供此参数
   * 如果不提供，内部会尝试使用魔数（magic number）进行格式探测
   */
  sourceFormat?: string
  /** 数据源文件名（当 source 为 ArrayBuffer 或 ReadableStream 时可选，用于格式检测） */
  sourceFilename?: string
  /** 主题ID（如 'dark', 'light', 'ocean', 'forest', 'sunset'）
   * @default 'light'
  */
  theme?: string
  /** 自定义主题配置（格式与内置主题一致，同名覆盖内置主题） */
  customThemes?: Record<string, ThemeConfig>
  /**
   * 国际化翻译函数（外部注入）。
   * 不传时所有字符串原样使用 key 作为 fallback。
   * key 格式：`vtkviewer.模块.子键`（如 `vtkviewer.toolbar.rotate.title`）
   */
  t?: I18nTranslateFunction | null
  /**
   * 当前语言标识（如 'zh', 'en'）。
   * 变更时触发 renderCache 清理和组件重渲染。
   * @default 'zh'
   */
  locale?: string
  /**
   * 可用语言列表。
   * 传递给 LanguageSwitchPlugin，未传时默认 [{ id:'zh', label:'中文' }, { id:'en', label:'English' }]。
   */
  languages?: LanguageOption[]
  /**
   * 外部解码器路径配置。
   * 键为解码器标识，值为 JS 文件路径（本地 public/ 路径或 CDN URL）。
   * 支持的标识：
   *   - draco: Draco 解码器，对应 draco_decoder.js
   *   - ifc:   IFC 解码器（预留），对应 web-ifc.js
   * 未配置时插件会尝试动态 import 对应的 npm 包。
   */
  decoders?: Record<string, string>
  /**
   * 是否启用调试日志输出。
   * 开启后会在控制台输出插件初始化、过程追踪等调试信息。
   * 生产环境建议保持关闭。
   * @default false
   */
  debug?: boolean
  /**
   * 是否启用手势控制（触摸/捏合/旋转等触屏交互）。
   * 设置为 false 时，即使硬件支持触屏，手势交互也不会启用。
   * @default true。
   */
  enableGesture?: boolean
  /**
   * 是否启用键盘控制（相机 WASD 导航和所有插件快捷键）。
   * 设置为 false 时，所有键盘快捷键失效且不在 tooltip 中显示。
   * @default true。
   */
  enableKeyboard?: boolean
}
