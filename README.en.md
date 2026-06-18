# VtkViewer - VTK.js 3D Visualization Vue Component

[English](README.en.md) | [中文](README.md)

![npm version](https://img.shields.io/npm/v/vtkviewer-vue)
![MIT License](https://img.shields.io/badge/license-MIT-blue)
![vue version](https://img.shields.io/badge/vue-3.0+-green)

A Vue 3 component based on VTK.js, providing powerful 3D model visualization capabilities, supporting multiple 3D model formats, a complete toolbar plugin system, theme customization, and internationalization support.

![VtkViewer Interface Preview](https://cdn.jsdelivr.net/gh/liudichen/static@master/images/vtkviewer-vue.png)

---

## 1. Main Features

### 1.1 Core Features

- **Powerful 3D Rendering Engine**: WebGL 2.0 rendering engine based on VTK.js, supporting multiple rendering styles such as surface, wireframe, and points
- **Multi-format Support**: Supports 10+ 3D model formats including STL, OBJ, PLY, VTP, VTU, VTI, GLB, DRC, PDB, ZIP, etc., with support for custom format extensions
- **Plugin-based Architecture**: All features are implemented through plugins, supporting four major plugin types: format plugins, toolbar plugins, UI plugins, and service plugins
- **v-model Support**: Get internal ViewerContext via `v-model:ctx` for event listening and programmatic control at your fingertips
- **Complete Theme System**: Built-in 5 themes (light/dark/ocean/forest/sunset), supporting custom themes and CSS variable overrides
- **Internationalization Support**: Built-in Chinese and English language packs, supporting custom translation functions and dynamic language switching
- **TypeScript Support**: Complete TypeScript type definitions, providing excellent development experience and type safety

### 1.2 Interaction Features

- **Mouse Interaction**: Rotate (left-click drag), Zoom (right-click/scroll wheel), Pan (middle-click/Shift+left-click)
- **Touch Interaction**: Pinch zoom, single-finger rotate, two-finger pan, perfectly supporting mobile devices
- **Keyboard Shortcuts**: Customizable shortcut system (e.g., F for fullscreen, R for reset view, etc.)
- **Drag-and-Drop Loading**: Supports directly dragging model files into the viewport to load
- **Toolbar Operations**: Provides 20+ tools including load/unload model, view control, rendering style switching, clipping, measurement, screenshot, etc.

### 1.3 UI & Experience

- **Responsive Layout**: Automatically adapts to different screen sizes (xs/sm/md/lg/xl), supporting both mobile and desktop
- **Info Panel**: Real-time display of FPS, rendering time, triangle count, memory usage, etc.
- **Scene Tree Panel**: Visualizes scene structure, supporting visibility control, color modification, etc.
- **Loading Progress Indicator**: Elegant loading animation and progress display
- **Error Notification**: User-friendly error message display and recovery suggestions

### 1.4 Advanced Features

- **Event System**: Plugin communication mechanism based on Event Bus, supporting built-in events and custom events
- **Command System**: Unified command registration and execution mechanism, supporting shortcut binding
- **Clipping Feature**: Supports three clipping modes: Clip/Cut/Section, with 3D Widget interaction
- **Measurement Tools**: Supports three measurement modes: point coordinates, distance, and angle
- **Color Mapping**: Supports color mapping by scalar arrays, automatically detecting the best mapping array
- **Animation Support**: Supports model formats with animations (such as GLB), providing play/pause/frame jump controls
- **Bookmark System**: Save and restore camera views, quickly locate to interested views
- **Performance Monitoring**: Real-time display of performance metrics such as FPS and rendering time
- **Screenshot Export**: Supports screenshot functionality with custom scale, format (PNG/JPEG), and transparent background

### 1.5 Developer Friendly

- **v-model Reactivity**: Get internal context via `v-model:ctx`, `isReady` is built into ctx
- **Plugin Development**: Complete plugin development interface and base class, supporting rapid extension
- **Automatic Resource Cleanup**: Automatically releases VTK.js resources when component is unmounted, preventing memory leaks
- **Automatic Format Detection**: Supports format auto-detection based on file extension, magic number, and content analysis
- **Debug Support**: Built-in debug logging system, convenient for development and troubleshooting

---

## 2. Quick Start

### 2.1 Installation

```bash
# npm
npm install vtkviewer-vue

# pnpm
pnpm add vtkviewer-vue

# yarn
yarn add vtkviewer-vue
```

### 2.2 Dependency Instructions

**Peer Dependencies**:
- `vue` (^3.0.0) - Must be installed

**Core Dependencies (automatically installed)**:
- `@kitware/vtk.js` (^36.2.0) - VTK.js core library
- `events` (^3.3.0) - Event handling
- `fflate` (^0.8.3) - File compression/decompression

**Optional Dependencies (install as needed)**:
- `draco3d` (^1.5.7) - DRC format support (Draco compression)

### 2.3 Basic Usage

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
/** Import VtkViewer component, required */
import { VtkViewer } from 'vtkviewer-vue'
/** Import built-in styles (required), via exports mapped styles subpath */
import 'vtkviewer-vue/styles'

const modelSource = ref('/models/example.stl')
</script>
```

> **Note**: The VtkViewer component internally manages the initialization and cleanup of the lifecycle automatically, no need to manually call any initialization methods.

**Parameter Description**:

- All parameters are optional
- `source`: Although optional, usually needs to be provided to display a model
- `sourceFormat`: Optional, recommended when not using file input, helps to quickly and correctly parse the model format
- `theme`: Optional, default value is `'light'`

**Event Listening**:

VtkViewer emits events through an Event Bus, not Vue custom events.

If you need to listen to events, you can use `v-model:ctx` to get the context:

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { VtkViewer, BuiltinEvents } from 'vtkviewer-vue'

const modelSource = ref('/models/example.stl')
const ctx = ref(null)

// Watch ctx changes, register events
watch(ctx, (newCtx) => {
  if (newCtx) {
    newCtx.events.on(BuiltinEvents.SCENE_LOADED, (data) => {
      console.log('Model loaded successfully', data)
    })
  }
})
</script>

<template>
  <VtkViewer v-model:ctx="ctx" :source="modelSource" />
</template>
```

### 2.4 Model Input

VtkViewer supports multiple ways of model input to adapt to different scenario requirements.

#### 2.4.1 Passing via props (Recommended)

This is the simplest and most direct way, suitable for most scenarios.

**Supported Data Types**:

- **URL string**: Local path or network URL
- **File object**: File object obtained from file input, drag-and-drop, etc.
- **ArrayBuffer**: Already loaded binary data
- **ReadableStream**: Streaming data

**Basic Examples**:

```vue
<template>
  <div style="width: 800px; height: 600px;">
    <!-- Method 1: URL string -->
    <VtkViewer
      :source="'/models/example.stl'"
      source-format="stl"
    />
    
    <!-- Method 2: Reactive URL -->
    <VtkViewer
      :source="modelUrl"
      :source-format="format"
    />
    
    <!-- Method 3: File object (from file input) -->
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
    // Optional: auto-detect format from filename
    const fileName = target.files[0].name
    const ext = fileName.split('.').pop()?.toLowerCase()
    format.value = ext || 'stl'
  }
}
</script>
```

#### 2.4.2 Loading via Toolbar (Using built-in toolbar plugin LoadModelPlugin)

VtkViewer has a built-in `LoadModelPlugin` toolbar plugin. Users can manually select and load model files by clicking the "Load Model" button on the toolbar.

**Features**:

- No coding required, users can freely choose files
- Supports all file types of registered format plugins
- Automatically detects file format

#### 2.4.3 Loading via Drag-and-Drop (Using built-in service plugin DragDropPlugin)

VtkViewer has a built-in `DragDropPlugin` service plugin. Users can directly drag model files into the viewer viewport to load models.

**Features**:

- Intuitive and easy to use, conforms to user habits
- Supports dragging multiple files (if the plugin supports it)
- Automatically detects file format

**Enabling Drag-and-Drop Feature**:

The drag-and-drop feature is enabled by default, no additional configuration is needed. If you need to disable it, you can exclude `DragDropPlugin` from the plugin configuration:

```vue
<script setup lang="ts">
import { VtkViewer, type PluginsConfig } from 'vtkviewer-vue'

const plugins: PluginsConfig = {
  service: [
    // Not registering DragDropPlugin disables the drag-and-drop feature
  ]
}
</script>

<template>
  <VtkViewer :plugins="plugins" />
</template>
```

#### 2.4.4 Automatic Format Detection

When `source` is a File object or URL, the component will automatically detect the format from the file extension. For ArrayBuffer or ReadableStream, it is recommended to explicitly specify `sourceFormat`.

```vue
<template>
  <VtkViewer
    :source="modelData"
    :source-format="format"  <!-- For non-File/URL sources, recommend specifying format; if not specified, will try to get from filename or magic number -->
    :source-filename="'model.stl'"  <!-- Optional: helps with format detection -->
  />
</template>
```

### 2.5 Supported Formats

VtkViewer supports multiple 3D model formats, handled by corresponding plugins.

| Format | Extensions | Plugin Class | Data Type | Description |
|--------|------------|--------------|------------|-------------|
| STL | `stl`, `stla`, `stlb` | `StlPlugin` | PolyData | 3D printing standard format, supports ASCII and binary |
| OBJ | `obj` | `ObjPlugin` | PolyData | Wavefront OBJ format, supports MTL materials |
| PLY | `ply` | `PlyPlugin` | PolyData | Stanford PLY format, supports color and texture |
| VTP | `vtp` | `VtpPlugin` | PolyData | VTK PolyData XML format |
| VTI | `vti` | `VtiPlugin` | ImageData | VTK ImageData XML format (volume rendering) |
| VTU | `vtu` | `VtuPlugin` | UnstructuredGrid | VTK UnstructuredGrid XML format |
| GLB | `glb` | `GlbPlugin` | PolyData | GL Transmission Format Binary version (does not support gltf) |
| DRC | `drc` | `DrcPlugin` | PolyData | Draco compressed format **(requires Draco decoder)** |
| PDB | `pdb` | `PdbPlugin` | Molecule | Protein Data Bank format |
| ZIP | `zip`, `vtkjs`, `obz` | `ZipPlugin` | Composite format | Automatically identifies internal formats (VTK.js ZIP, OBJ+MTL, etc.) |

**DRC Format Support Instructions**:

The DRC format uses the Draco compression algorithm and requires a Draco decoder to parse. VtkViewer supports two ways to load the decoder:

**Method 1: Configure decoder path via props (Recommended)**

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

Place the Draco decoder files (`draco_decoder.js` and `draco_decoder.wasm`) in the public directory, then configure the path via the decoders prop.

**Method 2: Install draco3d package**

```bash
pnpm add draco3d
```

After installation, the plugin will attempt to automatically load the Draco decoder (this method may not always succeed, because special handling is done for the package name to bypass Vite's static detection, which may ignore the local package — please prefer Method 1).
In fact, if neither is configured, the plugin will try to resolve the decoder from the path `/draco_decoder.js`. If that still doesn't exist, an exception will be thrown.

---

## 3. Core Concepts

### 3.1 Design Architecture

VtkViewer adopts a modular, plugin-based architecture design, with the core divided into the following layers:

#### 3.1.1 Architecture Layers

```
┌─────────────────────────────────────────────────┐
│           Component Layer (Components)           │
│  ├── VtkViewer.vue (Main Component)          │
│  ├── Toolbar (Toolbar)                       │
│  └── UI Components (Info Panel, Loading Tips, etc.) │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           Plugin Layer (Plugins)                 │
│  ├── Format Plugins (Format Plugins)           │
│  ├── Toolbar Plugins (Toolbar Plugins)         │
│  ├── UI Plugins (UI Plugins)                  │
│  └── Service Plugins (Service Plugins)        │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│           Core Layer (Core)                      │
│  ├── ViewerContext (Unified Context)           │
│  ├── RenderSubContext (Render Sub-context)     │
│  ├── SceneSubContext (Scene Sub-context)       │
│  ├── InteractionSubContext (Interaction Sub-context) │
│  ├── ThemeContext (Theme Context)               │
│  └── Other Sub-contexts...                     │
└─────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────┐
│         VTK.js Rendering Engine Layer           │
│  ├── GenericRenderWindow (WebGL 2.0)         │
│  ├── vtkRenderer/vtkRenderWindow              │
│  └── vtkActor/vtkMapper/vtkVolume            │
└─────────────────────────────────────────────────┘
```

#### 3.1.2 Core Design Principles

1. **Plugin-based Architecture**: All features are implemented through plugins, easy to extend and customize
2. **v-model Reactivity**: Get internal context via `v-model:ctx`
3. **Type Safety**: Complete TypeScript type definitions, providing excellent development experience
4. **Theme System**: Built-in multiple themes, supporting custom themes
5. **Internationalization**: Built-in Chinese and English language packs, supporting custom translation functions

### 3.2 ctx & Event Listening

The VtkViewer component **always creates `ViewerContext` internally**, and the lifecycle is automatically managed by the component. The external side gets the internal context via `v-model:ctx`.

#### 3.2.1 Basic Usage

The component mounts and automatically creates ctx, and unmounts to automatically clean up, no manual management needed:

```vue
<template>
  <VtkViewer
    :source="modelSource"
    background="#1a1a1a"
    theme="dark"
  />
</template>
```

#### 3.2.2 Getting Context via v-model:ctx

When you need to listen to events or programmatic control, use `v-model:ctx`:

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
    // Listen to events
    newCtx.events.on(BuiltinEvents.SCENE_LOADED, (data) => {
      console.log('Model loaded successfully', data)
    })
  }
})
</script>
```

---

## 4. API Reference

### 4.1 VtkViewer Props Detail

```typescript
interface VtkViewerProps {
  // ========== Core Configuration ==========
  
  /** Default background color (reactive, supports external dynamic modification)
   * @default '#e6e6e6'
   */
  background?: string
  
  // ========== Data Source Configuration ==========
  
  /** 
   * Data source (File/URL/ArrayBuffer/ReadableStream)
   * Component automatically loads after setting
   */
  source?: VtkViewerSource | null
  
  /** 
   * Data source format (optional, but recommended)
   * When source is File or URL, can auto-detect from file extension
   * When source is ArrayBuffer or ReadableStream, recommend providing this parameter
   * If not provided, internal will try using magic number for format detection
   */
  sourceFormat?: string
  
  /** Data source filename (optional when source is ArrayBuffer or ReadableStream, used for format detection) */
  sourceFilename?: string
  
  // ========== UI Configuration ==========
  
  /** Toolbar configuration, false to hide toolbar */
  toolbar?: ToolbarConfig | boolean
  
  /** Info panel configuration, false to hide info panel */
  infoPanel?: InfoPanelConfig | boolean
  
  /** Custom CSS class passed to PluginToolbar */
  toolbarClass?: string | string[]
  
  /** Custom CSS class passed to ToolbarInfoPanel */
  toolbarInfoPanelClass?: string | string[]
  
  /** Custom CSS class passed to ToolbarExtension */
  toolbarExtensionClass?: string | string[]
  
  /** UI plugin configuration */
  ui?: UIConfig
  
  // ========== Plugin Configuration ==========
  
  /**
   * Plugin configuration (high priority)
   * Uses categorized configuration format, grouped by plugin type:
   *   - format:  Format plugins
   *   - toolbar: Toolbar plugins
   *   - ui:      UI plugins
   *   - service:  Service plugins
   *
   * Overrides default plugin configuration when passed in.
   */
  plugins?: PluginsConfig
  
  // ========== Theme & Internationalization ==========
  
  /** Theme ID (e.g., 'dark', 'light', 'ocean', 'forest', 'sunset')
   * @default 'light'
   */
  theme?: string
  
  /** Custom theme configuration (format consistent with built-in themes, same name overrides built-in theme) */
  customThemes?: Record<string, ThemeConfig>
  
  /**
   * Internationalization translation function (injected from outside).
   * When not passed, all strings use the key as fallback.
   * Key format: `vtkviewer.module.subKey` (e.g., `vtkviewer.toolbar.rotate.title`)
   */
  t?: I18nTranslateFunction | null
  
  /**
   * Current language identifier (e.g., 'zh', 'en').
   * Triggers renderCache cleanup and component re-render on change.
   * @default 'zh'
   */
  locale?: string
  
  /**
   * Available language list.
   * Passed to LanguageSwitchPlugin, defaults to [{ id:'zh', label:'中文' }, { id:'en', label:'English' }] when not provided.
   */
  languages?: LanguageOption[]
  
  // ========== Decoder Configuration ==========
  
  /**
   * External decoder path configuration.
   * Key is decoder identifier, value is JS file path (local public/ path or CDN URL).
   * Supported identifiers:
   *   - draco: Draco decoder, corresponds to draco_decoder.js
   *   - ifc:   IFC decoder (reserved), corresponds to web-ifc.js
   * When not configured, plugin will try to dynamically import the corresponding npm package.
   */
  decoders?: Record<string, string>
  
  // ========== Interaction Configuration ==========
  
  /**
   * Whether to enable gesture control (touch/pinch/rotate and other touchscreen interactions).
   * When set to false, gesture interaction will not be enabled even if hardware supports touchscreen.
   * @default true
   */
  enableGesture?: boolean
  
  /**
   * Whether to enable keyboard control (camera WASD navigation and all plugin shortcuts).
   * When set to false, all keyboard shortcuts are disabled and not shown in tooltips.
   * @default true
   */
  enableKeyboard?: boolean
  
  // ========== Debug Options ==========
  
  /**
   * Whether to enable debug log output.
   * When enabled, outputs debug information such as plugin initialization and process tracing to the console.
   * Default is false, production environment recommended to keep disabled.
   * @default false
   */
  debug?: boolean
}
```

### 4.2 Plugin Configuration: PluginsConfig

```typescript
import type { PluginItem, FormatPluginItem } from 'vtkviewer-vue'

interface PluginsConfig {
  /** Format plugins: responsible for parsing different 3D model formats */
  format?: FormatPluginItem[]
  
  /** Toolbar plugins: various tool buttons displayed in the toolbar */
  toolbar?: PluginItem[]
  
  /** UI plugins: overlay layers, info panels, and other UI components */
  ui?: PluginItem[]
  
  /** Service plugins: provide background service capabilities (such as drag-and-drop loading, shortcut binding) */
  service?: PluginItem[]
}
```

**Type Description**:

- `PluginItem<T>`: Plugin configuration item, supports two formats:
  - Simplified format: `PluginIdentifier` (uses default configuration)
  - Full format: `[PluginIdentifier, T?]` tuple (custom configuration)
  
- `FormatPluginItem<T>`: Format plugin configuration item, same structure as `PluginItem`

**Usage Example**:

```typescript
import { PluginsConfig } from 'vtkviewer-vue'
import { StlPlugin, ObjPlugin, RotatePlugin, ZoomPlugin } from 'vtkviewer-vue'

const plugins: PluginsConfig = {
  format: [
    StlPlugin,                      // Simplified format
    [ObjPlugin, { option1: true }] // Full format (with configuration)
  ],
  toolbar: [
    RotatePlugin,
    [ZoomPlugin, { group: 'control' }] // Plugin with configuration
  ]
}
```

---

## 5. Plugin System

### 5.1 Plugin Mechanism & Configuration Methods

#### 5.1.1 Plugin System Architecture

VtkViewer's plugin system is based on the following core concepts:

1. **PluginBase**: The base class for all plugins, providing unified lifecycle and utility methods
2. **ViewerContext**: The context object that plugins receive via the `init(ctx)` method, used to access viewer capabilities
3. **Plugin Metadata**: Each plugin must define a `metadata` property (id, name, description, etc.)
4. **Plugin Configuration**: Supports defining default configuration via `defaultConfig`, and receiving external configuration via `init(ctx, config)`

#### 5.1.2 Default Plugin Configuration

VtkViewer has rich built-in default plugins that can be used without configuration:

```typescript
// Format plugins (format)
const DEFAULT_FORMAT_PLUGINS = [
  StlPlugin,      // STL format
  ObjPlugin,      // OBJ format
  PlyPlugin,      // PLY format
  VtpPlugin,      // VTP format
  VtuPlugin,      // VTU format
  VtiPlugin,      // VTI format
  PdbPlugin,      // PDB format
  ZipPlugin,      // ZIP composite format
  DrcPlugin       // DRC format (requires Draco decoder)
]

// Toolbar plugins (toolbar) - partial examples
const DEFAULT_TOOLBAR_PLUGINS = [
    LoadModelPlugin,                                                                  // Load model
    UnloadModelPlugin,                                                                // Unload model
    [ViewSelectPlugin, { group: 'viewSelect' } satisfies ViewSelectPluginConfig],     // View selection (front/side view, etc.)
    [RotatePlugin, { group: 'control' } satisfies RotatePluginConfig],                // Rotate control
    [ZoomPlugin, { group: 'control' } satisfies ZoomPluginConfig],                   // Zoom control
    [PanPlugin, { group: 'control' } satisfies PanPluginConfig],                     // Pan control
    [CenterModelPlugin, { group: 'control' } satisfies CenterModelPluginConfig],     // Center model
    [FullscreenPlugin, { group: 'control' } satisfies FullscreenPluginConfig],       // Fullscreen toggle
    [ResetAllPlugin, { group: 'control' } satisfies ResetAllPluginConfig],           // Reset all
    [AxesPlugin, { group: 'scene' } satisfies AxesPluginConfig],                     // Axes display
    [LightIntensityPlugin, { group: 'scene' } satisfies LightIntensityPluginConfig], // Light intensity adjustment
    [BackgroundColorPlugin, { group: 'scene' } satisfies BackgroundColorPluginConfig],// Background color setting
    [RenderStylePlugin, { group: 'model' } satisfies RenderStylePluginConfig],       // Render style (surface/wireframe/points)
    [RenderGridPlugin, { group: 'model' } satisfies RenderGridPluginConfig],         // Render grid
    [ClippingPlugin, { group: 'model' } satisfies ClippingPluginConfig],             // Clipping plane
    [MeasurementPlugin, { group: 'model' } satisfies MeasurementPluginConfig],       // Measurement tools
    [ColorByPlugin, { group: 'model' } satisfies ColorByPluginConfig],               // Color by attribute
    [ScreenshotPlugin, { group: 'tools1' } satisfies ScreenshotPluginConfig],       // Screenshot save
    [BookmarkPlugin, { group: 'tools1' } satisfies BookmarkPluginConfig],             // Bookmark management
    [ThemeSwitchPlugin, { group: 'tools1' } satisfies ThemeSwitchPluginConfig],     // Theme switch
    [PerformancePlugin, { group: 'tools2' } satisfies PerformancePluginConfig],     // Performance monitoring
    [RenderPrecisionPlugin, { group: 'tools2' } satisfies RenderPrecisionPluginConfig], // Render precision setting
    [LanguageSwitchPlugin, { group: 'tools2' } satisfies LanguageSwitchPluginConfig] // Language switch
  ] 

// UI plugins (ui)
const DEFAULT_UI_PLUGINS = [
  LoadingPlugin,     // Loading progress
  ErrorPlugin,       // Error notification
  FilenameInfoPlugin, // Filename information
  SceneTreePlugin    // Scene tree
]

// Service plugins (service)
const DEFAULT_SERVICE_PLUGINS = [
  DragDropPlugin,   // Drag-and-drop loading
  KeyBindingPlugin  // Shortcut binding
]
```

#### 5.1.3 Custom Plugin Configuration

You can override the default plugin configuration via the `plugins` prop:

```vue
<template>
  <VtkViewer
    :plugins="customPlugins"
    :toolbar="false"  <!-- Hide toolbar -->
    :info-panel="false"  <!-- Hide info panel -->
  />
</template>

<script setup lang="ts">
import { PluginsConfig } from 'vtkviewer-vue'

// Custom plugin configuration: only keep load, rotate, zoom, pan
const customPlugins: PluginsConfig = {
  format: [
    StlPlugin,                      // Simplified format
    [ObjPlugin, { option1: true }] // Full format (with configuration)
  ],
  toolbar: [
    LoadModelPlugin,
    [RotatePlugin, { group: 'control' }], // Plugin with configuration
    ZoomPlugin,
    PanPlugin
  ],
  ui: [LoadingPlugin, ErrorPlugin],  // Only keep loading and error notification
  service: [DragDropPlugin]  // Only keep drag-and-drop loading
}
</script>
```

### 5.2 Plugin Development Guide

#### 5.2.1 Plugin Base Class Capabilities

The plugin base class `PluginBase` provides the following core capabilities:

```typescript
abstract class PluginBase<TConfig extends PluginConfig = PluginConfig> {
  // ========== Lifecycle ==========
  
  /** Initialize plugin (called by plugin system) */
  init(ctx: ViewerContext, config?: TConfig): void
  
  /** Subclasses override this method for initialization (called after config merge is complete) */
  protected onInit(): void
  
  /** Release plugin resources (called by plugin system) */
  dispose(): void
  
  /** Subclasses extend cleanup hook (for releasing VTK objects, unregistering commands, etc.) */
  protected onDispose(): void
  
  // ========== Visibility Control ==========
  
  /** Whether the plugin is visible (subclasses can override) */
  isVisible(): boolean
  
  // ========== Event Management ==========
  
  /** Register event and automatically track (recommended alternative to directly calling ctx.events.on) */
  protected onEvent(event: string, callback: (...args: any[]) => void): void
  
  // ========== InfoPanel Registration ==========
  
  /** Register info panel item (automatically unregistered on dispose) */
  protected registerInfoPanelItem(item: Omit<ToolbarInfoItem, 'id'> & { id?: string }): void
  
  // ========== Extension Area Registration ==========
  
  /** Register extension area item (automatically unregistered on dispose) */
  protected registerExtensionItem(item: Omit<ToolbarExtensionItem, 'id'> & { id?: string }): void
  
  // ========== Command Registration ==========
  
  /** Register command and automatically track (automatically unregistered on dispose) */
  protected registerCommand<T = void>(id: string, handler: CommandHandler<T>): void
  
  // ========== Configuration Access ==========
  
  /** Get configuration value */
  protected getConfig<K extends keyof TConfig>(key: K): TConfig[K]
  
  /** Get full configuration (shallow copy) */
  protected getConfigAll(): TConfig
  
  // ========== Debug Log ==========
  
  /** Debug log: only outputs console.log when debug=true */
  protected debugLog(...args: any[]): void
}
```

#### 5.2.2 Extending New Format Plugins

Example of creating a custom format plugin:

```typescript
// MyFormatPlugin.ts
import {
  PluginBase, PluginType,
  type IFormatPlugin, type FormatParseResult, type PluginConfig
} from 'vtkviewer-vue'

export interface MyFormatPluginConfig extends PluginConfig {
  // Custom configuration items (optional)
  enabled?: boolean
}

export class MyFormatPlugin extends PluginBase<MyFormatPluginConfig> implements IFormatPlugin {
  // Plugin metadata
  readonly metadata = {
    id: 'my-format',
    name: 'MyFormatPlugin',
    type: PluginType.FORMAT,
    description: 'My custom format plugin'
  }
  
  // Supported file extensions
  readonly formats = ['myfmt', 'myf']
  
  // Priority (smaller number = higher priority)
  readonly priority = 10
  
  // Default configuration
  readonly defaultConfig: MyFormatPluginConfig = { enabled: true }
  
  // ========== IFormatPlugin Interface Implementation ==========
  
  /** Check if this plugin supports the format */
  canHandle(format: string): boolean {
    return this.formats.includes(format.toLowerCase())
  }
  
  /** Parse file data */
  async parse(
    arrayBuffer: ArrayBuffer,
    format: string,
    options?: Record<string, any>
  ): Promise<FormatParseResult> {
    // Detect file format (optional)
    if (!this.detect(arrayBuffer)) {
      throw new Error(`Unsupported file format: ${format}`)
    }
    
    // Parse format data, return VTK.js data object
    const data = // ... parsing logic
    
    return {
      actors: [actor],  // vtkActor instance array
      data: polyData,    // VTK data object
      metadata: {         // Optional metadata
        format: format,
        vertices: polyData.getNumberOfPoints()
      }
    }
  }
  
  /** Release resources */
  dispose(): void {
    // Cleanup resources
  }
  
  // ========== Custom Methods ==========
  
  /** Detect file header information (optional) */
  private detect(buffer: ArrayBuffer): boolean {
    const header = new Uint8Array(buffer, 0, 4)
    return header[0] === 0x4D && header[1] === 0x46  // 'MF'
  }
}
```

Then use it in VtkViewer configuration:

```vue
<script setup lang="ts">
import { MyFormatPlugin } from './MyFormatPlugin'
</script>

<template>
  <VtkViewer :plugins="{
    format: [
      // ...other format plugins
      MyFormatPlugin  // Add custom format plugin
    ]
  }" />
</template>
```

#### 5.2.3 Custom Toolbar Plugins

Example of creating a custom toolbar plugin:

```typescript
// MyCustomPlugin.ts
import { PluginBase, IToolbarPlugin, PluginMetadata } from 'vtkviewer-vue'

export interface MyCustomPluginConfig extends PluginConfig {
  /** Custom configuration item */
  customOption?: string
  hideWhenNoModel?: boolean
}

export class MyCustomPlugin extends PluginBase<MyCustomPluginConfig> implements IToolbarPlugin {
  // Plugin metadata
  readonly metadata: PluginMetadata = {
    id: 'my-custom-plugin',
    name: 'My Custom Plugin',
    description: 'My custom plugin',
    order: 100  // Sort priority in toolbar
  }
  
  // Default configuration
  readonly defaultConfig: MyCustomPluginConfig = {
    customOption: 'default',
    hideWhenNoModel: false
  }
  
  // ========== IToolbarPlugin Interface Implementation ==========
  
  /** Render toolbar button */
  renderButton(): VNode {
    return h('button', {
      onClick: () => this.onButtonClick(),
      class: 'iimm-vtk-toolbar-item'
    }, 'My Plugin')
  }
  
  /** Whether the plugin is visible */
  isVisible(): boolean {
    // If configured to hideWhenNoModel and no model, then hide
    if (this.config.hideWhenNoModel && this.ctx.scene.modelCount.value === 0) {
      return false
    }
    return true
  }
  
  // ========== Custom Methods ==========
  
  private onButtonClick() {
    // Use ctx to access viewer capabilities
    const renderer = this.ctx.render.getRenderer()
    // ... execute custom logic
    
    // Use debug log
    this.debugLog('MyCustomPlugin: button clicked')
  }
  
  // ========== Lifecycle ==========
  
  protected onInit(): void {
    // Plugin initialization logic
    this.debugLog('MyCustomPlugin: initialized with config', this.config)
    
    // Register event listeners
    this.onEvent('scene:loaded', () => {
      this.debugLog('MyCustomPlugin: scene loaded')
    })
    
    // Register info panel item
    this.registerInfoPanelItem({
      render: () => h('div', 'Custom info')
    })
  }
  
  protected onDispose(): void {
    // Custom cleanup logic
    this.debugLog('MyCustomPlugin: disposed')
  }
}
```

Using custom plugins:

```vue
<template>
  <VtkViewer
    :plugins="{
      toolbar: [
        // ...other plugins
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

## 6. Internationalization & Language Switching

VtkViewer has built-in complete internationalization (i18n) support, supporting Chinese-English switching, and allowing injection of custom translation functions or use of custom language packs.

### 6.1 Built-in Languages

VtkViewer has two built-in language packs by default:

| Language ID | Language Name | Description |
|-------------|---------------|-------------|
| `zh` | Chinese | Default language |
| `en` | English | English |

### 6.2 Basic Usage

#### 6.2.1 Configure Language via props

```vue
<template>
  <!-- Set current language -->
  <VtkViewer locale="en" />

  <!-- Custom available language list -->
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

#### 6.2.2 Switch Language via Toolbar

The default toolbar includes `LanguageSwitchPlugin`. Click the language switch button in the toolbar to select a language from the dropdown menu.

If you want to disable the language switch plugin:

```vue
<template>
  <VtkViewer
    :plugins="{
      toolbar: [
        // Exclude language switch plugin, configure plugins as needed
        ...
      ]
    }"
  />
</template>
```

### 6.3 Inject Custom Translation Function

If you use Vue I18n or other internationalization libraries, you can inject the translation function via the `t` prop:

```vue
<template>
  <VtkViewer :t="myTranslateFunction" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// Wrap vue-i18n's t function to be compatible with VtkViewer's signature
function myTranslateFunction(key: string, options?: any): string {
  return t(key, options) || key
}
</script>
```

**Translation Function Signature**:

```typescript
type I18nTranslateFunction = (key: string) => string
```

**Translation Priority Chain**:

1. Externally injected `t(key)` — if the result returned by the function is not equal to `key`, then use it
2. Built-in language pack for current locale — returned when key exists
3. Built-in language pack for default locale (`zh`) — returned when key exists
4. key itself — as the final fallback

### 6.4 Register Custom Language Pack

If you need to add a custom language pack (such as Japanese, French, etc.), you can register it via `I18nManager`:

```typescript
// Import i18n singleton from the package
import { i18n } from 'vtkviewer-vue'

// Register Japanese language pack
i18n.registerLocale('ja', {
  'vtkviewer.toolbar.rotate.title': '回転',
  'vtkviewer.toolbar.zoom.title': 'ズーム',
  // ... other translation keys
})

// Set available language list (including Japanese)
i18n.setLanguageOptions([
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
  { id: 'ja', label: '日本語' }
])
```

### 6.5 Translation Key Naming Convention

VtkViewer's translation keys follow the following naming convention:

```
vtkviewer.module.subKey
```

**Common Key Examples**:

| Key | Chinese | English |
|-----|---------|---------|
| `vtkviewer.toolbar.rotate.title` | 旋转 | Rotate |
| `vtkviewer.toolbar.zoom.title` | 缩放 | Zoom |
| `vtkviewer.toolbar.loadModel.title` | 加载模型 | Load Model |
| `vtkviewer.toolbar.screenshot.title` | 截图 | Screenshot |
| `vtkviewer.source.formatNotDetected` | 无法识别文件格式，请提供 sourceFormat | Unable to detect file format, please provide sourceFormat |
| `vtkviewer.plugin.stl.description` | STL格式处理器（支持ASCII和二进制） | STL format processor (supports ASCII and binary) |

You can view `BUILTIN_LANGS` for the complete built-in language packs.

### 6.6 Using Internationalization in Custom Plugins

In custom toolbar plugins, you can translate via the `i18n` singleton:

**Method 1: Imperative Translation (Suitable for utility functions, logs, etc.)**

```typescript
// Import i18n singleton from the package
import { i18n } from 'vtkviewer-vue'

// Simple translation
const text = i18n.translate('vtkviewer.toolbar.myPlugin.title')

// Use in render function
render(): Component {
  return defineComponent({
    setup() {
      const title = i18n.translate('vtkviewer.toolbar.myPlugin.title')
      return () => h('div', title)
    }
  })
}
```

**Method 2: Reactive Translation (Suitable for Vue render functions)**

```typescript
// Import i18n singleton from the package
import { i18n } from 'vtkviewer-vue'

render(): Component {
  return defineComponent({
    setup() {
      // Use i18n.t() to return ComputedRef, automatically updates when locale changes
      const title = i18n.t('vtkviewer.toolbar.myPlugin.title')

      return () => h('button', title.value)
    }
  })
}
```

### 6.7 Imperative Language Switching

In addition to switching languages via the UI dropdown menu, you can also imperatively switch languages in code:

```typescript
// Import i18n singleton from the package
import { i18n } from 'vtkviewer-vue'

// Switch to English
i18n.setLocale('en')

// Get current language
const current = i18n.currentLocale.value

// Reset to default language
i18n.resetLocale()

// Listen for language changes
const unregister = i18n.onLocaleChanged((locale) => {
  console.log('Language switched to:', locale)
})
```

---

## 7. Themes & Styles

### 7.1 Theme System

#### 7.1.1 Built-in Themes

VtkViewer has 5 built-in themes that can be dynamically switched via props or toolbar:

| Theme ID | Theme Name | Type | Description |
|----------|------------|------|-------------|
| `light` | Light Theme | Light | Default theme, suitable for most scenarios |
| `dark` | Dark Theme | Dark | Suitable for low-light environments |
| `ocean` | Ocean Theme | Dark | Blue tone, suitable for ocean data visualization |
| `forest` | Forest Theme | Dark | Green tone, suitable for terrain data visualization |
| `sunset` | Sunset Theme | Dark | Orange tone, suitable for warm-colored scenes |

#### 7.1.2 Theme Configuration Structure

```typescript
interface ThemeConfig {
  /** Unique theme identifier */
  id: string
  
  /** Theme display name */
  name: string
  
  /** Whether it is a dark theme */
  isDark: boolean
  
  /** Theme color configuration */
  colors: {
    toolbarBg: string              // Toolbar background color
    toolbarBorder: string          // Toolbar border color
    btnBg: string                // Button background color
    btnBgHover: string           // Button hover background color
    btnBgActive: string          // Button active background color
    btnColor: string             // Button text color
    btnColorHover: string        // Button hover text color
    btnColorActive: string       // Button active text color
    separatorColor: string       // Separator color
    popupBg: string             // Popup layer background color
    popupBorder: string         // Popup layer border color
    popupColor: string          // Popup layer text color
    popupLabelColor: string     // Popup layer label color
    inputBg: string            // Input box background color
    inputBorder: string         // Input box border color
    inputColor: string          // Input box text color
    loadingBg: string          // Loading background color
    loadingCardBg: string       // Loading card background color
    loadingText: string         // Loading text color
    loadingTextSecondary: string // Loading secondary text color
    infoPanelBg: string        // Info panel background color
    infoPanelLabel: string      // Info panel label color
    infoPanelValue: string      // Info panel value color
    errorBg: string            // Error background color
    errorBorder: string        // Error border color
    errorColor: string          // Error text color
    extensionBg: string        // Extension area background color
    extensionSeparatorColor: string // Extension area separator color
  }
}
```

#### 7.1.3 Custom Theme

**Method 1: Inject via `customThemes` prop**

```vue
<template>
  <VtkViewer
    theme="my-custom-theme"
    :custom-themes="{
      'my-custom-theme': {
        id: 'my-custom-theme',
        name: 'My Custom Theme',
        isDark: true,
        colors: {
          toolbarBg: 'rgba(30, 30, 50, 0.9)',
          // ... other color configurations
        }
      }
    }"
  />
