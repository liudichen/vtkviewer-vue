/**
 * Vue注入键定义
 * 用于在组件树中注入查看器上下文
 */

import type { InjectionKey } from 'vue'

import type { CommandRegistry, EventBus, IStateManager, ViewerContext } from '@/core'

/**
 * 状态管理器注入键
 * UI插件通过 inject(stateManagerKey) 访问核心状态和插件状态
 */
export const stateManagerKey: InjectionKey<IStateManager> = Symbol('stateManager')

/**
 * 命令注册表注入键
 * 插件通过 inject(commandExecutorKey) 执行跨插件命令
 */
export const commandExecutorKey: InjectionKey<CommandRegistry> = Symbol('commandExecutor')

/**
 * 事件总线注入键
 * 插件通过 inject(eventBusKey) 进行事件通信
 */
export const eventBusKey: InjectionKey<EventBus> = Symbol('eventBus')

/**
 * 查看器上下文注入键
 * 提供完整的 ViewerContext，用于需要访问多个子系统的场景
 */
export const viewerContextKey: InjectionKey<ViewerContext> = Symbol('viewerContext')
