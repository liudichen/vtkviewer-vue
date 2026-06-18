/**
 * 键盘快捷键管理插件
 * 采用延迟收集模式，监听 plugins:initialized 事件后统一收集快捷键
 */

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import {
  PluginType,
  type KeyboardShortcutAction,
  type PluginConfig,
  type IServicePlugin
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** 快捷键注册项 */
interface KeyBindingEntry {
  id: string
  shortcut: KeyboardShortcutAction
  pluginId: string
}

/**
 * 快捷键注册表
 * 管理所有键盘快捷键的注册、冲突检测和执行
 */
export class KeyBindingRegistry {
  private bindings = new Map<string, KeyBindingEntry>()
  private keyMap = new Map<string, string>() // key → shortcutId

  /**
   * 构建快捷键的完整按键字符串（包含修饰键）
   * 字母键统一转为小写，避免 Caps Lock 导致不匹配
   */
  private buildShortcutKey(shortcut: KeyboardShortcutAction): string {
    const parts: string[] = []
    if (shortcut.ctrl) parts.push('Ctrl')
    if (shortcut.shift) parts.push('Shift')
    if (shortcut.alt) parts.push('Alt')
    // 单个字母键统一转小写
    const key = shortcut.key.length === 1 ? shortcut.key.toLowerCase() : shortcut.key
    parts.push(key)
    return parts.join('+')
  }

  /**
   * 注册快捷键
   */
  register(pluginId: string, shortcut: KeyboardShortcutAction): void {
    const fullKey = this.buildShortcutKey(shortcut)
    const id = `${pluginId}:${fullKey}`

    // 冲突检测（使用完整按键字符串，包含修饰键）
    const existing = this.keyMap.get(fullKey)
    if (existing) {
      console.warn(
        `[KeyBindingRegistry] Keyboard shortcut conflict: "${fullKey}" already bound to "${existing}"`
      )
    }

    this.bindings.set(id, { id, shortcut, pluginId })
    this.keyMap.set(fullKey, id)
  }

  /**
   * 注销插件的所有快捷键
   */
  unregisterPlugin(pluginId: string): void {
    for (const [id, entry] of this.bindings) {
      if (entry.pluginId === pluginId) {
        const fullKey = this.buildShortcutKey(entry.shortcut)
        this.keyMap.delete(fullKey)
        this.bindings.delete(id)
      }
    }
  }

  /**
   * 处理键盘事件
   */
  handleKeydown(event: KeyboardEvent): void {
    const key = this.buildKeyString(event)
    const shortcutId = this.keyMap.get(key)

    if (shortcutId) {
      const entry = this.bindings.get(shortcutId)
      if (entry?.shortcut.action) {
        event.preventDefault()
        entry.shortcut.action()
      }
    }
  }

  /**
   * 构建按键字符串
   * 字母键统一转为小写，避免 Caps Lock 导致不匹配
   */
  private buildKeyString(event: KeyboardEvent): string {
    const parts: string[] = []
    if (event.ctrlKey || event.metaKey) parts.push('Ctrl')
    if (event.shiftKey) parts.push('Shift')
    if (event.altKey) parts.push('Alt')
    // 单个字母键统一转小写
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    parts.push(key)
    return parts.join('+')
  }

  /**
   * 获取所有已注册的快捷键
   */
  getAll(): KeyBindingEntry[] {
    return Array.from(this.bindings.values())
  }

  /**
   * 检查快捷键是否已注册
   */
  has(key: string): boolean {
    return this.keyMap.has(key)
  }

  /**
   * 检查快捷键是否已注册（使用完整按键字符串）
   */
  hasShortcut(shortcut: KeyboardShortcutAction): boolean {
    const fullKey = this.buildShortcutKey(shortcut)
    return this.keyMap.has(fullKey)
  }

  /**
   * 清除所有快捷键
   */
  clear(): void {
    this.bindings.clear()
    this.keyMap.clear()
  }
}

/** 键盘快捷键插件配置 */
export interface KeyBindingPluginConfig extends PluginConfig {
  // 目前没有额外配置项
}

/**
 * 键盘快捷键管理插件
 * 采用延迟收集模式，在所有插件初始化完成后统一收集快捷键
 */
export class KeyBindingPlugin extends PluginBase<KeyBindingPluginConfig> implements IServicePlugin {
  readonly metadata = {
    id: 'keyBinding',
    name: 'KeyBindingPlugin',
    type: PluginType.SERVICE,
    description: i18n.translate('vtkviewer.plugin.keyBinding.description')
  }

  private registry = new KeyBindingRegistry()
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null

  protected onInit(): void {
    // 注册键盘事件监听（受 enableKeyboard 总开关控制）
    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.ctx.enableKeyboard.value) return
      this.registry.handleKeydown(e)
    }
    window.addEventListener('keydown', this.keydownHandler)

    // 延迟收集：监听所有插件初始化完成事件
    this.onEvent(BuiltinEvents.PLUGINS_INITIALIZED, () => {
      this.collectShortcuts()
    })

    // 通过事件暴露 registry 实例，供其他插件主动注册
    this.ctx.events.emit(BuiltinEvents.KEY_BINDING_REGISTRY_READY, this.registry)
  }

  /**
   * 获取快捷键注册表（供外部调用）
   */
  getRegistry(): KeyBindingRegistry {
    return this.registry
  }

  /**
   * 延迟收集所有工具栏插件的快捷键
   * 在所有插件初始化完成后执行
   */
  private collectShortcuts(): void {
    const plugins = this.ctx.plugins.getAll()
    let collectedCount = 0

    for (const plugin of plugins) {
      // 检查插件是否实现了 getKeyboardShortcutActions 方法
      if (
        'getKeyboardShortcutActions' in plugin &&
        typeof (plugin as any).getKeyboardShortcutActions === 'function'
      ) {
        const shortcuts = (plugin as any).getKeyboardShortcutActions() ?? []
        for (const shortcut of shortcuts) {
          this.registry.register(plugin.metadata.id, shortcut)
          collectedCount++
        }
      }
    }

    this.debugLog(
      `[${this.metadata.name}] ${i18n.translate('vtkviewer.plugin.keyBinding.collected')}: ${collectedCount} shortcuts from ${plugins.length} plugins`
    )
  }

  protected onDispose(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler)
      this.keydownHandler = null
    }
    this.registry.clear()
  }
}