</template>
```

**Method 2: Dynamically register via `ctx.theme`**

```typescript
// After getting ViewerContext
ctx.theme.registerTheme('my-theme', {
  id: 'my-theme',
  name: 'My Theme',
  isDark: true,
  colors: {
    // ... color configuration
  }
})

// Switch theme
ctx.theme.setTheme('my-theme')
```

#### 7.1.4 Dynamic Theme Switching

```vue
<template>
  <div>
    <VtkViewer :theme="currentTheme" />
    <select v-model="currentTheme">
      <option value="dark">Dark Theme</option>
      <option value="light">Light Theme</option>
      <option value="ocean">Ocean Theme</option>
      <option value="forest">Forest Theme</option>
      <option value="sunset">Sunset Theme</option>
      <option value="custom">Custom Theme</option>
    </select>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
const currentTheme = ref('dark')
</script>
```

### 7.2 Style System Design & CSS Variable Override

VtkViewer uses CSS variables (custom properties) to implement the theme system. All styles are based on these variables. You can customize the component appearance by overriding these CSS variables.

#### 7.2.1 CSS Variable Naming Convention

All CSS variables use the `--iimm-vtk-` prefix, following the naming convention below:

```
--iimm-vtk-{component}-{property}
```

Examples:

- `--iimm-vtk-toolbar-bg` - Toolbar background color
- `--iimm-vtk-btn-color` - Button text color
- `--iimm-vtk-popup-bg` - Popup box background color

#### 7.2.2 Complete CSS Variable List

VtkViewer uses a complete set of semantic CSS variable system, including two major categories: **Semantic Design Tokens** and **Component Style Variables**.

> **Tip**: You can view the default values of all CSS variables in the `src/styles/_variables.scss` file.

**Semantic Design Tokens**

These variables define the basic rules of the design system and are referenced by various component variables.

<details>
<summary>Click to expand: Semantic Typography Variables (12)</summary>

```css
/* Font size */
--iimm-vtk-text-xs: 9px;           /* Badge, very small label */
--iimm-vtk-text-sm: 11px;          /* Auxiliary text, label, secondary information */
--iimm-vtk-text-base: 12px;        /* Body text, option text, button text */
--iimm-vtk-text-lg: 13px;          /* Title, panel title */
--iimm-vtk-text-xl: 16px;         /* Modal main title */
--iimm-vtk-text-xxs: 10px;        /* Tiny text (color bar values, etc.) */

