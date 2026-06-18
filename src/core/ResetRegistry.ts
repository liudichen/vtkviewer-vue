/**
 * 插件独立/条件性重置机制
 *
 * 设计目标：
 * 1. 插件可声明多个命名重置动作（ResetAction），每个动作有独立的作用域和条件
 * 2. 全局 resetAll 只执行 scope 包含 GLOBAL 的动作
 * 3. 任何插件或命令可通过 resetRegistry.invoke(pluginId, actionName) 精准触发
 * 4. 支持条件守卫：只有当条件满足时才执行重置
 * 5. 支持重置链：一个动作完成后可触发后续动作
 */

import type { PluginRegistry, IViewerPlugin } from '@/plugins'

import { i18n } from './I18nManager'
import type { EventBus } from './EventBus'
import { ResetLevel, type ResetContext, type ResetResult } from './ResetManager'

// ============================================================
// 1. 重置作用域
// ============================================================

/**
 * 重置作用域
 * 决定一个重置动作在哪些场景下被触发
 */
export enum ResetScope {
  /**
   * 全局作用域：参与 resetAll 流程
   * 典型场景：相机重置、工具状态恢复默认
   */
  GLOBAL = 'global',

  /**
   * 独立作用域：不参与 resetAll，只能被显式调用
   * 典型场景：清除测量数据、重置动画状态、重置特定 UI 面板
   */
  INDEPENDENT = 'independent',

  /**
   * 条件作用域：仅在条件满足时参与 resetAll
   * 典型场景：仅当模型已加载时才重置切割平面、仅当标注存在时才清除标注
   */
  CONDITIONAL = 'conditional'
}

// ============================================================
// 2. 重置动作定义
// ============================================================

/** 重置动作守卫条件 */
export interface ResetGuard {
  /**
   * 条件判断函数
   * 返回 true 表示允许执行重置，false 表示跳过
   */
  predicate: () => boolean

  /** 条件不满足时的跳过原因（用于日志） */
  skipReason?: string
}

/** 重置链配置 */
export interface ResetChain {
  /**
   * 当前动作完成后触发的目标动作列表
   * 格式: 'pluginId:actionName' 或 'pluginId'（触发该插件的 default action）
   */
  triggers: string[]

  /** 是否仅在当前动作成功时才触发链 */
  onlyOnSuccess?: boolean
}

/**
 * 单个重置动作定义
 * 插件通过 registerResetActions() 注册一个或多个动作
 */
export interface ResetAction {
  /** 动作名称（同一插件内唯一） */
  name: string

  /** 重置作用域 */
  scope: ResetScope

  /**
   * 执行函数
   * @param context 重置上下文
   */
  execute: (context: ResetContext) => void | Promise<void>

  /** 是否为该插件的默认重置动作（未指定 actionName 时调用） */
  isDefault?: boolean

  /** 作用域为 CONDITIONAL 时的守卫条件 */
  guard?: ResetGuard

  /** 重置链：完成后触发的后续动作 */
  chain?: ResetChain

  /** 优先级（数值小的先执行，默认 200） */
  priority?: number

  /** 人类可读描述（用于日志和调试） */
  description?: string
}

// ============================================================
// 3. 增强的可重置接口
// ============================================================

/**
 * 增强的可重置插件接口
 * 替代原 IResettable，支持多动作注册
 */
export interface IResettableActions {
  /**
   * 注册该插件的所有重置动作
   * 返回动作数组，由 ResetRegistry 统一索引
   */
  registerResetActions(): ResetAction[]
}

/**
 * 类型守卫：检查插件是否实现了 IResettableActions
 */
export function hasResetActions(
  plugin: IViewerPlugin
): plugin is IViewerPlugin & IResettableActions {
  return (
    'registerResetActions' in plugin && typeof (plugin as any).registerResetActions === 'function'
  )
}

// ============================================================
// 4. 重置动作索引条目
// ============================================================

/** 注册到 ResetRegistry 的动作条目 */
interface ResetActionEntry {
  /** 所属插件 ID */
  pluginId: string
  /** 动作定义 */
  action: ResetAction
  /** 全局唯一键: 'pluginId:actionName' */
  key: string
}

// ============================================================
// 5. 重置注册表
// ============================================================

/**
 * 重置注册表
 * 负责收集、索引、查询所有插件的重置动作
 *
 * 生命周期：
 *   1. 插件初始化时调用 collectActions() 收集所有动作
 *   2. ResetManager 通过此表按需查找和执行动作
 *   3. 插件卸载时自动移除其动作
 */
