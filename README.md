# VtkViewer - VTK.js 3D可视化Vue组件

[English](README.en.md) | [中文](README.md)

![npm version](https://img.shields.io/npm/v/vtkviewer-vue)
![MIT License](https://img.shields.io/badge/license-MIT-blue)
![vue version](https://img.shields.io/badge/vue-3.0+-green)


基于VTK.js的Vue 3组件，提供强大的3D模型可视化能力，支持多种3D模型格式、完整的工具栏插件系统、主题定制和国际化支持。

![VtkViewer界面预览](https://cdn.jsdelivr.net/gh/liudichen/static@master/images/vtkviewer-vue.png)

---

## 1. 主要功能特性

### 1.1 核心功能

- **强大的3D渲染引擎**：基于VTK.js的WebGL 2.0渲染引擎，支持面、线框、点等多种渲染样式
- **多格式支持**：支持STL、OBJ、PLY、VTP、VTU、VTI、GLB、DRC、PDB、ZIP等10+种3D模型格式
- **插件化架构**：所有功能通过插件实现，支持格式插件、工具栏插件、UI插件、服务插件四大类插件
- **v-model 支持**：通过 `v-model:ctx` 获取内部 ViewerContext，事件监听和编程式控制触手可及
- **完整的主题系统**：内置5套主题（light/dark/ocean/forest/sunset），支持自定义主题和CSS变量覆盖
- **国际化支持**：内置中英文语言包，支持自定义翻译函数和动态语言切换
- **TypeScript支持**：完整的TypeScript类型定义，提供优秀的开发体验和类型安全

### 1.2 交互功能

- **鼠标交互**：旋转（左键拖拽）、缩放（右键/滚轮）、平移（中键/Shift+左键）
- **触摸交互**：捏合缩放、单指旋转、双指平移，完美支持移动端
- **键盘快捷键**：可自定义的快捷键系统（如F全屏、R重置视图等）
- **拖拽加载**：支持直接拖拽模型文件到视口加载
- **工具栏操作**：提供加载/卸载模型、视图控制、渲染样式切换、剖切、测量、截图等20+种工具

### 1.3 UI与体验

- **响应式布局**：自动适配不同屏幕尺寸（xs/sm/md/lg/xl），支持移动端和桌面端
- **信息面板**：实时显示FPS、渲染时间、三角形数量、内存使用量等信息
- **场景树面板**：可视化场景结构，支持显隐控制、颜色修改等
- **加载进度提示**：优雅的加载动画和进度显示
- **错误提示**：友好的错误信息展示和恢复建议

### 1.4 高级特性

- **事件系统**：基于Event Bus的插件通信机制，支持内置事件和自定义事件
- **命令系统**：统一的命令注册和执行机制，支持快捷键绑定
- **剖切功能**：支持Clip/Cut/Section三种剖切模式，带3D Widget交互
- **测量工具**：支持点坐标、距离、角度三种测量模式
- **颜色映射**：支持按标量数组进行颜色映射，自动检测最佳映射数组
- **动画支持**：支持带动画的模型格式（如GLB），提供播放/暂停/帧跳转控制
- **书签系统**：保存和恢复相机视角，快速定位到感兴趣视角
- **性能监控**：实时显示FPS、渲染时间等性能指标
- **截图导出**：支持自定义倍率、格式（PNG/JPEG）、透明背景的截图功能

### 1.5 开发者友好

- **v-model 响应式**：通过 `v-model:ctx` 获取内部上下文，`isReady` 内置于 ctx
- **插件开发**：完善的插件开发接口和基类，支持快速扩展
- **自动资源清理**：组件卸载时自动释放VTK.js资源，防止内存泄漏
- **格式自动检测**：支持基于文件扩展名、魔术数字、内容分析的格式自动检测
- **调试支持**：内置调试日志系统，方便开发和排查问题

---

## 2. 快速开始

### 2.1 安装

```bash
# npm
npm install vtkviewer-vue

# pnpm
pnpm add vtkviewer-vue

# yarn
yarn add vtkviewer-vue
```

### 2.2 依赖说明

**Peer Dependencies（对等依赖）**：
- `vue` (^3.0.0) - 必须安装

**核心依赖（自动安装）**：
- `@kitware/vtk.js` (^36.2.0) - VTK.js核心库
- `events` (^3.3.0) - 事件处理
- `fflate` (^0.8.3) - 文件压缩/解压

**可选依赖（按需安装）**：
- `draco3d` (^1.5.7) - DRC格式支持（Draco压缩）

### 2.3 基本使用

```vue
<template>
  <div style="width: 800px; height: 600px;">
    <VtkViewer
      :source="modelSource"
      source-format="stl"
      theme="dark"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
/** 引入VtkViewer组件,必须 */
import { VtkViewer } from 'vtkviewer-vue'
/** 引入内置样式（必须），通过 exports 映射的 styles 子路径 */
import 'vtkviewer-vue/styles'

const modelSource = ref('/models/example.stl')
</script>
```

> **注意**：VtkViewer 组件内部自动管理生命周期的初始化和清理，无需手动调用任何初始化方法。

**参数说明**：
- 所有参数都是可选的
- `source`：虽然可选，但通常需要提供才能显示模型
- `sourceFormat`：可选,非文件输入时建议提供，有助于快速且正确地解析模型格式
- `theme`：可选，默认值为`'light'`

**事件监听**：

VtkViewer通过事件总线（Event Bus）发出事件，而非Vue自定义事件。

如果需要监听事件，可以使用 `v-model:ctx` 获取上下文：

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { VtkViewer, BuiltinEvents } from 'vtkviewer-vue'

const modelSource = ref('/models/example.stl')
const ctx = ref(null)

// 监听ctx变化，注册事件
watch(ctx, (newCtx) => {
  if (newCtx) {
    newCtx.events.on(BuiltinEvents.SCENE_LOADED, (data) => {
      console.log('模型加载成功', data)
    })
  }
})
</script>

<template>
  <VtkViewer v-model:ctx="ctx" :source="modelSource" />
</template>
```



### 2.4 模型输入

VtkViewer支持多种方式的模型输入，适应不同场景需求。

#### 2.4.1 通过props传递（推荐）

这是最简单直接的方式，适合大多数场景。

**支持的数据类型**：
- **URL字符串**：本地路径或网络URL
- **File对象**：从文件输入框、拖放等操作获取的文件对象
- **ArrayBuffer**：已加载的二进制数据
- **ReadableStream**：流式数据

**基本示例**：

```vue
<template>
  <div style="width: 800px; height: 600px;">
    <!-- 方式1：URL字符串 -->
    <VtkViewer
      :source="'/models/example.stl'"
      source-format="stl"
    />
    
    <!-- 方式2：响应式URL -->
    <VtkViewer
      :source="modelUrl"
      :source-format="format"
    />
    
    <!-- 方式3：File对象（从文件输入） -->
    <input type="file" @change="handleFileSelect" />
    <VtkViewer
      :source="selectedFile"
      :source-format="format"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { VtkViewer } from 'vtkviewer-vue'
import 'vtkviewer-vue/styles'

const modelUrl = ref('/models/example.stl')
const format = ref('stl')
const selectedFile = ref<File | null>(null)

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile.value = target.files[0]
    // 可选：从文件名自动检测格式
    const fileName = target.files[0].name
    const ext = fileName.split('.').pop()?.toLowerCase()
    format.value = ext || 'stl'
  }
}
</script>
```

#### 2.4.2 通过工具栏加载（使用内置toolbar插件LoadModelPlugin）

VtkViewer内置了`LoadModelPlugin`工具栏插件，用户可以通过点击工具栏上的"加载模型"按钮手动选择并加载模型文件。

**特点**：
- 无需编写代码，用户可自由选择文件
- 支持所有已注册格式插件的文件类型
- 自动检测文件格式

#### 2.4.3 通过拖拽加载（使用内置service插件DragDropPlugin）

VtkViewer内置了`DragDropPlugin`服务插件，用户可以直接将模型文件拖拽到查看器视口中来加载模型。

**特点**：
- 直观易用，符合用户习惯
- 支持拖拽多个文件（如果插件支持）
- 自动检测文件格式

**启用拖拽功能**：

拖拽功能默认启用，无需额外配置。如果需要禁用，可以在插件配置中排除`DragDropPlugin`：

```vue
<script setup lang="ts">
import { VtkViewer, type PluginsConfig } from 'vtkviewer-vue'

const plugins: PluginsConfig = {
  service: [
    // 不注册DragDropPlugin即可禁用拖拽功能
  ]
}
</script>

<template>
  <VtkViewer :plugins="plugins" />
</template>
```

#### 2.4.4 格式自动检测

当`source`为File对象或URL时，组件会自动从文件扩展名检测格式。对于ArrayBuffer或ReadableStream，建议显式指定`sourceFormat`。

```vue
<template>
  <VtkViewer
    :source="modelData"
    :source-format="format"  <!-- 对于非File/URL源，建议指定格式,不指定会通过文件名或魔数尝试获取 -->
    :source-filename="'model.stl'"  <!-- 可选：帮助格式检测 -->
  />
</template>
```

### 2.5 支持的格式

VtkViewer支持多种3D模型格式，通过相应的插件处理。

| 格式 | 扩展名 | 插件类 | 数据类型 | 说明 |
|------|---------|---------|----------|------|
| STL | `stl`, `stla`, `stlb` | `StlPlugin` | PolyData | 3D打印标准格式，支持ASCII和二进制 |
| OBJ | `obj` | `ObjPlugin` | PolyData | Wavefront OBJ格式，支持MTL材质 |
| PLY | `ply` | `PlyPlugin` | PolyData | Stanford PLY格式，支持颜色和纹理 |
| VTP | `vtp` | `VtpPlugin` | PolyData | VTK PolyData XML格式 |
| VTI | `vti` | `VtiPlugin` | ImageData | VTK ImageData XML格式（体渲染） |
| VTU | `vtu` | `VtuPlugin` | UnstructuredGrid | VTK UnstructuredGrid XML格式 |
| GLB | `glb` | `GlbPlugin` | PolyData | GL传输格式二进制版本（不支持gltf） |
| DRC | `drc` | `DrcPlugin` | PolyData | Draco压缩格式 **（需要Draco解码器）** |
| PDB | `pdb` | `PdbPlugin` | Molecule | 蛋白质数据银行格式 |
| ZIP | `zip`, `vtkjs`, `obz` | `ZipPlugin` | 聚合格式 | 自动识别内部格式（VTK.js ZIP、OBJ+MTL等） |

**DRC格式支持说明**：

DRC格式使用Draco压缩算法，需要Draco解码器才能解析。VtkViewer支持两种方式加载解码器：

**方式一：通过props配置decoder地址（推荐）**

```vue
<template>
  <VtkViewer
    :source="drcSource"
    :decoders="{
      draco: '/path/to/draco_decoder.js'
    }"
  />
</template>
```

将Draco解码器文件（`draco_decoder.js` 和 `draco_decoder.wasm`）放置到public目录下，然后通过decoders prop配置路径。

**方式二：安装draco3d包**

```bash
pnpm add draco3d
```

安装后，插件会尝试自动加载Draco解码器。

---

## 3. 核心概念

### 3.1 设计架构

VtkViewer采用模块化、插件化的架构设计，核心分为以下几层：

#### 3.1.1 架构分层

```
┌─────────────────────────────────────────────────┐
│           组件层 (Components)                   │
│  ├── VtkViewer.vue (主组件)                 │
│  ├── Toolbar (工具栏)                       │
│  └── UI组件 (信息面板、加载提示等)          │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           插件层 (Plugins)                    │
│  ├── 格式插件 (Format Plugins)              │
│  ├── 工具栏插件 (Toolbar Plugins)            │
│  ├── UI插件 (UI Plugins)                    │
│  └── 服务插件 (Service Plugins)             │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           核心层 (Core)                       │
│  ├── ViewerContext (统一上下文)              │
│  ├── RenderSubContext (渲染子上下文)         │
│  ├── SceneSubContext (场景子上下文)          │
│  ├── InteractionSubContext (交互子上下文)     │
│  ├── ThemeContext (主题上下文)                │
│  └── 其他子上下文...                        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         VTK.js 渲染引擎层                     │
│  ├── GenericRenderWindow (WebGL 2.0)        │
│  ├── vtkRenderer/vtkRenderWindow             │
│  └── vtkActor/vtkMapper/vtkVolume           │
└─────────────────────────────────────────────────┘
```

#### 3.1.2 核心设计理念

1. **插件化架构**：所有功能通过插件实现，易于扩展和定制
2. **v-model 响应式**：通过 `v-model:ctx` 获取内部上下文
3. **类型安全**：完整的TypeScript类型定义，提供优秀的开发体验
4. **主题系统**：内置多套主题，支持自定义主题
5. **国际化**：内置中英文语言包，支持自定义翻译函数

### 3.2 ctx 与事件监听

VtkViewer 组件**始终由内部创建 `ViewerContext`**，生命周期由组件自动管理。外部通过 `v-model:ctx` 获取内部上下文。

#### 3.2.1 基本用法

组件挂载自动创建 ctx，卸载自动清理，无需手动管理：

```vue
<template>
  <VtkViewer
    :source="modelSource"
    background="#1a1a1a"
    theme="dark"
  />
</template>
```

#### 3.2.2 通过 v-model:ctx 获取上下文

需要监听事件或编程式控制时，使用 `v-model:ctx`：

```vue
<template>
  <VtkViewer v-model:ctx="ctx" :source="modelSource" />
</template>

<script setup>
import { ref, watch } from 'vue'
import { VtkViewer, BuiltinEvents } from 'vtkviewer-vue'

const ctx = ref(null)

watch(ctx, (newCtx) => {
  if (newCtx) {
    // 监听事件
    newCtx.events.on(BuiltinEvents.SCENE_LOADED, (data) => {
      console.log('模型加载成功', data)
    })
  }
})
</script>
```

---

## 4. API参考

### 4.1 VtkViewer Props详解

```typescript
interface VtkViewerProps {
  // ========== 核心配置 ==========
  
  /** 默认背景色（响应式，支持外部动态修改）
   * @default '#e6e6e6'
   */
  background?: string
  
  // ========== 数据源配置 ==========
  
  /** 
   * 数据源（File/URL/ArrayBuffer/ReadableStream）
   * 设置后组件内部自动加载
   */
  source?: VtkViewerSource | null
  
  /** 
   * 数据源格式（可选，但建议提供）
   * 当source为File或URL时，可以从文件扩展名自动检测
   * 当source为ArrayBuffer或ReadableStream时，建议提供此参数
   * 如果不提供，内部会尝试使用魔数（magic number）进行格式探测
   */
  sourceFormat?: string
  
  /** 数据源文件名（当source为ArrayBuffer或ReadableStream时可选，用于格式检测） */
  sourceFilename?: string
  
  // ========== UI配置 ==========
  
  /** 工具栏配置，false则隐藏工具栏 */
  toolbar?: ToolbarConfig | boolean
  
  /** 信息面板配置，false则隐藏信息面板 */
  infoPanel?: InfoPanelConfig | boolean
  
  /** 传递到 PluginToolbar 的自定义 CSS class */
  toolbarClass?: string | string[]
  
  /** 传递到 ToolbarInfoPanel 的自定义 CSS class */
  toolbarInfoPanelClass?: string | string[]
  
  /** 传递到 ToolbarExtension 的自定义 CSS class */
  toolbarExtensionClass?: string | string[]
  
  /** UI插件配置 */
  ui?: UIConfig
  
  // ========== 插件配置 ==========
  
  /**
   * 插件配置（高优先级）
   * 采用分类配置格式，按插件类型分组：
   *   - format:  格式插件
   *   - toolbar: 工具栏插件
   *   - ui:      UI插件
   *   - service: 服务插件
   *
   * 传入后覆盖默认插件配置。
   */
  plugins?: PluginsConfig
  
  // ========== 主题与国际化 ==========
  
  /** 主题ID（如 'dark', 'light', 'ocean', 'forest', 'sunset'）
   * @default 'light'
   */
  theme?: string
  
  /** 自定义主题配置（格式与内置主题一致，同名覆盖内置主题） */
  customThemes?: Record<string, ThemeConfig>
  
  /**
   * 国际化翻译函数（外部注入）。
   * 不传时所有字符串原样使用key作为fallback。
   * key格式：`vtkviewer.模块.子键`（如 `vtkviewer.toolbar.rotate.title`）
   */
  t?: I18nTranslateFunction | null
  
  /**
   * 当前语言标识（如 'zh', 'en'）。
   * 变更时触发renderCache清理和组件重渲染。
   * @default 'zh'
   */
  locale?: string
  
  /**
   * 可用语言列表。
   * 传递给LanguageSwitchPlugin，未传时默认 [{ id:'zh', label:'中文' }, { id:'en', label:'English' }]。
   */
  languages?: LanguageOption[]
  
  // ========== 解码器配置 ==========
  
  /**
   * 外部解码器路径配置。
   * 键为解码器标识，值为JS文件路径（本地public/路径或CDN URL）。
   * 支持的标识：
   *   - draco: Draco解码器，对应draco_decoder.js
   *   - ifc:   IFC解码器（预留），对应web-ifc.js
   * 未配置时插件会尝试动态import对应的npm包。
   */
  decoders?: Record<string, string>
  
  // ========== 交互配置 ==========
  
  /**
   * 是否启用手势控制（触摸/捏合/旋转等触屏交互）。
   * 设置为 false 时，即使硬件支持触屏，手势交互也不会启用。
   * @default true
   */
  enableGesture?: boolean
  
  /**
   * 是否启用键盘控制（相机 WASD 导航和所有插件快捷键）。
   * 设置为 false 时，所有键盘快捷键失效且不在 tooltip 中显示。
   * @default true
   */
  enableKeyboard?: boolean
  
  // ========== 调试选项 ==========
  
  /**
   * 是否启用调试日志输出。
   * 开启后会在控制台输出插件初始化、过程追踪等调试信息。
   * 默认false，生产环境建议保持关闭。
   * @default false
   */
  debug?: boolean
}
```

### 4.2 插件配置：PluginsConfig

```typescript
import type { PluginItem, FormatPluginItem } from 'vtkviewer-vue/plugins'

interface PluginsConfig {
  /** 格式插件：负责解析不同3D模型格式 */
  format?: FormatPluginItem[]
  
  /** 工具栏插件：在工具栏中显示的各种工具按钮 */
  toolbar?: PluginItem[]
  
  /** UI插件：覆盖层、信息面板等UI组件 */
  ui?: PluginItem[]
  
  /** 服务插件：提供后台服务能力（如拖拽加载、快捷键绑定） */
  service?: PluginItem[]
}
```

**类型说明**：

- `PluginItem<T>`: 插件配置项，支持两种格式：
  - 简化格式：`PluginIdentifier` （使用默认配置）
  - 完整格式：`[PluginIdentifier, T?]` 元组（自定义配置）
  
- `FormatPluginItem<T>`: 格式插件配置项，结构与 `PluginItem` 相同

**使用示例**：

```typescript
import { PluginsConfig } from 'vtkviewer-vue'
import { StlPlugin, ObjPlugin, RotatePlugin, ZoomPlugin } from 'vtkviewer-vue/plugins'

const plugins: PluginsConfig = {
  format: [
    StlPlugin,                      // 简化格式
    [ObjPlugin, { option1: true }] // 完整格式（带配置）
  ],
  toolbar: [
    RotatePlugin,
    [ZoomPlugin, { group: 'control' }] // 带配置的插件
  ]
}
```

---

## 5. 插件系统

### 5.1 插件机制与配置方法

#### 5.1.1 插件系统架构

VtkViewer的插件系统基于以下核心概念：

1. **PluginBase**：所有插件的基类，提供统一的生命周期和工具方法
2. **ViewerContext**：插件通过`init(ctx)`方法接收的上下文对象，用于访问查看器能力
3. **插件元数据**：每个插件必须定义`metadata`属性（id、name、description等）
4. **插件配置**：支持通过`defaultConfig`定义默认配置，通过`init(ctx, config)`接收外部配置

#### 5.1.2 默认插件配置

VtkViewer内置了丰富的默认插件，无需配置即可使用：

```typescript
// 格式插件（format）
const DEFAULT_FORMAT_PLUGINS = [
  StlPlugin,      // STL格式
  ObjPlugin,      // OBJ格式
  PlyPlugin,      // PLY格式
  VtpPlugin,      // VTP格式
  VtuPlugin,      // VTU格式
  VtiPlugin,      // VTI格式
  PdbPlugin,      // PDB格式
  ZipPlugin,      // ZIP聚合格式
  DrcPlugin       // DRC格式（需要Draco解码器）
]

// 工具栏插件（toolbar）- 部分示例
const DEFAULT_TOOLBAR_PLUGINS = [
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
  ] 

// UI插件（ui）
const DEFAULT_UI_PLUGINS = [
  LoadingPlugin,     // 加载进度
  ErrorPlugin,       // 错误提示
  FilenameInfoPlugin, // 文件名信息
  SceneTreePlugin    // 场景树
]

// 服务插件（service）
const DEFAULT_SERVICE_PLUGINS = [
  DragDropPlugin,   // 拖拽加载
  KeyBindingPlugin  // 快捷键绑定
]
```

#### 5.1.3 自定义插件配置

可以通过`plugins`prop覆盖默认插件配置：

```vue
<template>
  <VtkViewer
    :plugins="customPlugins"
    :toolbar="false"  <!-- 隐藏工具栏 -->
    :info-panel="false"  <!-- 隐藏信息面板 -->
  />
</template>

<script setup lang="ts">
import { PluginsConfig } from 'vtkviewer-vue'

// 自定义插件配置：只保留加载、旋转、缩放、平移
const customPlugins: PluginsConfig = {
  format: [
    StlPlugin,                      // 简化格式
    [ObjPlugin, { option1: true }] // 完整格式（带配置）
  ],
  toolbar: [
    LoadModelPlugin,
    [RotatePlugin, { group: 'control' }], // 带配置的插件
    ZoomPlugin,
    PanPlugin
  ],
  ui: [LoadingPlugin, ErrorPlugin],  // 只保留加载和错误提示
  service: [DragDropPlugin]  // 只保留拖拽加载
}
</script>
```

### 5.2 插件开发指南

#### 5.2.1 插件基类能力

插件基类`PluginBase`提供了以下核心能力：

```typescript
abstract class PluginBase<TConfig extends PluginConfig = PluginConfig> {
  // ========== 生命周期 ==========
  
  /** 初始化插件（由插件系统调用） */
  init(ctx: ViewerContext, config?: TConfig): void
  
  /** 子类重写此方法进行初始化（在config合并完成后调用） */
  protected onInit(): void
  
  /** 释放插件资源（由插件系统调用） */
  dispose(): void
  
  /** 子类扩展清理钩子（用于释放VTK对象、注销命令等） */
  protected onDispose(): void
  
  // ========== 可见性控制 ==========
  
  /** 插件是否可见（子类可重写） */
  isVisible(): boolean
  
  // ========== 事件管理 ==========
  
  /** 注册事件并自动追踪（推荐替代直接调用ctx.events.on） */
  protected onEvent(event: string, callback: (...args: any[]) => void): void
  
  // ========== InfoPanel注册 ==========
  
  /** 注册信息面板项（dispose时自动注销） */
  protected registerInfoPanelItem(item: Omit<ToolbarInfoItem, 'id'> & { id?: string }): void
  
  // ========== 扩展区注册 ==========
  
  /** 注册扩展区项（dispose时自动注销） */
  protected registerExtensionItem(item: Omit<ToolbarExtensionItem, 'id'> & { id?: string }): void
  
  // ========== 命令注册 ==========
  
  /** 注册命令并自动追踪（dispose时自动注销） */
  protected registerCommand<T = void>(id: string, handler: CommandHandler<T>): void
  
  // ========== 配置访问 ==========
  
  /** 获取配置值 */
  protected getConfig<K extends keyof TConfig>(key: K): TConfig[K]
  
  /** 获取完整配置（浅拷贝） */
  protected getConfigAll(): TConfig
  
  // ========== 调试日志 ==========
  
  /** 调试日志：仅当debug=true时输出console.log */
  protected debugLog(...args: any[]): void
}
```

#### 5.2.2 扩展新格式插件

创建自定义格式插件示例：

```typescript
// MyFormatPlugin.ts
import {
  PluginBase, PluginType,
  type IFormatPlugin, type FormatParseResult, type PluginConfig
} from 'vtkviewer-vue'

export interface MyFormatPluginConfig extends PluginConfig {
  // 自定义配置项（可选）
  enabled?: boolean
}

export class MyFormatPlugin extends PluginBase<MyFormatPluginConfig> implements IFormatPlugin {
  // 插件元数据
  readonly metadata = {
    id: 'my-format',
    name: 'MyFormatPlugin',
    type: PluginType.FORMAT,
    description: '我的自定义格式插件'
  }
  
  // 支持的文件扩展名
  readonly formats = ['myfmt', 'myf']
  
  // 优先级（数字越小优先级越高）
  readonly priority = 10
  
  // 默认配置
  readonly defaultConfig: MyFormatPluginConfig = { enabled: true }
  
  // ========== IFormatPlugin接口实现 ==========
  
  /** 检查是否支持该格式 */
  canHandle(format: string): boolean {
    return this.formats.includes(format.toLowerCase())
  }
  
  /** 解析文件数据 */
  async parse(
    arrayBuffer: ArrayBuffer,
    format: string,
    options?: Record<string, any>
  ): Promise<FormatParseResult> {
    // 检测文件格式（可选）
    if (!this.detect(arrayBuffer)) {
      throw new Error(`不支持的文件格式: ${format}`)
    }
    
    // 解析格式数据，返回VTK.js数据对象
    const data = // ... 解析逻辑
    
    return {
      actors: [actor],  // vtkActor实例数组
      data: polyData,    // VTK数据对象
      metadata: {         // 可选的元数据
        format: format,
        vertices: polyData.getNumberOfPoints()
      }
    }
  }
  
  /** 释放资源 */
  dispose(): void {
    // 清理资源
  }
  
  // ========== 自定义方法 ==========
  
  /** 检测文件头部信息（可选） */
  private detect(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer, 0, 4)
    return header[0] === 0x4D && header[1] === 0x46  // 'MF'
  }
}
```

然后在VtkViewer配置中使用：

```vue
<script setup lang="ts">
import { MyFormatPlugin } from './MyFormatPlugin'
</script>