/* Font weight */
--iimm-vtk-font-normal: 400;
--iimm-vtk-font-medium: 500;
--iimm-vtk-font-semibold: 600;
--iimm-vtk-font-bold: 700;

/* Line height */
--iimm-vtk-leading-tight: 1.2;
--iimm-vtk-leading-normal: 1.4;
--iimm-vtk-leading-relaxed: 1.6;

/* Letter spacing */
--iimm-vtk-tracking-normal: 0;
--iimm-vtk-tracking-tight: 0.3px;
--iimm-vtk-tracking-wide: 0.5px;

/* Font family */
--iimm-vtk-font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--iimm-vtk-font-mono: 'Fira Code', 'SF Mono', 'Cascadia Code', monospace;
```
</details>

<details>
<summary>Click to expand: Semantic Spacing & Radius Variables (9)</summary>

```css
/* Spacing */
--iimm-vtk-spacing-xs: 4px;
--iimm-vtk-spacing-sm: 6px;
--iimm-vtk-spacing-base: 8px;
--iimm-vtk-spacing-lg: 12px;
--iimm-vtk-spacing-xl: 16px;

/* Border radius */
--iimm-vtk-radius-sm: 4px;
--iimm-vtk-radius-base: 6px;
--iimm-vtk-radius-lg: 8px;
--iimm-vtk-radius-xl: 10px;
--iimm-vtk-radius-full: 50%;
```
</details>

<details>
<summary>Click to expand: Semantic Color Variables (22)</summary>

```css
/* Text color */
--iimm-vtk-color-text-primary: #e0e0e0;
--iimm-vtk-color-text-secondary: rgba(255, 255, 255, 0.6);
--iimm-vtk-color-text-disabled: rgba(255, 255, 255, 0.35);
--iimm-vtk-color-text-inverse: #1a1a2e;
--iimm-vtk-color-text-accent: #64ffda;

