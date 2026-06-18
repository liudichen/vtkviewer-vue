/**
 * 内置默认插件配置
 * 当用户未传入 plugins 配置时使用本配置。
 * 用户传入 plugins 时，同分类覆盖本配置。
 */

import type { PluginsConfig } from './types'

import {
  StlPlugin,
  ObjPlugin,
  PlyPlugin,
  VtpPlugin,
  VtuPlugin,
  VtiPlugin,
  PdbPlugin,
  ZipPlugin,
  DrcPlugin
} from './format/'

import {
  LoadModelPlugin,
  UnloadModelPlugin,
  RotatePlugin,
  ZoomPlugin,
  PanPlugin,
  CenterModelPlugin,
  ResetAllPlugin,
  ViewSelectPlugin,
  FullscreenPlugin,
  ClippingPlugin,
  RenderStylePlugin,
  RenderPrecisionPlugin,
  ColorByPlugin,
  BackgroundColorPlugin,
  LightIntensityPlugin,
  AxesPlugin,
  RenderGridPlugin,
  ThemeSwitchPlugin,
  LanguageSwitchPlugin,
  ScreenshotPlugin,
  MeasurementPlugin,
  BookmarkPlugin,
  PerformancePlugin,
  type ViewSelectPluginConfig,
  type RotatePluginConfig,
  type ZoomPluginConfig,
  type PanPluginConfig,
  type CenterModelPluginConfig,
  type FullscreenPluginConfig,
  type ResetAllPluginConfig,
  type AxesPluginConfig,
  type LightIntensityPluginConfig,
  type BackgroundColorPluginConfig,
  type RenderStylePluginConfig,
  type RenderGridPluginConfig,
  type ClippingPluginConfig,
  type MeasurementPluginConfig,
  type ColorByPluginConfig,
  type ScreenshotPluginConfig,
  type BookmarkPluginConfig,
  type ThemeSwitchPluginConfig,
  type PerformancePluginConfig,
  type RenderPrecisionPluginConfig,
  type LanguageSwitchPluginConfig
} from './toolbar'

import { LoadingPlugin, ErrorPlugin, FilenameInfoPlugin, SceneTreePlugin } from './ui/index'
import { DragDropPlugin, KeyBindingPlugin } from './service/index'

/** 内置默认插件配置 */
export const DEFAULT_PLUGIN_CONFIG: PluginsConfig = {
  format: [StlPlugin, ZipPlugin, VtuPlugin, VtpPlugin, VtiPlugin, PlyPlugin, ObjPlugin, PdbPlugin,DrcPlugin],
  toolbar: [
    LoadModelPlugin,                                                                  // 加载模型
    UnloadModelPlugin,                                                                // 卸载模型
    [ViewSelectPlugin, { group: 'viewSelect' } satisfies ViewSelectPluginConfig],     // 视图选择（正视图/侧视图等）
    [RotatePlugin, { group: 'control' } satisfies RotatePluginConfig],                // 旋转控制
    [ZoomPlugin, { group: 'control' } satisfies ZoomPluginConfig],                   // 缩放控制
    [PanPlugin, { group: 'control' } satisfies PanPluginConfig],                     // 平移控制
    [CenterModelPlugin, { group: 'control' } satisfies CenterModelPluginConfig],     // 居中模型
    [FullscreenPlugin, { group: 'control' } satisfies FullscreenPluginConfig],       // 全屏切换
    [ResetAllPlugin, { group: 'control' } satisfies ResetAllPluginConfig],           // 重置所有
    [AxesPlugin, { group: 'scene' } satisfies AxesPluginConfig],                     // 坐标轴显示
    [LightIntensityPlugin, { group: 'scene' } satisfies LightIntensityPluginConfig], // 光照强度调节
    [BackgroundColorPlugin, { group: 'scene' } satisfies BackgroundColorPluginConfig],// 背景颜色设置
    [RenderStylePlugin, { group: 'model' } satisfies RenderStylePluginConfig],       // 渲染样式（面/线/点）
    [RenderGridPlugin, { group: 'model' } satisfies RenderGridPluginConfig],         // 渲染网格
    [ClippingPlugin, { group: 'model' } satisfies ClippingPluginConfig],             // 裁剪平面
    [MeasurementPlugin, { group: 'model' } satisfies MeasurementPluginConfig],       // 测量工具
    [ColorByPlugin, { group: 'model' } satisfies ColorByPluginConfig],               // 按属性着色
    [ScreenshotPlugin, { group: 'tools1' } satisfies ScreenshotPluginConfig],       // 截图保存
    [BookmarkPlugin, { group: 'tools1' } satisfies BookmarkPluginConfig],             // 书签管理
    [ThemeSwitchPlugin, { group: 'tools1' } satisfies ThemeSwitchPluginConfig],     // 主题切换
    [PerformancePlugin, { group: 'tools2' } satisfies PerformancePluginConfig],     // 性能监控
    [RenderPrecisionPlugin, { group: 'tools2' } satisfies RenderPrecisionPluginConfig], // 渲染精度设置
    [LanguageSwitchPlugin, { group: 'tools2' } satisfies LanguageSwitchPluginConfig] // 语言切换
  ],
  ui: [LoadingPlugin, ErrorPlugin, FilenameInfoPlugin, SceneTreePlugin],
  service: [DragDropPlugin, KeyBindingPlugin]
}
