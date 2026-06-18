/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-13 18:10:46
 * @LastEditTime: 2026-06-13 21:48:05
 * @Description:
 */
/**
 * I18nManager - 国际化翻译单例管理器
 *
 * 作为 ViewerContext.i18n 的底层实现，提供：
 *   1. 全局单一数据源（currentLocale ref）
 *   2. 命令式翻译 API（非 Vue 上下文：工具函数、异常、日志、DOM 操作）
 *   3. 响应式翻译 API（Vue 组件/render 函数：locale 变化时自动更新）
 *   4. 可变的外部翻译函数注入（由 VtkViewer.vue 根据 props.t 动态设置）
 *
 * 翻译优先级链：
 *   外部注入的 t(key) > 当前 locale 内置包 > 默认 locale 内置包 > key 自身
 *
 * @module core/I18nManager
 */

import { ref, computed, type Ref, type ComputedRef } from 'vue'

import { BUILTIN_LANGS } from '@/configs'

// ============================================================
// 类型定义
// ============================================================

/**
 * i18n 翻译函数签名。
 * 与 vue-i18n / i18next / react-intl 的 t() 签名兼容。
 *
 * @param key 翻译 key
 * @returns 翻译后的字符串；未找到对应 key 时返回 key 自身
 */
export type I18nTranslateFunction = (key: string) => string

/** 语言选项（对应 UI 下拉菜单中的语言条目） */
export interface LanguageOption {
  id: string
  label: string
}

// ============================================================
// I18nManager 类
// ============================================================

const DEFAULT_LOCALE = 'zh'

export class I18nManager {
  // ---- 响应式状态 ----

  /** 当前语言（单一数据源） */
  readonly currentLocale: Ref<string> = ref(DEFAULT_LOCALE)

  /**
   * 翻译状态变更版号。
   * _externalT / _packs 不是响应式的，通过此 ref 让 computed 感知它们的变化。
   * 每次 setExternalTranslator() 或 registerLocale() 时递增。
   */
  private _stateVersion = ref(0)

  // ---- 非响应式状态 ----

  /** 外部注入的翻译函数（null = 无外部注入，走内置包） */
  private _externalT: I18nTranslateFunction | null = null

  /** 语言包注册表（locale → { key → value }） */
  private _packs: Record<string, Record<string, string>> = {}

  /**
   * 默认语言标识。
   * 由 VtkViewer 根据 props.locale 设置；未传 props.locale 时为 'zh'。
   * 用于 reset 操作恢复初始语言。
   */
  private _defaultLocale: string = DEFAULT_LOCALE

  /** UI 语言选项列表（下拉菜单可用语言） */
  private _languageOptions: LanguageOption[] = [
    { id: 'zh', label: '中文' },
    { id: 'en', label: 'English' }
  ]

  /** locale 变更回调列表 */
  private _localeCallbacks: Array<(locale: string) => void> = []

  /** 是否已销毁 */
  private _disposed = false

  constructor() {
    // 注册内置语言包
    for (const locale of Object.keys(BUILTIN_LANGS)) {
      this._packs[locale] = { ...BUILTIN_LANGS[locale] }
    }
  }

  // ---- 公共方法 ----

  /**
   * 设置/清除外部翻译函数。
   *
   * - 传入函数：后续 translate() 优先调用此函数
   * - 传入 null：清除外部函数，完全回退内置包
   *
   * 外部函数的约定：
   * - 找到翻译 → 返回翻译后的字符串
   * - 未找到   → 返回 key 自身（不要返回 '' 或 undefined）
   */
  setExternalTranslator(fn: I18nTranslateFunction | null): void {
    if (this._disposed) return
    if (fn === this._externalT) return
    this._externalT = fn
    this._stateVersion.value++
  }

  /**
   * 命令式翻译快照。
   *
   * 每次调用返回当前 locale 下的翻译结果。
   * 适用场景：非 Vue 上下文（工具函数、throw Error、console、DOM 操作）。
   *
   * @param key 翻译 key
   * @returns 翻译后的字符串
   */
  translate(key: string): string {
    // 读取 _stateVersion 和 currentLocale，让 Vue render effect 自动追踪所有状态变更
    void this._stateVersion.value
    return this._lookup(key)
  }

  /**
   * 响应式翻译 computed。
   *
   * 返回 ComputedRef，在 Vue 的 computed/render 函数中使用时
   * 自动追踪 currentLocale 变化，locale 切换后自动重求值。
   *
   * 适用场景：Vue render 函数、computed 属性、模板绑定。
   *
   * @param key 翻译 key
   * @returns ComputedRef<string>
   */
  t(key: string): ComputedRef<string> {
    return computed(() => {
      // 追踪所有翻译相关状态变更（locale / externalT / packs）
      void this._stateVersion.value
      return this._lookup(key)
    })
  }