export class ResetRegistry {
  private actions = new Map<string, ResetActionEntry>()
  private pluginActions = new Map<string, Set<string>>()
  private eventBus: EventBus
  private pluginRegistry: PluginRegistry
  private collected = false

  constructor(eventBus: EventBus, pluginRegistry: PluginRegistry) {
    this.eventBus = eventBus
    this.pluginRegistry = pluginRegistry
  }

  // ============================================================
  // 收集与注册
  // ============================================================

  /**
   * 从所有已初始化插件中收集重置动作
   * 应在所有插件 initAll() 完成后调用
   */
  collectActions(): void {
    if (this.collected) return

    const plugins = this.pluginRegistry.getAll()
    for (const plugin of plugins) {
      this.registerPluginActions(plugin)
    }

    this.collected = true
    // console.debug(`[ResetRegistry] Collected ${this.actions.size} reset actions from ${this.pluginActions.size} plugins`)
  }

  /**
   * 注册单个插件的重置动作
   */
  private registerPluginActions(plugin: IViewerPlugin): void {
    if (!hasResetActions(plugin)) return

    const { id } = plugin.metadata
    const pluginKeys = new Set<string>()

    try {
      const actions = plugin.registerResetActions()
      for (const action of actions) {
        const key = `${id}:${action.name}`
        if (this.actions.has(key)) {
          console.warn(
            `[ResetRegistry] ${i18n.translate('vtkviewer.reset.duplicateAction')}: ${key}"`
          )
        }
        this.actions.set(key, { pluginId: id, action, key })
        pluginKeys.add(key)
      }
    } catch (error) {
      console.error(
        `[ResetRegistry] ${i18n.translate('vtkviewer.reset.failedToCollect')}: ${id}"`,
        error
      )
    }

    this.pluginActions.set(id, pluginKeys)
  }

  // ============================================================
  // 查询
  // ============================================================

  /**
   * 获取指定插件的所有重置动作
   */
  getActions(pluginId: string): ResetAction[] {
    const keys = this.pluginActions.get(pluginId)
    if (!keys) return []
    return Array.from(keys)
      .map(k => this.actions.get(k)?.action)
      .filter((a): a is ResetAction => a !== undefined)
  }

  /**
   * 获取指定插件的默认重置动作
   */
  getDefaultAction(pluginId: string): ResetAction | undefined {
    return this.getActions(pluginId).find(a => a.isDefault) ?? this.getActions(pluginId)[0]
  }

  /**
   * 通过 'pluginId:actionName' 键获取动作
   */
  getActionByKey(key: string): ResetActionEntry | undefined {
    return this.actions.get(key)
  }

  /**
   * 获取所有属于指定作用域的动作
   */
  getActionsByScope(scope: ResetScope): ResetActionEntry[] {
    return Array.from(this.actions.values()).filter(entry => entry.action.scope === scope)
  }

  /**
   * 获取所有参与全局重置的动作
   * 即 scope === GLOBAL，或 scope === CONDITIONAL 且守卫条件满足
   */
  getGlobalResetActions(): ResetActionEntry[] {
    return Array.from(this.actions.values()).filter(entry => {
      const { scope, guard } = entry.action
      if (scope === ResetScope.GLOBAL) return true
      if (scope === ResetScope.CONDITIONAL && guard) {
        try {
          return guard.predicate()
        } catch {
          return false
        }
      }
      return false
    })
  }

  /**
   * 检查插件是否有注册的重置动作
   */
  hasActions(pluginId: string): boolean {
    const keys = this.pluginActions.get(pluginId)
    return keys !== undefined && keys.size > 0
  }

  /**
   * 获取所有已注册的插件 ID
   */
  getRegisteredPluginIds(): string[] {
    return Array.from(this.pluginActions.keys())
  }

  // ============================================================
  // 执行
  // ============================================================