<template>
  <VtkViewer :plugins="{
    format: [
      // ...其他格式插件
      MyFormatPlugin  // 添加自定义格式插件
    ]
  }" />
</template>
```

#### 5.2.3 自定义工具栏插件

创建自定义工具栏插件示例：

```typescript
// MyCustomPlugin.ts
import { PluginBase, IToolbarPlugin, PluginMetadata } from 'vtkviewer-vue'

export interface MyCustomPluginConfig extends PluginConfig {
  /** 自定义配置项 */
  customOption?: string
  hideWhenNoModel?: boolean
}

export class MyCustomPlugin extends PluginBase<MyCustomPluginConfig> implements IToolbarPlugin {
  // 插件元数据
  readonly metadata: PluginMetadata = {
    id: 'my-custom-plugin',
    name: 'My Custom Plugin',
    description: '我的自定义插件',
    order: 100  // 在工具栏中的排序优先级
  }
  
  // 默认配置
  readonly defaultConfig: MyCustomPluginConfig = {
    customOption: 'default',
    hideWhenNoModel: false
  }
  
  // ========== IToolbarPlugin接口实现 ==========
  
  /** 渲染工具栏按钮 */
  renderButton(): VNode {
    return h('button', {
      onClick: () => this.onButtonClick(),
      class: 'iimm-vtk-toolbar-item'
    }, 'My Plugin')
  }
  
