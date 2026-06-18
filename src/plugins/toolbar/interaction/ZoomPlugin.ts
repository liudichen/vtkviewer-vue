/**
 * 缩放插件
 * 启用/禁用缩放交互
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { ZoomIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 缩放插件配置 */
export interface ZoomPluginConfig extends ToolbarPluginConfig {}

export class ZoomPlugin extends PluginBase<ZoomPluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'zoom',
    name: 'ZoomPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.zoom.description')
  }

  readonly order = 1
  readonly defaultConfig: ZoomPluginConfig = {
    enabled: true,
    shortcut: [],
    icon: ZoomIcon,
    hideWhenNoModel: true,
    defaultActive: true
  }

  private active = ref(true)

  protected onInit(): void {
    if (this.getConfig('defaultActive') !== undefined) {
      this.active.value = !!this.getConfig('defaultActive')
    }
    this.onEvent(BuiltinEvents.TOOL_CHANGED, (data: any) => this.onToolChanged(data))
  }

  private onToolChanged(data: { tool: string; enabled: boolean }): void {
    if (data.tool === 'zoom') {
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
              title: i18n.translate('vtkviewer.plugin.zoom.tooltip'),
              onClick: () => self.ctx.interaction.toggleTool('zoom')
            },
            renderToolbarIcon(self.config.icon) ?? ''
          )
      }
    })
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(this.config.shortcut, 'zoom')
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    // 缩放没有切换快捷键，返回空数组
    return []
  }
}
