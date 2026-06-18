/**
 * 背景色插件
 * 提供调色板图标，点击弹出颜色选择器选取任意颜色
 * 支持响应式默认背景色和全部重置恢复
 */

import { defineComponent, h, ref, watch } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinCommands } from '@/configs'
import { BackgroundColorIcon } from '@/icons'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon } from '@/plugins/toolbar/utils'

/** 背景色插件配置 */
export interface BackgroundColorPluginConfig extends ToolbarPluginConfig {}

export class BackgroundColorPlugin
  extends PluginBase<BackgroundColorPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'backgroundColor',
    name: 'BackgroundColorPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.backgroundColor.description')
  }

  readonly order = 3
  readonly defaultConfig: BackgroundColorPluginConfig = {
    enabled: true,
    icon: BackgroundColorIcon,
    hideWhenNoModel: false
  }

  /** 当前背景色（响应式） */
  private currentColor = ref('#1e1e2e')

  protected onInit(): void {
    // 初始化颜色为 ctx 中的默认背景色
    this.currentColor.value = this.ctx.ui.defaultBackground.value

    // 监听默认背景色变化（由 props.background 驱动）
    const unwatch = watch(
      () => this.ctx.ui.defaultBackground.value,
      newColor => {
        this.currentColor.value = newColor
        // 应用到渲染器
        this.ctx.commands.execute(BuiltinCommands.SET_BACKGROUND_COLOR, newColor)
      }
    )
    this.ctx.disposal.register(unwatch)

    // 应用初始背景色
    this.ctx.commands.execute(BuiltinCommands.SET_BACKGROUND_COLOR, this.currentColor.value)
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetBackground',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.backgroundColor.resetDesc'),
        execute: () => {
          const defaultColor = this.ctx.ui.defaultBackground.value
          this.currentColor.value = defaultColor
          this.ctx.commands.execute(BuiltinCommands.SET_BACKGROUND_COLOR, defaultColor)
        }
      }
    ]
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () =>
          h(
            'div',
            {
              class: 'iimm-vtk-color-picker',
              style: { position: 'relative', display: 'inline-flex' }
            },
            [
              h(
                'button',
                {
                  class: 'iimm-vtk-toolbar-btn',
                  title: i18n.translate('vtkviewer.plugin.backgroundColor.tooltip'),
                  style: { position: 'relative' }
                },
                [
                  renderToolbarIcon(self.config.icon) ?? '',
                  // 颜色指示条
                  h('span', {
                    class: 'iimm-vtk-color-indicator',
                    style: {
                      position: 'absolute',
                      bottom: '3px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      width: '14px',
                      height: '3px',
                      borderRadius: '1.5px',
                      backgroundColor: self.currentColor.value
                    }
                  }),
                  // 隐藏的颜色选择器 input，覆盖在按钮内部
                  h('input', {
                    type: 'color',
                    title: i18n.translate('vtkviewer.plugin.backgroundColor.tooltip'),
                    value: self.currentColor.value,
                    onInput: (e: Event) => {
                      const color = (e.target as HTMLInputElement).value
                      self.currentColor.value = color
                      self.ctx.commands.execute(BuiltinCommands.SET_BACKGROUND_COLOR, color)
                    },
                    style: {
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      width: '100%',
                      height: '100%',
                      opacity: '0',
                      cursor: 'pointer'
                    }
                  })
                ]
              )
            ]
          )
      }
    })
  }

  isVisible(): boolean {
    return true
  }
}