  /** 插件是否可见 */
  isVisible(): boolean {
    // 如果配置了hideWhenNoModel且无模型，则隐藏
    if (this.config.hideWhenNoModel && this.ctx.scene.modelCount.value === 0) {
      return false
    }
    return true
  }
  
  // ========== 自定义方法 ==========
  
  private onButtonClick() {
    // 使用ctx访问查看器能力
    const renderer = this.ctx.render.getRenderer()
    // ... 执行自定义逻辑
    
    // 使用调试日志
    this.debugLog('MyCustomPlugin: button clicked')
  }
  
  // ========== 生命周期 ==========
  
  protected onInit(): void {
    // 插件初始化逻辑
    this.debugLog('MyCustomPlugin: initialized with config', this.config)
    
    // 注册事件监听
    this.onEvent('scene:loaded', () => {
      this.debugLog('MyCustomPlugin: scene loaded')
    })
    
    // 注册信息面板项
    this.registerInfoPanelItem({
      render: () => h('div', 'Custom info')
    })
  }
  
  protected onDispose(): void {
    // 自定义清理逻辑
    this.debugLog('MyCustomPlugin: disposed')
  }
}
```

使用自定义插件：

```vue
<template>
  <VtkViewer
    :plugins="{
      toolbar: [
        // ...其他插件
        [MyCustomPlugin, { customOption: 'my value' }]
      ]
    }"
  />
