/**
 * 统一状态管理器
 * 支持核心状态固定域 + 插件动态状态注册
 */

import { reactive, readonly, type DeepReadonly } from 'vue'

import { i18n } from './I18nManager'

/** 加载状态 */
export interface LoadingState {
  isLoading: boolean
  progress: number
  stage: string
  /** 正在解析的文件大小（字节），0 表示未知 */
  fileSize?: number
}

/** 错误状态 */
export interface ErrorState {
  hasError: boolean
  message: string
  severity: 'warning' | 'error' | 'fatal'
  recoverable: boolean
}

/** 查看器状态 */
export interface ViewerState {
  isReady: boolean
  isRendering: boolean
  isContextLost: boolean
}

/** 状态注册描述符 */
export interface StateDescriptor<T = any> {
  key: string
  initialValue: T
  validator?: (value: T) => boolean
}

/** 插件状态注册表 */
export interface PluginStateRegistry {
  /** 注册插件状态 */
  register<T>(pluginId: string, descriptor: StateDescriptor<T>): void
  /** 获取插件状态 */
  get<T>(pluginId: string, key: string): T | undefined
  /** 设置插件状态 */
  set<T>(pluginId: string, key: string, value: T): void
  /** 注销插件的所有状态 */
  unregister(pluginId: string): void
}

/**
 * 状态管理器接口
 */
export interface IStateManager {
  /** 核心状态（只读） */
  readonly core: {
    readonly loading: DeepReadonly<LoadingState>
    readonly error: DeepReadonly<ErrorState>
    readonly viewer: DeepReadonly<ViewerState>
  }
  /** 插件状态注册表 */
  readonly pluginStates: PluginStateRegistry
  /** 更新加载状态 */
  setLoading(state: Partial<LoadingState>): void
  /** 更新错误状态 */
  setError(state: Partial<ErrorState>): void
  /** 清除错误 */
  clearError(): void
  /** 更新查看器状态 */
  setViewerState(state: Partial<ViewerState>): void
}

/**
 * 插件状态注册表实现
 */
class PluginStateRegistryImpl implements PluginStateRegistry {
  private states = new Map<string, Map<string, any>>()

  register<T>(pluginId: string, descriptor: StateDescriptor<T>): void {
    if (!this.states.has(pluginId)) {
      this.states.set(pluginId, new Map())
    }
    const pluginStates = this.states.get(pluginId)!
    if (pluginStates.has(descriptor.key)) {
      console.warn(
        `[StateManager] ${i18n.translate('vtkviewer.state.pluginStateAlreadyRegistered')}: ${pluginId}:${descriptor.key}"`
      )
      return
    }
    pluginStates.set(descriptor.key, reactive({ value: descriptor.initialValue }))
  }

  get<T>(pluginId: string, key: string): T | undefined {
    const state = this.states.get(pluginId)?.get(key)
    return state?.value as T | undefined
  }

  set<T>(pluginId: string, key: string, value: T): void {
    const state = this.states.get(pluginId)?.get(key)
    if (!state) {
      console.warn(
        `[StateManager] ${i18n.translate('vtkviewer.state.pluginStateNotFound')}: ${pluginId}:${key}"`
      )
      return
    }
    state.value = value
  }

  unregister(pluginId: string): void {
    this.states.delete(pluginId)
  }
}

/**
 * 状态管理器实现
 */
export class StateManagerImpl implements IStateManager {
  private loadingState = reactive<LoadingState>({
    isLoading: false,
    progress: 0,
    stage: 'idle'
  })

  private errorState = reactive<ErrorState>({
    hasError: false,
    message: '',
    severity: 'error',
    recoverable: true
  })

  private viewerState = reactive<ViewerState>({
    isReady: false,
    isRendering: false,
    isContextLost: false
  })

  private pluginStateRegistry = new PluginStateRegistryImpl()

  readonly core = {
    loading: readonly(this.loadingState),
    error: readonly(this.errorState),
    viewer: readonly(this.viewerState)
  }

  readonly pluginStates = this.pluginStateRegistry

  setLoading(state: Partial<LoadingState>): void {
    Object.assign(this.loadingState, state)
  }

  setError(state: Partial<ErrorState>): void {
    Object.assign(this.errorState, { hasError: true, ...state })
  }

  clearError(): void {
    Object.assign(this.errorState, {
      hasError: false,
      message: '',
      severity: 'error',
      recoverable: true
    })
  }

  setViewerState(state: Partial<ViewerState>): void {
    Object.assign(this.viewerState, state)
  }
}