/* Background color */
--iimm-vtk-color-surface: #2a2a3e;
--iimm-vtk-color-surface-raised: #1e1e30;
--iimm-vtk-color-overlay: rgba(0, 0, 0, 0.55);

/* Border color */
--iimm-vtk-color-border: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-border-light: rgba(255, 255, 255, 0.08);

/* Interaction color */
--iimm-vtk-color-interactive-hover: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-interactive-active: rgba(100, 255, 218, 0.18);

/* Accent color */
--iimm-vtk-color-accent: #64ffda;
--iimm-vtk-color-accent-muted: rgba(100, 255, 218, 0.25);

/* Input color */
--iimm-vtk-color-input-bg: rgba(0, 0, 0, 0.25);
--iimm-vtk-color-input-border: rgba(255, 255, 255, 0.12);
--iimm-vtk-color-input-focus: #64ffda;

/* Slider color */
--iimm-vtk-color-slider-track: rgba(255, 255, 255, 0.1);
--iimm-vtk-color-slider-thumb: #64ffda;

/* Status color */
--iimm-vtk-color-info: #60a5fa;
--iimm-vtk-color-success: #4ade80;
--iimm-vtk-color-error: #ef4444;
--iimm-vtk-color-error-text: #fca5a5;
--iimm-vtk-color-warning: #f59e0b;