</template>

<script setup lang="ts">
import { MyCustomPlugin } from './MyCustomPlugin'
</script>
```

---

## 6. 国际化与语言切换

VtkViewer 内置了完整的国际化（i18n）支持，支持中英文切换，并允许注入自定义翻译函数或使用自定义语言包。

### 6.1 内置语言

VtkViewer 默认内置两套语言包：

| 语言ID | 语言名称 | 说明 |
|---------|----------|------|
| `zh` | 中文 | 默认语言 |
| `en` | English | 英文 |

### 6.2 基本用法

#### 6.2.1 通过 props 配置语言

```vue
<template>
  <!-- 设置当前语言 -->
  <VtkViewer locale="en" />

  <!-- 自定义可用语言列表 -->
  <VtkViewer
    locale="zh"
    :languages="[
      { id: 'zh', label: '简体中文' },
      { id: 'en', label: 'English' },
      { id: 'ja', label: '日本語' }
    ]"
  />
</template>
```

#### 6.2.2 通过工具栏切换语言

默认工具栏中包含 `LanguageSwitchPlugin`，点击工具栏中的语言切换按钮可以在下拉菜单中选择语言。

如果要禁用语言切换插件：

```vue
<template>
  <VtkViewer
    :plugins="{
      toolbar: [
        // 排除语言切换插件
        ...defaultPlugins.filter(p => p[0].metadata.id !== 'languageSwitch')
      ]
    }"
  />
