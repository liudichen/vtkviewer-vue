/**
 * 事件总线
 * 支持插件间事件通信
 */

export type EventCallback = (...args: any[]) => void

/**
 * 查看器事件数据映射
 * 为已知事件提供类型安全的数据约束
 */
export interface ViewerEventMap {
  'scene:loaded': { format: string; filename?: string; supportsColorBy?: boolean }
  'scene:cleared': void
  'render:start': void
  'render:end': void
  'interaction:toolChanged': { tool: string; enabled: boolean }
  'measurement:start': void
  'measurement:complete': void
  'measurement:clear': void
  'animation:play': void
  'animation:pause': void
  'volume:presetChanged': void
  'colorBy:arrayChanged': { arrayName: string }
  'performance:update': void
  'plugins:initialized': void
  'keyBinding:registry-ready': void
  'error:occurred': void
  'error:cleared': void
  'webgl:contextLost': void
  'webgl:contextRestored': void
  'memory:pressureChanged': void
  'memory:cleanup': void
  'file:load': File
  'files:load': File[]
  'reset:start': any
  'reset:complete': any
  'camera:saved': void
  'camera:restored': void
  [key: string]: any
}

/**
 * 事件总线接口
 * 提供事件的注册、注销、触发能力
 * 已知事件自动获得类型约束，未知事件保持 any 兼容性
 */
export interface EventBus {
  /** 监听事件 */
  on<K extends keyof ViewerEventMap>(event: K, callback: (data: ViewerEventMap[K]) => void): void
  on(event: string, callback: EventCallback): void
  /** 取消监听 */
  off<K extends keyof ViewerEventMap>(event: K, callback: (data: ViewerEventMap[K]) => void): void
  off(event: string, callback: EventCallback): void
  /** 触发事件 */
  emit<K extends keyof ViewerEventMap>(event: K, data?: ViewerEventMap[K]): void
  emit(event: string, data?: any): void
  /** 监听一次 */
  once<K extends keyof ViewerEventMap>(event: K, callback: (data: ViewerEventMap[K]) => void): void
  once(event: string, callback: EventCallback): void
}

/**
 * 事件总线实现
 */
export class EventBusImpl implements EventBus {
  private listeners = new Map<string, Set<EventCallback>>()

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
  }

  off(event: string, callback: EventCallback): void {
    this.listeners.get(event)?.delete(callback)
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(data)
        } catch (error) {
          console.error(`[EventBus] Error in event handler for "${event}":`, error)
        }
      }
    }
  }

  once(event: string, callback: EventCallback): void {
    const wrapper: EventCallback = (...args) => {
      this.off(event, wrapper)
      callback(...args)
    }
    this.on(event, wrapper)
  }

  /** 清除所有监听器 */
  clear(): void {
    this.listeners.clear()
  }
}