/* Toggle switch color */
--iimm-vtk-color-toggle-off: rgba(255, 255, 255, 0.15);
--iimm-vtk-color-toggle-on: #64ffda;
--iimm-vtk-color-toggle-knob: #ffffff;

/* Divider color */
--iimm-vtk-color-divider: rgba(255, 255, 255, 0.12);
```
</details>

**Component Style Variables**

These variables directly control the styles of various components.

<details>
<summary>Click to expand: Viewer Size Variables (3)</summary>

```css
--iimm-vtk-width: 100%;
--iimm-vtk-height: 100%;
--iimm-vtk-min-width: 0;
```
</details>

<details>
<summary>Click to expand: Toolbar Variables (6)</summary>

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
<summary>Click to expand: Toolbar Button Variables (11)</summary>

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
<summary>Click to expand: Toolbar Icon Variables (1)</summary>

```css
--iimm-vtk-icon-size: 20px;
```
</details>

<details>
<summary>Click to expand: Toolbar Separator Variables (4)</summary>

```css
--iimm-vtk-toolbar-separator-color: rgba(255, 255, 255, 0.2);
--iimm-vtk-toolbar-separator-size: 1px;
--iimm-vtk-toolbar-separator-height: 20px;
--iimm-vtk-toolbar-separator-margin: 0 4px;
```
</details>

<details>
<summary>Click to expand: Extension Area Variables (8)</summary>

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
<summary>Click to expand: Info Panel Variables (7)</summary>

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
<summary>Click to expand: Popup Box Variables (9)</summary>

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
<summary>Click to expand: Input Box Variables (7)</summary>

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
<summary>Click to expand: Slider Variables (3)</summary>

```css
--iimm-vtk-slider-track-bg: var(--iimm-vtk-color-slider-track);
--iimm-vtk-slider-thumb-bg: var(--iimm-vtk-color-slider-thumb);
--iimm-vtk-slider-thumb-size: 12px;
```
</details>

<details>
<summary>Click to expand: Transition Animation Variables (3)</summary>

```css
--iimm-vtk-transition-fast: 0.15s ease;
--iimm-vtk-transition-normal: 0.25s ease;
--iimm-vtk-transition-slow: 0.35s cubic-bezier(0.4, 0, 0.2, 1);
```
</details>

<details>
<summary>Click to expand: Z-index Layer Variables (7)</summary>

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
<summary>Click to expand: Loading Indicator Variables (15)</summary>

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
<summary>Click to expand: Error Notification Variables (11)</summary>

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
<summary>Click to expand: Extra Toggle Button Variables (8)</summary>

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
<summary>Click to expand: Portal Panel Variables (10)</summary>

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
<summary>Click to expand: Scene Tree Panel Variables (18)</summary>

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

#### 7.2.3 Methods to Override CSS Variables

**Method 1: Global Override (Affects all VtkViewer instances)**

Override variables in the global CSS file:

```css
/* Global override for dark theme */
.iimm-vtk-theme-dark {
  --iimm-vtk-toolbar-bg: rgba(0, 0, 0, 0.9) !important;
  --iimm-vtk-btn-color: #ff0000 !important;
}