  /**
   * 切换语言，触发所有响应式依赖更新。
   * 同时同步通知 onLocaleChanged 注册的回调。
   */
  setLocale(locale: string): void {
    if (this._disposed) return
    if (locale === this.currentLocale.value) return

    this.currentLocale.value = locale
    this._stateVersion.value++

    for (const cb of this._localeCallbacks) {
      try {
        cb(locale)
      } catch (err) {
        console.error('[I18nManager] Error in locale change callback:', err)
      }
    }
  }

  /**
   * 设置默认语言（由 VtkViewer 根据 props.locale 调用）。
   * 只记录默认值，不切换当前语言。
   */
  setDefaultLocale(locale: string): void {
    this._defaultLocale = locale
  }

  /**
   * 重置到默认语言。
   * 由 LanguageSwitchPlugin 响应 ResetManager 或类似重置操作时调用。
   */
  resetLocale(): void {
    this.setLocale(this._defaultLocale)
  }

  /** 注册/覆盖语言包 */
  registerLocale(locale: string, pack: Record<string, string>): void {
    if (this._disposed) return
    this._packs[locale] = { ...this._packs[locale], ...pack }
    this._stateVersion.value++
  }

  /** 获取已注册的语言包 locale 列表 */
  getAvailableLocales(): string[] {
    return Object.keys(this._packs).sort()
  }

  /**
   * 设置 UI 语言选项列表（下拉菜单中显示的语言条目）。
   * 传入空数组或不传则重置为内置默认 zh/en。
   */
  setLanguageOptions(opts?: LanguageOption[]): void {
    if (this._disposed) return
    if (!opts || opts.length === 0) {
      this._languageOptions = [
        { id: 'zh', label: '中文' },
        { id: 'en', label: 'English' }
      ]
      return
    }
    this._languageOptions = [...opts]
    this._stateVersion.value++
  }

  /** 获取 UI 语言选项列表 */
  getLanguageOptions(): LanguageOption[] {
    return this._languageOptions
  }

  /**
   * 注册 locale 变更回调。
   * 与 EventBus 不同，此回调不经过事件总线，
   * 直接在 currentLocale ref 变化时同步触发。
   *
   * @returns 取消注册函数
   */
  onLocaleChanged(callback: (locale: string) => void): () => void {
    this._localeCallbacks.push(callback)
    return () => {
      const idx = this._localeCallbacks.indexOf(callback)
      if (idx !== -1) this._localeCallbacks.splice(idx, 1)
    }
  }

  /** 销毁实例，释放回调引用（测试/多实例场景） */
  dispose(): void {
    this._disposed = true
    this._externalT = null
    this._localeCallbacks = []
  }

  // ---- 内部方法 ----

  /**
   * 翻译查找核心逻辑。
   *
   * 优先级链：
   *   1. 外部注入的 t(key)      — 不返回 key 自身 → 使用
   *   2. currentLocale 内置包    — key 存在          → 使用
   *   3. 默认 locale (zh) 内置包 — key 存在          → 使用
   *   4. key 自身               — fallback          → 返回 key
   */
  private _lookup(key: string): string {
    // 第 1 层：外部注入的翻译函数
    if (this._externalT) {
      const result = this._externalT(key)
      // 判据：result !== key 且不是 undefined。
      // 外部 t() 未处理时会返回 key 自身（vue-i18n/i18next 标准行为）
      if (result !== key && result !== undefined) {
        return result
      }
    }

    // 第 2 层：当前 locale 内置包
    const currentPack = this._packs[this.currentLocale.value]
    if (currentPack?.[key] !== undefined) {
      return currentPack[key]
    }

    // 第 3 层：默认 locale 内置包
    const defaultPack = this._packs[DEFAULT_LOCALE]
    if (defaultPack?.[key] !== undefined) {
      return defaultPack[key]
    }

    // 第 4 层：返回 key 自身
    return key
  }
}

// ============================================================
// 全局单例
// ============================================================

let _instance: I18nManager | null = null

/**
 * 获取全局 I18nManager 单例。
 *
 * 默认场景（单一查看器实例）直接使用此函数。
 * 多实例场景可通过 new I18nManager() 创建独立实例。
 */
export function getI18nManager(): I18nManager {
  if (!_instance) {
    _instance = new I18nManager()
  }
  return _instance
}

/**
 * 便捷：全局单例的直接引用。
 *
 * 模块加载时即创建，可在任何 .ts 文件中直接 import 使用：
 *   import { i18n } from '../core/I18nManager'
 *   const text = i18n.translate('vtkviewer.plugin.rotate.name')
 */
export const i18n: I18nManager = getI18nManager()
