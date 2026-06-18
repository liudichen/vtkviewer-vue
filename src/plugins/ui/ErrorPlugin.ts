/**
 * 错误提示插件
 * 显示错误信息和恢复操作
 */

import { defineComponent, h, inject } from 'vue'

import { i18n } from '@/core'
import { BuiltinCommands } from '@/configs'

import { type IUIPlugin, type PluginConfig, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { stateManagerKey, commandExecutorKey } from '@/plugins/injectionKeys'

/** 错误提示插件配置 */
export interface ErrorPluginConfig extends PluginConfig {
  /** 是否显示重试按钮 */
  showRetry?: boolean
  /** 遮罩层背景色（覆盖 CSS 变量 --iimm-vtk-error-overlay-bg），默认继承主题 */
  overlayBackground?: string
}

/**
 * 错误提示插件
 * 显示错误信息和恢复操作
 */
export class ErrorPlugin extends PluginBase<ErrorPluginConfig> implements IUIPlugin {
  readonly metadata = {
    id: 'error',
    name: 'ErrorPlugin',
    type: PluginType.UI,
    description: i18n.translate('vtkviewer.plugin.error.description')
  }
  readonly uiType = 'overlay' as const
  readonly order = 1
  readonly defaultConfig: ErrorPluginConfig = { enabled: true, showRetry: true }

  render() {
    const self = this
    return defineComponent({
      setup() {
        const stateManager = inject(stateManagerKey)!
        const commands = inject(commandExecutorKey)!

        return () => {
          const { hasError, message, severity, recoverable } = stateManager.core.error

          if (!hasError) return null

          const overlayStyle = self.config.overlayBackground
            ? { '--iimm-vtk-error-overlay-bg': self.config.overlayBackground }
            : undefined
          return h(
            'div',
            {
              class: `iimm-vtk-overlay iimm-vtk-error-overlay iimm-vtk-error-${severity}`,
              style: overlayStyle
            },
            [
              h('div', { class: 'iimm-vtk-error-icon' }, severity === 'fatal' ? '❌' : '⚠️'),
              h('div', { class: 'iimm-vtk-error-message' }, message),
              h('div', { class: 'iimm-vtk-error-actions' }, [
                recoverable &&
                  self.config.showRetry &&
                  h(
                    'button',
                    {
                      class: 'iimm-vtk-popup-btn iimm-vtk-popup-btn--primary',
                      onClick: () => commands.execute(BuiltinCommands.RETRY_LOAD)
                    },
                    i18n.translate('vtkviewer.plugin.error.retry')
                  ),
                h(
                  'button',
                  {
                    class: 'iimm-vtk-popup-btn',
                    onClick: () => commands.execute(BuiltinCommands.DISMISS_ERROR)
                  },
                  i18n.translate('vtkviewer.plugin.error.dismiss')
                )
              ])
            ]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return this.ctx?.stateManager?.core?.error?.hasError ?? false
  }

  getPosition(): 'bottom' {
    return 'bottom'
  }
}
