/**
 * WebGL上下文丢失插件
 * 显示WebGL上下文丢失提示和恢复操作
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { type IUIPlugin, type PluginConfig, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

/** WebGL上下文丢失插件配置 */
export interface WebGLContextLostPluginConfig extends PluginConfig {
  /** 最大重试次数 */
  maxRetries?: number
}

/**
 * WebGL上下文丢失插件
 * 显示WebGL上下文丢失提示和恢复操作
 */
export class WebGLContextLostPlugin
  extends PluginBase<WebGLContextLostPluginConfig>
  implements IUIPlugin
{
  readonly metadata = {
    id: 'webglContextLost',
    name: 'WebGLContextLostPlugin',
    type: PluginType.UI,
    description: i18n.translate('vtkviewer.plugin.webgl.description')
  }
  readonly uiType = 'overlay' as const
  readonly order = 2
  readonly defaultConfig: WebGLContextLostPluginConfig = { enabled: true, maxRetries: 3 }

  private isContextLost = ref(false)
  private retryCount = ref(0)

  protected onInit(): void {
    this.onEvent(BuiltinEvents.WEBGL_CONTEXT_LOST, () => this.onContextLost())
    this.onEvent(BuiltinEvents.WEBGL_CONTEXT_RESTORED, () => this.onContextRestored())
  }

  private onContextLost(): void {
    this.isContextLost.value = true
  }

  private onContextRestored(): void {
    this.isContextLost.value = false
    this.retryCount.value = 0
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          if (!self.isContextLost.value) return null

          return h('div', { class: 'iimm-vtk-overlay iimm-vtk-error-overlay' }, [
            h('div', { class: 'iimm-vtk-error-icon' }, '💥'),
            h(
              'div',
              { class: 'iimm-vtk-error-title' },
              i18n.translate('vtkviewer.plugin.webgl.title')
            ),
            h(
              'div',
              { class: 'iimm-vtk-error-message' },
              i18n.translate('vtkviewer.plugin.webgl.message')
            ),
            h('div', { class: 'iimm-vtk-error-actions' }, [
              h(
                'button',
                {
                  class: 'iimm-vtk-popup-btn iimm-vtk-popup-btn--primary',
                  onClick: () => {
                    self.retryCount.value++
                    window.location.reload()
                  }
                },
                `${i18n.translate('vtkviewer.plugin.webgl.retry')} (${self.retryCount.value}/${self.config.maxRetries})`
              )
            ])
          ])
        }
      }
    })
  }

  isVisible(): boolean {
    return this.isContextLost.value
  }

  getPosition(): 'center' {
    return 'center'
  }
}