</template>
```

### 6.3 注入自定义翻译函数

如果你使用 Vue I18n 或其他国际化库，可以通过 `t` prop 注入翻译函数：

```vue
<template>
  <VtkViewer :t="myTranslateFunction" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 包装 vue-i18n 的 t 函数以兼容 VtkViewer 的签名
function myTranslateFunction(key: string): string {
  return t(key) || key
}
</script>
```

**翻译函数签名**：

```typescript
type I18nTranslateFunction = (key: string) => string
```

**翻译优先级链**：

1. 外部注入的 `t(key)` — 如果函数返回的结果不等于 `key`，则使用
2. 当前 locale 的内置语言包 — key 存在时返回
3. 默认 locale（`zh`）的内置语言包 — key 存在时返回
4. key 自身 — 作为最终 fallback

### 6.4 注册自定义语言包

如果你需要添加自定义语言包（如日语、法语等），可以通过 `I18nManager` 注册：

```typescript
// 从包中导入 i18n 单例
import { i18n } from 'vtkviewer-vue'

// 注册日语语言包
i18n.registerLocale('ja', {
  'vtkviewer.toolbar.rotate.title': '回転',
  'vtkviewer.toolbar.zoom.title': 'ズーム',
  // ... 其他翻译 key
})

// 设置可用语言列表（包含日语）
i18n.setLanguageOptions([
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' }
])
```

### 6.5 翻译 Key 命名规范

VtkViewer 的翻译 key 遵循以下命名规范：

```
vtkviewer.模块.子键
```

**常用 key 示例**：

| Key | 中文 | English |
|-----|------|---------|
| `vtkviewer.toolbar.rotate.title` | 旋转 | Rotate |
| `vtkviewer.toolbar.zoom.title` | 缩放 | Zoom |
| `vtkviewer.toolbar.loadModel.title` | 加载模型 | Load Model |
| `vtkviewer.toolbar.screenshot.title` | 截图 | Screenshot |
| `vtkviewer.source.formatNotDetected` | 无法识别文件格式，请提供 sourceFormat | Unable to detect file format, please provide sourceFormat |
| `vtkviewer.plugin.stl.description` | STL格式处理器（支持ASCII和二进制） | STL format processor (supports ASCII and binary) |

你可以在 `src/configs/locales/` 目录中查看完整的内置语言包。

### 6.6 在自定义插件中使用国际化

在自定义工具栏插件中，可以通过 `i18n` 单例或 `ctx.i18n` 进行翻译：

**方式一：命令式翻译（适用于工具函数、日志等）**

```typescript
// 从包中导入 i18n 单例
import { i18n } from 'vtkviewer-vue'

// 简单翻译
const text = i18n.translate('vtkviewer.toolbar.myPlugin.title')

// 在 render 函数中使用
render(): Component {
  return defineComponent({
    setup() {
      const title = i18n.translate('vtkviewer.toolbar.myPlugin.title')
      return () => h('div', title)
    }
  })
}
```

**方式二：响应式翻译（适用于 Vue render 函数）**

```typescript
// 从包中导入 i18n 单例
import { i18n } from 'vtkviewer-vue'

render(): Component {
  return defineComponent({
    setup() {
      // 使用 i18n.t() 返回 ComputedRef，locale 变化时自动更新
      const title = i18n.t('vtkviewer.toolbar.myPlugin.title')

      return () => h('button', title.value)
    }
  })
}
```

### 6.7 命令式切换语言

除了通过 UI 下拉菜单切换语言，还可以在代码中命令式切换：

```typescript
// 从包中导入 i18n 单例
import { i18n } from 'vtkviewer-vue'

// 切换到英文
i18n.setLocale('en')

// 获取当前语言
const current = i18n.currentLocale.value

// 重置到默认语言
i18n.resetLocale()

// 监听语言变化
const unregister = i18n.onLocaleChanged((locale) => {
  console.log('语言已切换到:', locale)
})
```

---

## 7. 主题与样式

### 7.1 主题系统

#### 7.1.1 内置主题

VtkViewer内置了5套主题，可以通过props或工具栏动态切换：

| 主题ID | 主题名称 | 类型 | 说明 |
|---------|----------|------|------|
| `light` | 浅色主题 | 亮色 | 默认主题，适合大多数场景 |
| `dark` | 深色主题 | 暗色 | 适合暗光环境 |
| `ocean` | 海洋主题 | 暗色 | 蓝色调，适合海洋数据可视化 |
| `forest` | 森林主题 | 暗色 | 绿色调，适合地形数据可视化 |
| `sunset` | 日落主题 | 暗色 | 橙色调，适合暖色场景 |

#### 7.1.2 主题配置结构

```typescript
interface ThemeConfig {
  /** 主题唯一标识 */
  id: string
  
  /** 主题显示名称 */
  name: string
  
  /** 是否为暗色主题 */
  isDark: boolean
  
  /** 主题颜色配置 */
  colors: {
    toolbarBg: string              // 工具栏背景色
    toolbarBorder: string          // 工具栏边框色
    btnBg: string                // 按钮背景色
    btnBgHover: string           // 按钮悬停背景色
    btnBgActive: string          // 按钮激活背景色
    btnColor: string             // 按钮文字颜色
    btnColorHover: string        // 按钮悬停文字颜色
    btnColorActive: string       // 按钮激活文字颜色
    separatorColor: string       // 分隔线颜色
    popupBg: string             // 弹出层背景色
    popupBorder: string         // 弹出层边框色
    popupColor: string          // 弹出层文字颜色
    popupLabelColor: string     // 弹出层标签颜色
    inputBg: string            // 输入框背景色
    inputBorder: string         // 输入框边框色
    inputColor: string          // 输入框文字颜色
    loadingBg: string          // 加载背景色
    loadingCardBg: string       // 加载卡片背景色
    loadingText: string         // 加载文字颜色
    loadingTextSecondary: string // 加载次要文字颜色
    infoPanelBg: string        // 信息面板背景色
    infoPanelLabel: string      // 信息面板标签颜色
    infoPanelValue: string      // 信息面板值颜色
    errorBg: string            // 错误背景色
    errorBorder: string        // 错误边框色
    errorColor: string          // 错误文字颜色
    extensionBg: string        // 扩展区背景色
    extensionSeparatorColor: string // 扩展区分隔线颜色
  }
}
```

#### 7.1.3 自定义主题

**方式一：通过`customThemes`prop注入**

```vue
<template>
  <VtkViewer
    theme="my-custom-theme"
    :custom-themes="{
      'my-custom-theme': {
        id: 'my-custom-theme',
        name: '我的自定义主题',
        isDark: true,
        colors: {
          toolbarBg: 'rgba(30, 30, 50, 0.9)',
          // ... 其他颜色配置
        }
      }
    }"
  />
