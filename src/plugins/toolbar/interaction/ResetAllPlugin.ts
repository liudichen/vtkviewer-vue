/**
 * 重置所有插件
 * 重置相机和所有工具状态
 */

import { defineComponent, h } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinCommands } from '@/configs'
import { ResetIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 重置所有插件配置 */
export interface ResetAllPluginConfig extends ToolbarPluginConfig {}

export class ResetAllPlugin
  extends PluginBase<ResetAllPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'resetAll',
    name: 'ResetAllPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.resetAll.description')
  }

  readonly order = 4
  readonly defaultConfig: ResetAllPluginConfig = {
    enabled: true,
    shortcut: 'R',
    icon: ResetIcon,
    hideWhenNoModel: false
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetAll',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.resetAll.resetDesc'),
        priority: 999, // 最后执行，确保其他插件先清理
        execute: () => this.resetAll()
      }
    ]
  }

  /** 执行重置所有操作（仅重置相机和交互状态） */
  private resetAll(): void {
    // 重置到默认视图（包括相机位置、视角、裁剪范围）
    this.ctx.commands.execute(BuiltinCommands.RESET_TO_DEFAULT_VIEW)
    // 恢复交互工具默认状态
    this.ctx.interaction.updateInteraction({ rotate: true, zoom: true, pan: true })
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const shortcuts = self.getShortcutConfig()
          const displayText = shortcuts.length > 0 ? shortcuts[0].key : ''
          const keyText = Array.isArray(displayText) ? displayText[0] : displayText
          return h(
            'button',
            {
              class: 'iimm-vtk-toolbar-btn',
              title: self.ctx.enableKeyboard.value && keyText
                ? i18n.translate('vtkviewer.plugin.resetAll.tooltip') + ' (' + keyText + ')'
                : i18n.translate('vtkviewer.plugin.resetAll.tooltip'),
              onClick: () => self.ctx.commands.execute(BuiltinCommands.RESET_ALL)
            },
            renderToolbarIcon(self.config.icon) ?? ''
          )
        }
      }
    })
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'reset',
      i18n.translate('vtkviewer.plugin.resetAll.shortcutDesc')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.ctx.commands.execute(BuiltinCommands.RESET_ALL),
      description: s.description
    }))
  }
}
