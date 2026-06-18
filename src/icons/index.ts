/**
 * IIMM VTK Viewer - Icon Mappings
 * Uses local SVG files for offline availability
 */

/// <reference types="vite/client" />

import { defineComponent, h, type Component } from 'vue'

// 使用 Vite 的 import 语法加载 SVG 文件
const svgModules = import.meta.glob('./svg/*.svg', { query: '?raw', eager: true }) as Record<string, { default: string }>

// SVG 文件缓存
const svgCache = new Map<string, string>()

// 加载本地 SVG 文件
function loadSvgIcon(name: string): string {
  if (svgCache.has(name)) {
    return svgCache.get(name)!
  }
  
  const svgPath = `./svg/${name}.svg`
  const module = svgModules[svgPath]
  
  if (module) {
    const svgContent = module.default
    svgCache.set(name, svgContent)
    return svgContent
  }
  
  console.warn(`SVG icon not found: ${name}`)
  return ''
}

/** Create an SVG icon component */
function createIcon(svgFileName: string): Component {
  const svgContent = loadSvgIcon(svgFileName)
  
  return defineComponent({
    name: `Icon_${svgFileName}`,
    props: {
      size: {
        type: [Number, String],
        default: 24
      },
      color: {
        type: String,
        default: 'currentColor'
      }
    },
    setup(props) {
      return () => {
        if (!svgContent) return null
        
        // 将 SVG 字符串转换为 VNode
        return h('span', {
          class: 'svg-icon',
          innerHTML: svgContent
            .replace(/width="[^"]*"/, `width="${props.size}"`)
            .replace(/height="[^"]*"/, `height="${props.size}"`)
            .replace(/fill="[^"]*"/, `fill="${props.color}"`)
        })
      }
    }
  })
}

// ---- Core toolbar icons ----
export const RotateIcon = createIcon('rotate-right')
export const ZoomIcon = createIcon('magnify-plus')
export const PanIcon = createIcon('arrow-all')
export const CenterModelIcon = createIcon('crosshairs')
export const ResetIcon = createIcon('refresh')
export const UnloadIcon = createIcon('delete-outline')

// ---- View toolbar icons ----
export const ScreenshotIcon = createIcon('camera-outline')
export const FullscreenIcon = createIcon('fullscreen')
export const FullscreenExitIcon = createIcon('fullscreen-exit')
export const AxesIcon = createIcon('axis-arrow')
export const AxesDisplayIcon = createIcon('compass')
export const AxesBothIcon = createIcon('axis-arrow-info')
export const BackgroundColorIcon = createIcon('palette-outline')
export const ViewSelectIcon = createIcon('eye-outline')
export const RenderStyleIcon = createIcon('view-dashboard-outline')
export const RenderGridIcon = createIcon('grid')
export const ClippingIcon = createIcon('scissors-cutting')
export const SaveCameraIcon = createIcon('folder-check-outline')
export const RestoreCameraIcon = createIcon('folder-open-outline')
export const LightIntensityIcon = createIcon('weather-sunny')

// ---- Render style state icons ----
export const SurfaceIcon = createIcon('cube-outline')
export const WireframeIcon = createIcon('axis-arrow-info')
export const PointIcon = createIcon('dots-grid')

// ---- Measurement icons ----
export const MeasurementDistanceIcon = createIcon('ruler')
export const MeasurementAngleIcon = createIcon('angle-acute')
export const MeasurementPointIcon = createIcon('map-marker-outline')

// ---- Animation icons ----
export const PlayIcon = createIcon('play')
export const PauseIcon = createIcon('pause')

// ---- Performance icons ----
export const PerformanceIcon = createIcon('speedometer')

// ---- Volume icons ----
export const VolumeIcon = createIcon('cube-scan')

// ---- ColorBy icons ----
export const ColorByIcon = createIcon('palette')

// ---- Render precision icons ----
export const RenderPrecisionIcon = createIcon('quality-high')

// ---- Theme switch icons ----
export const ThemeSwitchIcon = createIcon('palette-swatch-outline')

// ---- Status icons ----
export const CheckIcon = createIcon('check')
export const ErrorIcon = createIcon('alert-circle-outline')
export const WarningIcon = createIcon('alert-outline')
export const InfoIcon = createIcon('information-outline')

// ---- Action icons ----
export const DeleteIcon = createIcon('delete-outline')

// ---- Bookmark toolbar icons ----
export const BookmarkIcon = createIcon('bookmark-outline')
export const BookmarkFilledIcon = createIcon('bookmark')
export const BookmarkAddIcon = createIcon('bookmark-plus-outline')
export const BookmarkListIcon = createIcon('bookmark-multiple-outline')

// ---- Screenshot icons ----
export const ScreenshotHiResIcon = createIcon('camera-plus-outline')
export const ScreenshotWebpIcon = createIcon('file-image-outline')

// ---- Load Model icons ----
export const LoadModelIcon = createIcon('file-import-outline')

// ---- Scene Tree icons ----
export const SceneTreeIcon = createIcon('layers-outline')
