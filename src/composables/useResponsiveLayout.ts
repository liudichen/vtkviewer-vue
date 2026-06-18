/**
 * useResponsiveLayout 组合式函数
 * 提供响应式断点检测和布局适配
 */

import { ref, computed, onMounted, onUnmounted, watch, readonly, type Ref } from 'vue'

export interface Breakpoint {
  name: string
  minWidth: number
  maxWidth?: number
}

export interface ResponsiveConfig {
  /** 断点定义 */
  breakpoints?: Breakpoint[]
  /** 是否启用响应式 */
  enabled?: boolean
  /** 工具栏折叠阈值 */
  toolbarCollapseThreshold?: number
  /** 紧凑模式阈值 */
  compactModeThreshold?: number
}

/**
 * useResponsiveLayout 组合式函数
 * 提供响应式断点检测和布局适配
 */
export function useResponsiveLayout(
  containerRef: Ref<HTMLElement | null>,
  config: ResponsiveConfig = {}
) {
  const {
    breakpoints = [
      { name: 'xs', minWidth: 0, maxWidth: 575 },
      { name: 'sm', minWidth: 576, maxWidth: 767 },
      { name: 'md', minWidth: 768, maxWidth: 991 },
      { name: 'lg', minWidth: 992, maxWidth: 1199 },
      { name: 'xl', minWidth: 1200 }
    ],
    enabled = true,
    toolbarCollapseThreshold = 768,
    compactModeThreshold = 576
  } = config

  // 状态
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)
  const containerWidth = ref(0)
  const containerHeight = ref(0)
  const currentBreakpoint = ref<string>('lg')
  const isCompactMode = ref(false)
  const isToolbarCollapsed = ref(false)

  // ResizeObserver实例
  let resizeObserver: ResizeObserver | null = null

  // 计算属性
  const isMobile = computed(
    () => currentBreakpoint.value === 'xs' || currentBreakpoint.value === 'sm'
  )
  const isTablet = computed(() => currentBreakpoint.value === 'md')
  const isDesktop = computed(
    () => currentBreakpoint.value === 'lg' || currentBreakpoint.value === 'xl'
  )

  const orientation = computed(() =>
    containerWidth.value > containerHeight.value ? 'landscape' : 'portrait'
  )

  const aspectRatio = computed(() => containerWidth.value / containerHeight.value)

  /**
   * 更新断点
   */
  const updateBreakpoint = (): void => {
    const width = windowWidth.value

    // 找到匹配的断点
    const matched = breakpoints
      .sort((a, b) => b.minWidth - a.minWidth)
      .find(bp => width >= bp.minWidth && (bp.maxWidth === undefined || width <= bp.maxWidth))

    if (matched) {
      currentBreakpoint.value = matched.name
    }

    // 更新紧凑模式
    isCompactMode.value = width < compactModeThreshold

    // 更新工具栏折叠状态
    isToolbarCollapsed.value = width < toolbarCollapseThreshold
  }

  /**
   * 更新容器尺寸
   */
  const updateContainerSize = (): void => {
    if (containerRef.value) {
      const rect = containerRef.value.getBoundingClientRect()
      containerWidth.value = rect.width
      containerHeight.value = rect.height
    }
  }

  /**
   * 窗口大小变化处理
   */
  const handleResize = (): void => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
    updateBreakpoint()
    updateContainerSize()
  }

  /**
   * 设置ResizeObserver
   */
  const setupResizeObserver = (): void => {
    if (!enabled || !containerRef.value) return

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
        containerHeight.value = entry.contentRect.height
        updateBreakpoint()
      }
    })

    resizeObserver.observe(containerRef.value)
  }

  /**
   * 清理ResizeObserver
   */
  const cleanupResizeObserver = (): void => {
    if (resizeObserver) {
      resizeObserver.disconnect()
      resizeObserver = null
    }
  }

  /**
   * 获取响应式类名
   */
  const getResponsiveClasses = (): string[] => {
    const classes = [`breakpoint-${currentBreakpoint.value}`, `orientation-${orientation.value}`]

    if (isCompactMode.value) {
      classes.push('compact-mode')
    }

    if (isToolbarCollapsed.value) {
      classes.push('toolbar-collapsed')
    }

    if (isMobile.value) {
      classes.push('mobile')
    } else if (isTablet.value) {
      classes.push('tablet')
    } else {
      classes.push('desktop')
    }

    return classes
  }

  /**
   * 获取响应式样式
   */
  const getResponsiveStyles = (): Record<string, string> => {
    const styles: Record<string, string> = {}

    // 根据屏幕尺寸调整字体大小
    if (isMobile.value) {
      styles['--viewer-font-size'] = '12px'
      styles['--viewer-toolbar-size'] = '32px'
    } else if (isTablet.value) {
      styles['--viewer-font-size'] = '13px'
      styles['--viewer-toolbar-size'] = '36px'
    } else {
      styles['--viewer-font-size'] = '14px'
      styles['--viewer-toolbar-size'] = '40px'
    }

    // 根据宽高比调整布局
    if (aspectRatio.value > 1.5) {
      styles['--viewer-layout-direction'] = 'row'
    } else {
      styles['--viewer-layout-direction'] = 'column'
    }

    return styles
  }

  /**
   * 计算工具栏位置
   */
  const getToolbarPosition = (): { position: string; alignment: string } => {
    if (isMobile.value) {
      return { position: 'bottom', alignment: 'center' }
    } else if (isTablet.value) {
      return { position: 'right', alignment: 'top' }
    } else {
      return { position: 'top', alignment: 'left' }
    }
  }

  /**
   * 计算面板位置
   */
  const getPanelPosition = (panelType: string): { position: string; size: string } => {
    if (isMobile.value) {
      return { position: 'bottom', size: '50%' }
    } else if (isTablet.value) {
      return { position: 'right', size: '30%' }
    } else {
      switch (panelType) {
        case 'measurement':
          return { position: 'right', size: '250px' }
        case 'animation':
          return { position: 'bottom', size: '120px' }
        default:
          return { position: 'right', size: '300px' }
      }
    }
  }

  // 生命周期
  onMounted(() => {
    if (enabled) {
      window.addEventListener('resize', handleResize)
      setupResizeObserver()
      updateBreakpoint()
      updateContainerSize()
    }
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
    cleanupResizeObserver()
  })

  // 监听容器变化
  watch(containerRef, (newRef, oldRef) => {
    if (oldRef) {
      cleanupResizeObserver()
    }
    if (newRef) {
      setupResizeObserver()
      updateContainerSize()
    }
  })

  return {
    // 状态
    windowWidth: readonly(windowWidth),
    windowHeight: readonly(windowHeight),
    containerWidth: readonly(containerWidth),
    containerHeight: readonly(containerHeight),
    currentBreakpoint: readonly(currentBreakpoint),
    isCompactMode: readonly(isCompactMode),
    isToolbarCollapsed: readonly(isToolbarCollapsed),

    // 计算属性
    isMobile,
    isTablet,
    isDesktop,
    orientation,
    aspectRatio,

    // 方法
    updateBreakpoint,
    updateContainerSize,
    getResponsiveClasses,
    getResponsiveStyles,
    getToolbarPosition,
    getPanelPosition
  }
}