  /**
   * 执行指定插件的指定动作
   * @param pluginId 插件 ID
   * @param actionName 动作名称（省略则使用默认动作）
   * @param level 重置级别
   * @param source 触发来源
   */
  async invoke(
    pluginId: string,
    actionName?: string,
    level: ResetLevel = ResetLevel.SOFT,
    source: string = 'direct'
  ): Promise<ResetResult> {
    // 查找动作
    let entry: ResetActionEntry | undefined
    if (actionName) {
      entry = this.getActionByKey(`${pluginId}:${actionName}`)
    } else {
      const defaultAction = this.getDefaultAction(pluginId)
      if (defaultAction) {
        entry = { pluginId, action: defaultAction, key: `${pluginId}:${defaultAction.name}` }
      }
    }

    if (!entry) {
      return {
        pluginId,
        success: false,
        duration: 0,
        error: new Error(
          actionName
            ? `${i18n.translate('vtkviewer.reset.actionNotFound')}: ${pluginId}:${actionName}"`
            : `${i18n.translate('vtkviewer.reset.noActionsRegistered')}: ${pluginId}"`
        )
      }
    }

    return this.executeAction(entry, level, source)
  }

  /**
   * 批量执行指定作用域的所有动作
   */
  async invokeByScope(
    scope: ResetScope,
    level: ResetLevel = ResetLevel.SOFT,
    source: string = 'scope'
  ): Promise<ResetResult[]> {
    const entries = this.getActionsByScope(scope)
    const results: ResetResult[] = []

    for (const entry of entries) {
      const result = await this.executeAction(entry, level, source)
      results.push(result)
    }

    return results
  }

  // ============================================================
  // 内部实现
  // ============================================================

  /**
   * 执行单个重置动作（含条件守卫、链式触发）
   */
  private async executeAction(
    entry: ResetActionEntry,
    level: ResetLevel,
    source: string,
    depth: number = 0
  ): Promise<ResetResult> {
    const { action, pluginId } = entry
    const startTime = performance.now()

    // 条件守卫检查
    if (action.guard) {
      try {
        if (!action.guard.predicate()) {
          const reason =
            action.guard.skipReason ?? i18n.translate('vtkviewer.reset.guardConditionNotMet')

          console.warn(`[ResetRegistry] Skipping "${entry.key}": ${reason}`)

          return { pluginId, success: true, duration: 0 }
        }
      } catch (error) {
        console.error(
          `[ResetRegistry] ${i18n.translate('vtkviewer.reset.guardCheckFailed')}: ${entry.key}"`,
          error
        )
        return {
          pluginId,
          success: false,
          duration: 0,
          error: error instanceof Error ? error : new Error(String(error))
        }
      }
    }

    // 构建上下文
    const context: ResetContext = {
      level,
      source: `${source}:${entry.key}`,
      timestamp: Date.now()
    }

    // 广播单个动作开始事件
    this.eventBus.emit('reset:actionStart', { key: entry.key, pluginId, action: action.name })

    try {
      await Promise.resolve(action.execute(context))

      const duration = performance.now() - startTime
      // console.debug(`[ResetRegistry] "${entry.key}" completed in ${duration.toFixed(2)}ms`)

      // 广播单个动作完成事件
      this.eventBus.emit('reset:actionComplete', {
        key: entry.key,
        pluginId,
        success: true,
        duration
      })

      // 链式触发
      if (action.chain && depth < 10) {
        // 防止无限递归
        const onlySuccess = action.chain.onlyOnSuccess !== false
        if (!onlySuccess || true) {
          // 当前成功，触发链
          await this.executeChain(action.chain.triggers, level, source, depth + 1)
        }
      }

      return { pluginId, success: true, duration }
    } catch (error) {
      const duration = performance.now() - startTime
      console.error(
        `[ResetRegistry] ${i18n.translate('vtkviewer.reset.actionFailed')}: ${entry.key}"`,
        error
      )

      this.eventBus.emit('reset:actionComplete', {
        key: entry.key,
        pluginId,
        success: false,
        duration
      })

      // 链式触发（即使失败也触发，如果配置了 onlyOnSuccess=false）
      if (action.chain && !(action.chain.onlyOnSuccess !== false) && depth < 10) {
        await this.executeChain(action.chain.triggers, level, source, depth + 1)
      }

      return {
        pluginId,
        success: false,
        duration,
        error: error instanceof Error ? error : new Error(String(error))
      }
    }
  }

  /**
   * 执行重置链
   * @param triggers 目标列表，格式 'pluginId:actionName' 或 'pluginId'
   */
  private async executeChain(
    triggers: string[],
    level: ResetLevel,
    source: string,
    _depth: number
  ): Promise<void> {
    for (const trigger of triggers) {
      const [pluginId, actionName] = trigger.split(':')
      await this.invoke(pluginId, actionName, level, `chain:${source}`)
    }
  }
}
