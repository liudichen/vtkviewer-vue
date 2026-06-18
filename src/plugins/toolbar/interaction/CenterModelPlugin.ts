/**
 * 居中模型插件
 * 将相机聚焦到模型中心
 */

import { defineComponent, h } from 'vue'

import { i18n } from '@/core'
import { BuiltinCommands } from '@/configs'
import { CenterModelIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 居中模型插件配置 */
export interface CenterModelPluginConfig extends ToolbarPluginConfig {}

export class CenterModelPlugin
  extends PluginBase<CenterModelPluginConfig>
  implements IToolbarPlugin
{
  readonly metadata = {
    id: 'centerModel',
    name: 'CenterModelPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.centerModel.description')
  }

  readonly order = 3
  readonly defaultConfig: CenterModelPluginConfig = {
    enabled: true,
    shortcut: 'C',
    icon: CenterModelIcon,
    hideWhenNoModel: true
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
                ? i18n.translate('vtkviewer.plugin.centerModel.tooltip') + ' (' + keyText + ')'
                : i18n.translate('vtkviewer.plugin.centerModel.tooltip'),
              onClick: () => self.ctx.commands.execute(BuiltinCommands.RESET_CAMERA)
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
      'center',
      i18n.translate('vtkviewer.plugin.centerModel.shortcutDesc')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.ctx.commands.execute(BuiltinCommands.RESET_CAMERA),
      description: s.description
    }))
  }
}
