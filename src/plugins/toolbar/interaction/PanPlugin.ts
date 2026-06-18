/*
 * @Author: 柳涤尘
 * @Email: liudichen@foxmail.com
 * @Website: https://www.iimm.ink
 * @Date: 2026-06-01 08:40:30
 * @LastEditTime: 2026-06-13 20:18:19
 * @Description:
 */
/**
 * 平移插件
 * 启用/禁用平移交互
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { PanIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 平移插件配置 */
export interface PanPluginConfig extends ToolbarPluginConfig {}

export class PanPlugin extends PluginBase<PanPluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'pan',
    name: 'PanPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.pan.description')
  }

  readonly order = 2
  readonly defaultConfig: PanPluginConfig = {
    enabled: true,
    shortcut: [],
    icon: PanIcon,
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
    if (data.tool === 'pan') {
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
              title: i18n.translate('vtkviewer.plugin.pan.tooltip'),
              onClick: () => self.ctx.interaction.toggleTool('pan')
            },
            renderToolbarIcon(self.config.icon) ?? ''
          )
      }
    })
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(this.config.shortcut, 'pan')
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    // 平移没有切换快捷键，返回空数组
    return []
  }
}