/* Global override for light theme */
.iimm-vtk-theme-light {
  --iimm-vtk-toolbar-bg: #ffffff !important;
  --iimm-vtk-btn-color: #333333 !important;
}
```

**Method 2: Local Override (Only affects specific instance)**

Override variables in component styles:

```vue
<template>
  <div class="my-viewer-container">
    <VtkViewer theme="dark" />
  </div>
</template>

<style scoped>
.my-viewer-container {
  /* Only affects VtkViewer within this container */
  --iimm-vtk-toolbar-bg: rgba(0, 0, 0, 0.95);
  --iimm-vtk-btn-color: #00ff00;
}
</style>
```

**Method 3: Dynamic Modification via JavaScript**

```typescript
// Get the DOM element of the VtkViewer container
const viewerContainer = document.querySelector('.iimm-vtk-viewer')

// Dynamically modify CSS variables
viewerContainer.style.setProperty('--iimm-vtk-toolbar-bg', 'rgba(255, 0, 0, 0.8)')
viewerContainer.style.setProperty('--iimm-vtk-btn-color', '#ffffff')
```

#### 7.2.4 Theme Class Names

VtkViewer automatically adds the corresponding theme class name to the root element based on the current theme:

| Theme ID | Theme Class Name |
|----------|------------------|
| `light` | `.iimm-vtk-theme-light` |
| `dark` | `.iimm-vtk-theme-dark` |
| `ocean` | `.iimm-vtk-theme-ocean` |
| `forest` | `.iimm-vtk-theme-forest` |
| `sunset` | `.iimm-vtk-theme-sunset` |
| Custom theme | `.iimm-vtk-theme-{themeId}` |

#### 7.2.5 Example: Creating a Custom Theme Style

```css
/* Create purple theme */
.iimm-vtk-theme-purple {
  /* Toolbar */
  --iimm-vtk-toolbar-bg: rgba(60, 20, 80, 0.9);
  --iimm-vtk-toolbar-border-color: rgba(200, 100, 255, 0.2);
  
  /* Buttons */
  --iimm-vtk-btn-bg: rgba(200, 100, 255, 0.1);
  --iimm-vtk-btn-bg-hover: rgba(200, 100, 255, 0.2);
  --iimm-vtk-btn-bg-active: rgba(200, 100, 255, 0.3);
  --iimm-vtk-btn-color: #d8a8ff;
  --iimm-vtk-btn-color-hover: #eca8ff;
  --iimm-vtk-btn-color-active: #c070ff;
  
  /* Info panel */
  --iimm-vtk-info-panel-bg: rgba(60, 20, 80, 0.9);
  --iimm-vtk-info-panel-label-color: rgba(200, 100, 255, 0.6);
  --iimm-vtk-info-panel-value-color: rgba(200, 100, 255, 0.95);
  
  /* Other variables... */
}
```

Then use it in the Vue component:

```vue
<template>
  <VtkViewer 
    theme="purple" 
    :custom-themes="{
      purple: {
        id: 'purple',
        name: 'Purple Theme',
        isDark: true,
        colors: { /* Color configuration */ }
      }
    }" 
  />
</template>
```

---

## 8. More Resources

- [VTK.js Official Documentation](https://vtk.org/vtk-js/)
- [GitHub Repository](https://github.com/liudichen/vtkviewer-vue)

## 9. Contributing

Issues and Pull Requests are welcome!

## 10. License

MIT License - See [LICENSE](LICENSE) file for details.
