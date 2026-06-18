/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-01 08:40:30
 * @LastEditTime: 2026-06-13 21:38:23
 * @Description:
 */
/**
 * 查看器上下文构建器
 * 使用 Builder 工厂模式，分步注入+构建校验
 */

import { type Ref } from 'vue'
import type { PluginRegistry } from '@/plugins'

import type { ViewerContext } from './ViewerContext'
import { i18n } from './I18nManager'
import type { RenderSubContext } from './RenderSubContext'
import type { SceneSubContext } from './SceneSubContext'
import type { InteractionSubContext } from './InteractionSubContext'
import type { UISubContext } from './UISubContext'
import type { IStateManager } from './StateManager'
import type { CommandRegistry } from './CommandRegistry'
import type { EventBus } from './EventBus'
import type { ConfigAccessor } from './ConfigAccessor'
import type { DisposalRegistry } from './DisposalRegistry'
import type { ResetManager } from './ResetManager'
import type { IToolbarInfoRegistry } from './ToolbarInfoRegistry'
import type { IToolbarExtensionRegistry } from './ToolbarExtensionRegistry'
import type { ThemeContext } from './ThemeContext'

export class ViewerContextBuilder {
  private _render!: RenderSubContext
  private _scene!: SceneSubContext
  private _interaction!: InteractionSubContext
  private _ui!: UISubContext
  private _stateManager!: IStateManager
  private _commands!: CommandRegistry
  private _events!: EventBus
  private _config!: ConfigAccessor
  private _disposal!: DisposalRegistry
  private _plugins!: PluginRegistry
  private _resetManager!: ResetManager
  private _infoPanel!: IToolbarInfoRegistry
  private _toolbarExtension!: IToolbarExtensionRegistry
  private _theme!: ThemeContext
  private _decoders: Record<string, string> = {}
  private _isReady!: Ref<boolean>
  private _enableGesture!: Ref<boolean>
  private _enableKeyboard!: Ref<boolean>

  /** 分步注入各子上下文 */
  withRender(ctx: RenderSubContext): this {
    this._render = ctx
    return this
  }
  withScene(ctx: SceneSubContext): this {
    this._scene = ctx
    return this
  }
  withInteraction(ctx: InteractionSubContext): this {
    this._interaction = ctx
    return this
  }
  withUI(ctx: UISubContext): this {
    this._ui = ctx
    return this
  }
  withStateManager(sm: IStateManager): this {
    this._stateManager = sm
    return this
  }
  withCommands(cr: CommandRegistry): this {
    this._commands = cr
    return this
  }
  withEvents(eb: EventBus): this {
    this._events = eb
    return this
  }
  withConfig(ca: ConfigAccessor): this {
    this._config = ca
    return this
  }
  withDisposal(dr: DisposalRegistry): this {
    this._disposal = dr
    return this
  }
  withPlugins(pr: PluginRegistry): this {
    this._plugins = pr
    return this
  }
  withResetManager(rm: ResetManager): this {
    this._resetManager = rm
    return this
  }
  withInfoPanel(ip: IToolbarInfoRegistry): this {
    this._infoPanel = ip
    return this
  }
  withToolbarExtension(te: IToolbarExtensionRegistry): this {
    this._toolbarExtension = te
    return this
  }
  withTheme(theme: ThemeContext): this {
    this._theme = theme
    return this
  }
  withDecoders(decoders: Record<string, string>): this {
    this._decoders = decoders
    return this
  }
  withIsReady(isReady: Ref<boolean>): this {
    this._isReady = isReady
    return this
  }
  withEnableGesture(enableGesture: Ref<boolean>): this {
    this._enableGesture = enableGesture
    return this
  }
  withEnableKeyboard(enableKeyboard: Ref<boolean>): this {
    this._enableKeyboard = enableKeyboard
    return this
  }

  /** 构建最终的 ViewerContext（校验所有字段已注入） */
  build(): ViewerContext {
    const missing: string[] = []
    if (!this._render) missing.push('render')
    if (!this._scene) missing.push('scene')
    if (!this._interaction) missing.push('interaction')
    if (!this._ui) missing.push('ui')
    if (!this._stateManager) missing.push('stateManager')
    if (!this._commands) missing.push('commands')
    if (!this._events) missing.push('events')
    if (!this._config) missing.push('config')
    if (!this._disposal) missing.push('disposal')
    if (!this._plugins) missing.push('plugins')
    if (!this._resetManager) missing.push('resetManager')
    if (!this._infoPanel) missing.push('infoPanel')
    if (!this._toolbarExtension) missing.push('toolbarExtension')
    if (!this._theme) missing.push('theme')
    if (!this._isReady) missing.push('isReady')
    if (!this._enableGesture) missing.push('enableGesture')
    if (!this._enableKeyboard) missing.push('enableKeyboard')
    if (missing.length > 0) {
      throw new Error(
        `${i18n.translate('vtkviewer.context.missingSubContexts')}: ${missing.join(', ')}`
      )
    }
    return Object.freeze({
      isReady: this._isReady,
      render: this._render,
      scene: this._scene,
      interaction: this._interaction,
      ui: this._ui,
      stateManager: this._stateManager,
      commands: this._commands,
      events: this._events,
      config: this._config,
      disposal: this._disposal,
      plugins: this._plugins,
      resetManager: this._resetManager,
      infoPanel: this._infoPanel,
      toolbarExtension: this._toolbarExtension,
      /** 主题状态管理 */
      theme: this._theme,
      decoders: this._decoders,
      enableGesture: this._enableGesture,
      enableKeyboard: this._enableKeyboard
    })
  }
}