</template>
```

**方式二：通过`ctx.theme`动态注册**

```typescript
// 获取ViewerContext后
ctx.theme.registerTheme('my-theme', {
  id: 'my-theme',
  name: 'My Theme',
  isDark: true,
  colors: {
    // ... 颜色配置
  }
})

// 切换主题
ctx.theme.setTheme('my-theme')
```

#### 7.1.4 动态切换主题

```vue
<template>
  <div>
    <VtkViewer :theme="currentTheme" />
    <select v-model="currentTheme">
      <option value="dark">深色主题</option>
      <option value="light">浅色主题</option>
      <option value="ocean">海洋主题</option>
      <option value="forest">森林主题</option>
      <option value="sunset">日落主题</option>
      <option value="custom">自定义主题</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const currentTheme = ref('dark')
</script>
```

### 7.2 样式系统设计与CSS变量覆盖

VtkViewer使用CSS变量（自定义属性）实现主题系统，所有样式都基于这些变量。你可以通过覆盖这些CSS变量来自定义组件外观。

#### 7.2.1 CSS变量命名规范

所有CSS变量都使用 `--iimm-vtk-` 前缀，遵循以下命名规范：

```
--iimm-vtk-{组件}-{属性}
```

例如：
- `--iimm-vtk-toolbar-bg` - 工具栏背景色
- `--iimm-vtk-btn-color` - 按钮文字颜色
- `--iimm-vtk-popup-bg` - 弹出框背景色

#### 7.2.2 完整的CSS变量列表

VtkViewer使用了一套完整的语义化CSS变量系统，包含**语义化设计令牌**和**组件样式变量**两大类。

> **提示**：你可以在 `src/styles/_variables.scss` 文件中查看所有CSS变量的默认值。

**语义化设计令牌**

这些变量定义了设计系统的基础规则，被各个组件变量引用。

<details>
<summary>点击展开：语义化排版变量（12个）</summary>

```css
/* 字体大小 */
--iimm-vtk-text-xs: 9px;           /* 徽章、极小标签 */
--iimm-vtk-text-sm: 11px;          /* 辅助文本、label、次要信息 */
--iimm-vtk-text-base: 12px;        /* 正文、选项文字、按钮文字 */
--iimm-vtk-text-lg: 13px;          /* 标题、面板标题 */
--iimm-vtk-text-xl: 16px;         /* 弹窗主标题 */
--iimm-vtk-text-xxs: 10px;        /* 微型文字（色条值等） */

/* 字体粗细 */
--iimm-vtk-font-normal: 400;
--iimm-vtk-font-medium: 500;
--iimm-vtk-font-semibold: 600;
--iimm-vtk-font-bold: 700;

/* 行高 */
--iimm-vtk-leading-tight: 1.2;
--iimm-vtk-leading-normal: 1.4;
--iimm-vtk-leading-relaxed: 1.6;

/* 字间距 */
--iimm-vtk-tracking-normal: 0;
--iimm-vtk-tracking-tight: 0.3px;
--iimm-vtk-tracking-wide: 0.5px;

/* 字体族 */
--iimm-vtk-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--iimm-vtk-font-mono: 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
```
</details>

<details>
<summary>点击展开：语义化间距与圆角变量（9个）</summary>

```css
/* 间距 */
--iimm-vtk-spacing-xs: 4px;
--iimm-vtk-spacing-sm: 6px;
--iimm-vtk-spacing-base: 8px;
--iimm-vtk-spacing-lg: 12px;
--iimm-vtk-spacing-xl: 16px;

/* 圆角 */
--iimm-vtk-radius-sm: 4px;
--iimm-vtk-radius-base: 6px;
--iimm-vtk-radius-lg: 8px;
--iimm-vtk-radius-xl: 10px;
--iimm-vtk-radius-full: 50%;
```
</details>

<details>
<summary>点击展开：语义化颜色变量（22个）</summary>

```css
/* 文字颜色 */
--iimm-vtk-color-text-primary: #e0e0e0;
--iimm-vtk-color-text-secondary: rgba(255, 255, 255, 0.6);
--iimm-vtk-color-text-disabled: rgba(255, 255, 255, 0.35);
--iimm-vtk-color-text-inverse: #1a1a2e;
--iimm-vtk-color-text-accent: #64ffda;

/* 背景颜色 */
--iimm-vtk-color-surface: #2a2a3e;
--iimm-vtk-color-surface-raised: #1e1e30;
--iimm-vtk-color-overlay: rgba(0, 0, 0, 0.55);

/* 边框颜色 */
--iimm-vtk-color-border: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-border-light: rgba(255, 255, 255, 0.08);

/* 交互颜色 */
--iimm-vtk-color-interactive-hover: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-interactive-active: rgba(100, 255, 218, 0.18);

/* 强调色 */
--iimm-vtk-color-accent: #64ffda;
--iimm-vtk-color-accent-muted: rgba(100, 255, 218, 0.25);

/* 输入框颜色 */
--iimm-vtk-color-input-bg: rgba(0, 0, 0, 0.25);
--iimm-vtk-color-input-border: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-input-focus: #64ffda;

/* 滑块颜色 */
--iimm-vtk-color-slider-track: rgba(255, 255, 255, 0.1);
--iimm-vtk-color-slider-thumb: #64ffda;

/* 状态颜色 */
--iimm-vtk-color-info: #60a5fa;
--iimm-vtk-color-success: #4ade80;
--iimm-vtk-color-error: #ef4444;
--iimm-vtk-color-error-text: #fca5a5;
--iimm-vtk-color-warning: #f59e0b;

/* 切换开关颜色 */
--iimm-vtk-color-toggle-off: rgba(255, 255, 255, 0.15);
--iimm-vtk-color-toggle-on: #64ffda;
--iimm-vtk-color-toggle-knob: #ffffff;

