/**
 * 旋转插件
 * 启用/禁用旋转交互
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { RotateIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 旋转插件配置 */
export interface RotatePluginConfig extends ToolbarPluginConfig {}

export class RotatePlugin extends PluginBase<RotatePluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'rotate',
    name: 'RotatePlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.rotate.description')
  }

  readonly order = 0
  readonly defaultConfig: RotatePluginConfig = {
    enabled: true,
    shortcut: [],
    icon: RotateIcon,
    hideWhenNoModel: true,
    defaultActive: true
  }

  private active = ref(true)

  protected onInit(): void {
    if (this.getConfig('defaultActive') !== undefined) {
      this.active.value = !!this.getConfig('defaultActive')
    }
    // 监听工具变化事件
    this.onEvent(BuiltinEvents.TOOL_CHANGED, (data: any) => this.onToolChanged(data))
  }

  private onToolChanged(data: { tool: string; enabled: boolean }): void {
    if (data.tool === 'rotate') {
      this.active.value = data.enabled
    }
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () =>
          h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': self.active.value }],
              title: i18n.translate('vtkviewer.plugin.rotate.tooltip'),
              onClick: () => self.ctx.interaction.toggleTool('rotate')
            },
            renderToolbarIcon(self.config.icon) ?? ''
          )
      }
    })
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(this.config.shortcut, 'rotate')
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    // 旋转没有切换快捷键，返回空数组
    return []
  }
}
