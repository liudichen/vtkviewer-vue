/**
 * 卸载模型插件
 * 清除当前加载的模型，释放 GPU 资源并重置场景状态
 */

import { defineComponent, h } from 'vue'

import { i18n } from '@/core'
import { unloadAllModels } from '@/utils'
import { UnloadIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 卸载模型插件配置 */
export interface UnloadModelPluginConfig extends ToolbarPluginConfig {}

export class UnloadModelPlugin
  extends PluginBase<UnloadModelPluginConfig>
  implements IToolbarPlugin
{
  readonly metadata = {
    id: 'unloadModel',
    name: 'UnloadModelPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.unloadModel.description')
  }

  readonly order = 100
  readonly defaultConfig: UnloadModelPluginConfig = {
    enabled: true,
    icon: UnloadIcon,
    hideWhenNoModel: true, // 无模型时隐藏按钮
    group: 'source'
  }

  /**
   * 卸载模型：清除场景、重置插件状态、恢复默认相机
   */
  private unload(): void {
    unloadAllModels(this.ctx.scene, this.ctx.render, this.ctx.resetManager, this.ctx.events)
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const shortcuts = self.getShortcutConfig()
          const displayText = shortcuts.length > 0 ? shortcuts[0].key : ''
          const keyText = Array.isArray(displayText) ? displayText[0] : displayText
          const title = i18n.translate('vtkviewer.plugin.unloadModel.name')
          return h(
            'button',
            {
              class: 'iimm-vtk-toolbar-btn iimm-vtk-toolbar-btn--danger',
              title: self.ctx.enableKeyboard.value && keyText ? `${title} (${keyText})` : title,
              onClick: () => self.unload()
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
      'unload',
      i18n.translate('vtkviewer.plugin.unloadModel.name')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => this.unload(),
      description: s.description
    }))
  }
}