/* 分隔线颜色 */
--iimm-vtk-color-divider: rgba(255, 255, 255, 0.12);
```
</details>

**组件样式变量**

这些变量直接控制各个组件的样式。

<details>
<summary>点击展开：查看器尺寸变量（3个）</summary>

```css
--iimm-vtk-width: 100%;
--iimm-vtk-height: 100%;
--iimm-vtk-min-width: 0;
```
</details>

<details>
<summary>点击展开：工具栏变量（6个）</summary>

```css
--iimm-vtk-toolbar-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-toolbar-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-toolbar-padding: var(--iimm-vtk-spacing-base);
--iimm-vtk-toolbar-gap: var(--iimm-vtk-spacing-xs);
--iimm-vtk-toolbar-border-color: var(--iimm-vtk-color-border);
--iimm-vtk-toolbar-backdrop-blur: 8px;
```
</details>

<details>
<summary>点击展开：工具栏按钮变量（11个）</summary>

```css
--iimm-vtk-btn-size: 32px;
--iimm-vtk-btn-bg: rgba(255, 255, 255, 0.06);
--iimm-vtk-btn-bg-hover: var(--iimm-vtk-color-interactive-hover);
--iimm-vtk-btn-bg-active: var(--iimm-vtk-color-interactive-active);
--iimm-vtk-btn-radius: var(--iimm-vtk-radius-base);
--iimm-vtk-btn-border-color: transparent;
--iimm-vtk-btn-border-color-hover: rgba(255, 255, 255, 0.2);
--iimm-vtk-btn-color: var(--iimm-vtk-color-text-primary);
--iimm-vtk-btn-color-hover: #ffffff;
--iimm-vtk-btn-color-active: var(--iimm-vtk-color-accent);
--iimm-vtk-btn-transition: all 0.2s ease;
```
</details>

<details>
<summary>点击展开：工具栏图标变量（1个）</summary>

```css
--iimm-vtk-icon-size: 20px;
```
</details>

<details>
<summary>点击展开：工具栏分隔线变量（4个）</summary>

```css
--iimm-vtk-toolbar-separator-color: rgba(255, 255, 255, 0.2);
--iimm-vtk-toolbar-separator-size: 1px;
--iimm-vtk-toolbar-separator-height: 20px;
--iimm-vtk-toolbar-separator-margin: 0 4px;
```
</details>

<details>
<summary>点击展开：扩展区变量（8个）</summary>

```css
--iimm-vtk-extension-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-extension-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-extension-padding: var(--iimm-vtk-spacing-xs) var(--iimm-vtk-spacing-base);
--iimm-vtk-extension-gap: 2px;
--iimm-vtk-extension-min-height: 28px;
--iimm-vtk-extension-separator-color: rgba(255, 255, 255, 0.2);
--iimm-vtk-extension-separator-height: 16px;
--iimm-vtk-extension-separator-margin: 0 4px;
--iimm-vtk-extension-font-size: var(--iimm-vtk-text-sm);
--iimm-vtk-extension-btn-size: 28px;
--iimm-vtk-extension-icon-size: 16px;
```
</details>

<details>
<summary>点击展开：信息面板变量（7个）</summary>

```css
--iimm-vtk-info-panel-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-info-panel-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-info-panel-padding: var(--iimm-vtk-spacing-xs) var(--iimm-vtk-spacing-base);
--iimm-vtk-info-panel-font-size: var(--iimm-vtk-text-base);
--iimm-vtk-info-panel-max-height: 120px;
--iimm-vtk-info-panel-gap-x: var(--iimm-vtk-spacing-lg);
--iimm-vtk-info-panel-gap-y: var(--iimm-vtk-spacing-xs);
--iimm-vtk-info-panel-label-color: var(--iimm-vtk-color-text-secondary);
--iimm-vtk-info-panel-value-color: rgba(255, 255, 255, 0.9);
```
</details>

<details>
<summary>点击展开：弹出框变量（9个）</summary>

```css
--iimm-vtk-popup-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-popup-bg-secondary: var(--iimm-vtk-color-surface-raised);
--iimm-vtk-popup-border-color: var(--iimm-vtk-color-border);
--iimm-vtk-popup-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-popup-padding: var(--iimm-vtk-spacing-xl);
--iimm-vtk-popup-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
--iimm-vtk-popup-font-size: var(--iimm-vtk-text-base);
--iimm-vtk-popup-color: var(--iimm-vtk-color-text-primary);
--iimm-vtk-popup-label-color: var(--iimm-vtk-color-text-secondary);
```
</details>

<details>
<summary>点击展开：输入框变量（7个）</summary>

```css
--iimm-vtk-input-bg: var(--iimm-vtk-color-input-bg);
--iimm-vtk-input-border-color: var(--iimm-vtk-color-input-border);
--iimm-vtk-input-border-color-focus: var(--iimm-vtk-color-input-focus);
--iimm-vtk-input-radius: var(--iimm-vtk-radius-sm);
--iimm-vtk-input-padding: var(--iimm-vtk-spacing-xs) var(--iimm-vtk-spacing-base);
--iimm-vtk-input-font-size: var(--iimm-vtk-text-base);
--iimm-vtk-input-color: var(--iimm-vtk-color-text-primary);
```
</details>

<details>
<summary>点击展开：滑块变量（3个）</summary>

```css
--iimm-vtk-slider-track-bg: var(--iimm-vtk-color-slider-track);
--iimm-vtk-slider-thumb-bg: var(--iimm-vtk-color-slider-thumb);
--iimm-vtk-slider-thumb-size: 12px;
```
</details>

<details>
<summary>点击展开：过渡动画变量（3个）</summary>

```css
--iimm-vtk-transition-fast: 0.15s ease;
--iimm-vtk-transition-normal: 0.25s ease;
--iimm-vtk-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
```
</details>

<details>
<summary>点击展开：Z-index层级变量（7个）</summary>

```css
--iimm-vtk-z-panel: 50;
--iimm-vtk-z-toolbar: 100;
--iimm-vtk-z-toolbar-extra: 110;
--iimm-vtk-z-overlay: 500;
--iimm-vtk-z-popup: 1000;
--iimm-vtk-z-notification: 5000;
--iimm-vtk-z-max: 9999;
```
</details>

<details>
<summary>点击展开：加载提示变量（15个）</summary>

```css
--iimm-vtk-loading-bg: var(--iimm-vtk-color-overlay);
--iimm-vtk-loading-card-bg: rgba(255, 255, 255, 0.07);
--iimm-vtk-loading-card-border-color: rgba(255, 255, 255, 0.1);
--iimm-vtk-loading-card-radius: 20px;
--iimm-vtk-loading-card-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
--iimm-vtk-loading-card-padding: 32px 40px 28px;
--iimm-vtk-loading-card-gap: var(--iimm-vtk-spacing-xl);
--iimm-vtk-loading-ring-size: 88px;
--iimm-vtk-loading-spinner-size: 18px;
--iimm-vtk-loading-bar-width: 160px;
--iimm-vtk-loading-bar-height: 3px;
--iimm-vtk-loading-info-font-size: var(--iimm-vtk-text-sm);
--iimm-vtk-loading-stage-font-size: var(--iimm-vtk-text-lg);
--iimm-vtk-loading-text-color: rgba(255, 255, 255, 0.92);
--iimm-vtk-loading-text-secondary: rgba(255, 255, 255, 0.75);
--iimm-vtk-loading-progress-gradient: linear-gradient(90deg, #60a5fa, #34d399);
```
</details>

<details>
<summary>点击展开：错误提示变量（11个）</summary>

```css
--iimm-vtk-error-bg: rgba(220, 38, 38, 0.15);
--iimm-vtk-error-border-color: rgba(220, 38, 38, 0.3);
--iimm-vtk-error-overlay-bg: rgba(0, 0, 0, 0.45);
--iimm-vtk-error-color: var(--iimm-vtk-color-error-text);
--iimm-vtk-error-card-padding: 24px 32px;
--iimm-vtk-error-card-gap: var(--iimm-vtk-spacing-lg);
--iimm-vtk-error-card-radius: 12px;
--iimm-vtk-error-card-max-width: 400px;
--iimm-vtk-error-icon-size: 32px;
--iimm-vtk-error-message-font-size: var(--iimm-vtk-text-lg);
```
</details>

<details>
<summary>点击展开：额外切换按钮变量（8个）</summary>

```css
--iimm-vtk-extra-toggle-bg: rgba(255, 255, 255, 0.9);
--iimm-vtk-extra-toggle-bg-hover: rgba(255, 255, 255, 1);
--iimm-vtk-extra-toggle-border-color: rgba(0, 0, 0, 0.1);
--iimm-vtk-extra-toggle-color: rgba(0, 0, 0, 0.5);
--iimm-vtk-extra-toggle-color-hover: rgba(0, 0, 0, 0.8);
--iimm-vtk-extra-toggle-width: 28px;
--iimm-vtk-extra-toggle-height: 16px;
--iimm-vtk-extra-toggle-radius: 0 0 6px 6px;
```
</details>

<details>
<summary>点击展开：门户面板变量（10个）</summary>

```css
--iimm-vtk-portal-panel-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-portal-panel-border-color: rgba(255, 255, 255, 0.1);
--iimm-vtk-portal-panel-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-portal-panel-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
--iimm-vtk-portal-panel-padding: var(--iimm-vtk-spacing-lg);
--iimm-vtk-portal-panel-min-width: 200px;
--iimm-vtk-portal-notification-bg: var(--iimm-vtk-color-surface);
--iimm-vtk-portal-notification-radius: var(--iimm-vtk-radius-lg);
--iimm-vtk-portal-notification-top: 16px;
--iimm-vtk-portal-notification-right: 16px;
--iimm-vtk-portal-notification-padding: var(--iimm-vtk-spacing-lg) var(--iimm-vtk-spacing-xl);
--iimm-vtk-portal-notification-max-width: 360px;
--iimm-vtk-portal-notification-font-size: var(--iimm-vtk-text-lg);
```
</details>

<details>
<summary>点击展开：场景树面板变量（18个）</summary>

```css
--iimm-vtk-scene-tree-z: 100;
--iimm-vtk-scene-tree-toggle-top: 50%;
--iimm-vtk-scene-tree-toggle-z: 101;
--iimm-vtk-scene-tree-toggle-width: 24px;
--iimm-vtk-scene-tree-toggle-height: 48px;
--iimm-vtk-scene-tree-toggle-radius: var(--iimm-vtk-radius-base);
--iimm-vtk-scene-tree-toggle-font-size: var(--iimm-vtk-text-base);
--iimm-vtk-scene-tree-panel-blur: 8px;
--iimm-vtk-scene-tree-color-picker-z: 200;
--iimm-vtk-scene-tree-color-picker-width: 160px;
--iimm-vtk-scene-tree-header-padding: var(--iimm-vtk-spacing-base) var(--iimm-vtk-spacing-lg);
--iimm-vtk-scene-tree-title-font-size: var(--iimm-vtk-text-lg);
--iimm-vtk-scene-tree-title-font-weight: var(--iimm-vtk-font-semibold);
--iimm-vtk-scene-tree-close-size: 22px;
--iimm-vtk-scene-tree-list-padding: var(--iimm-vtk-spacing-xs) 0;
--iimm-vtk-scene-tree-empty-height: 60px;
--iimm-vtk-scene-tree-item-padding: var(--iimm-vtk-spacing-xs) var(--iimm-vtk-spacing-base);
--iimm-vtk-scene-tree-item-margin: 1px var(--iimm-vtk-spacing-xs);
--iimm-vtk-scene-tree-item-row-gap: var(--iimm-vtk-spacing-sm);
--iimm-vtk-scene-tree-item-checkbox-size: 14px;
--iimm-vtk-scene-tree-item-type-font-size: var(--iimm-vtk-text-xxs);
--iimm-vtk-scene-tree-item-type-width: 16px;
--iimm-vtk-scene-tree-item-name-font-size: var(--iimm-vtk-text-base);
--iimm-vtk-scene-tree-color-picker-padding: var(--iimm-vtk-spacing-base);
--iimm-vtk-scene-tree-color-preview-height: 20px;
--iimm-vtk-scene-tree-color-close-height: 24px;
```
</details>

#### 7.2.3 覆盖CSS变量的方法

**方法一：全局覆盖（影响所有VtkViewer实例）**

在全局CSS文件中覆盖变量：

```css
/* 全局覆盖深色主题 */
.iimm-vtk-theme-dark {
  --iimm-vtk-toolbar-bg: rgba(0, 0, 0, 0.9) !important;
  --iimm-vtk-btn-color: #ff0000 !important;
}

/* 全局覆盖浅色主题 */
.iimm-vtk-theme-light {
  --iimm-vtk-toolbar-bg: #ffffff !important;
  --iimm-vtk-btn-color: #333333 !important;
}
```

**方法二：局部覆盖（仅影响特定实例）**

在组件样式中覆盖变量：

```vue
<template>
  <div class="my-viewer-container">
    <VtkViewer theme="dark" />
  </div>
</template>

<style scoped>
.my-viewer-container {
  /* 仅影响此容器内的VtkViewer */
  --iimm-vtk-toolbar-bg: rgba(0, 0, 0, 0.95);
  --iimm-vtk-btn-color: #00ff00;
}
</style>
```

**方法三：通过JavaScript动态修改**

```typescript
// 获取VtkViewer容器的DOM元素
const viewerContainer = document.querySelector('.iimm-vtk-viewer')

// 动态修改CSS变量
viewerContainer.style.setProperty('--iimm-vtk-toolbar-bg', 'rgba(255, 0, 0, 0.8)')
viewerContainer.style.setProperty('--iimm-vtk-btn-color', '#ffffff')
```

#### 7.2.4 主题类名

VtkViewer根据当前主题自动添加对应的主题类名到根元素：

| 主题ID | 主题类名 |
|---------|-----------|
| `light` | `.iimm-vtk-theme-light` |
| `dark` | `.iimm-vtk-theme-dark` |
| `ocean` | `.iimm-vtk-theme-ocean` |
| `forest` | `.iimm-vtk-theme-forest` |
| `sunset` | `.iimm-vtk-theme-sunset` |
| 自定义主题 | `.iimm-vtk-theme-{themeId}` |

#### 7.2.5 示例：创建自定义主题样式

```css
/* 创建紫色主题 */
.iimm-vtk-theme-purple {
  /* 工具栏 */
  --iimm-vtk-toolbar-bg: rgba(60, 20, 80, 0.9);
  --iimm-vtk-toolbar-border-color: rgba(200, 100, 255, 0.2);
  
  /* 按钮 */
  --iimm-vtk-btn-bg: rgba(200, 100, 255, 0.1);
  --iimm-vtk-btn-bg-hover: rgba(200, 100, 255, 0.2);
  --iimm-vtk-btn-bg-active: rgba(200, 100, 255, 0.3);
  --iimm-vtk-btn-color: #d8a8ff;
  --iimm-vtk-btn-color-hover: #eca8ff;
  --iimm-vtk-btn-color-active: #c070ff;
  
  /* 信息面板 */
  --iimm-vtk-info-panel-bg: rgba(60, 20, 80, 0.9);
  --iimm-vtk-info-panel-label-color: rgba(200, 100, 255, 0.6);
  --iimm-vtk-info-panel-value-color: rgba(200, 100, 255, 0.95);
  
  /* 其他变量... */
}
```

然后在Vue组件中使用：

```vue
<template>
  <VtkViewer 
    theme="purple" 
    :custom-themes="{
      purple: {
        id: 'purple',
        name: '紫色主题',
        isDark: true,
        colors: { /* 颜色配置 */ }
      }
    }" 
  />
</template>
```

---

## 8. 更多资源

- [VTK.js官方文档](https://vtk.org/vtk-js/)
- [GitHub仓库](https://github.com/liudichen/vtkviewer-vue)

## 9. 贡献

欢迎提交Issue和Pull Request！

## 10. 许可证

MIT License - 详见[LICENSE](LICENSE)文件
