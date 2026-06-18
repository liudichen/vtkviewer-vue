/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-01 08:40:30
 * @LastEditTime: 2026-06-13 20:12:50
 * @Description:
 */
/**
 * 全屏插件
 * 切换全屏显示
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinCommands } from '@/configs'
import { FullscreenIcon, FullscreenExitIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createIconConfig,
  renderToolbarIcon,
  normalizeShortcutConfig
} from '@/plugins/toolbar/utils'

/** 全屏插件配置 */
export interface FullscreenPluginConfig extends ToolbarPluginConfig {}

export class FullscreenPlugin extends PluginBase<FullscreenPluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'fullscreen',
    name: 'FullscreenPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.fullscreen.description')
  }

  readonly order = 1
  readonly defaultConfig: FullscreenPluginConfig = {
    enabled: true,
    shortcut: 'F',
    icon: createIconConfig(FullscreenIcon, FullscreenExitIcon, FullscreenIcon),
    hideWhenNoModel: false
  }

  private isFullscreen = ref(false)
  private boundOnFullscreenChange = this.onFullscreenChange.bind(this)

  protected onInit(): void {
    // 监听全屏状态变化
    document.addEventListener('fullscreenchange', this.boundOnFullscreenChange)
  }

  protected onDispose(): void {
    document.removeEventListener('fullscreenchange', this.boundOnFullscreenChange)
  }

  private onFullscreenChange(): void {
    this.isFullscreen.value = !!document.fullscreenElement
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const shortcuts = self.getShortcutConfig()
          const keyText = shortcuts.length > 0 ? shortcuts[0].key : ''
          const displayKey = Array.isArray(keyText) ? keyText[0] : keyText
          return h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.isFullscreen.value }],
              title: self.ctx.enableKeyboard.value && displayKey
                ? i18n.translate('vtkviewer.plugin.fullscreen.tooltip') + ' (' + displayKey + ')'
                : i18n.translate('vtkviewer.plugin.fullscreen.tooltip'),
              onClick: () => self.ctx.commands.execute(BuiltinCommands.TOGGLE_FULLSCREEN)
            },
            renderToolbarIcon(self.config.icon, undefined, self.isFullscreen.value) ?? undefined
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'fullscreen',
      i18n.translate('vtkviewer.plugin.fullscreen.shortcutDesc')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.ctx.commands.execute(BuiltinCommands.TOGGLE_FULLSCREEN),
      description: s.description
    }))
  }
}
