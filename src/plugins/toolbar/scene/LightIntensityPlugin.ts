/**
 * 光照强度调节插件
 * 通过滑块调节场景光照强度
 */

import { defineComponent, h, onMounted, onUnmounted, ref } from 'vue'

import vtkLight from '@kitware/vtk.js/Rendering/Core/Light'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { LightIntensityIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon } from '@/plugins/toolbar/utils'

/** 光照强度调节插件配置 */
export interface LightIntensityPluginConfig extends ToolbarPluginConfig {
  /** 默认光照强度 (0-1, 默认 1.0) */
  defaultIntensity?: number
  /** 强度步进值 (默认 0.1) */
  step?: number
}

export class LightIntensityPlugin
  extends PluginBase<LightIntensityPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'lightIntensity',
    name: 'LightIntensityPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.lightIntensity.description')
  }

  readonly order = 7
  readonly defaultConfig: LightIntensityPluginConfig = {
    enabled: true,
    icon: LightIntensityIcon,
    hideWhenNoModel: true,
    defaultIntensity: 1.0,
    step: 0.01
  }

  private intensity = ref(1.0)
  private panelOpen = ref(false)

  protected onInit(): void {
    // 确保渲染器至少有一个灯光
    const renderer = this.ctx.render.getRenderer()
    if (renderer) {
      const lights = renderer.getLights()
      if (lights.length === 0) {
        const light = vtkLight.newInstance()
        renderer.addLight(light)
      }
    }
    // 初始化时设置光照强度
    const defaultVal = this.config.defaultIntensity ?? 1.0
    const clampedVal = Math.max(0, Math.min(1, defaultVal))
    this.intensity.value = clampedVal
    this.applyIntensity(clampedVal)
  }

  protected onDispose(): void {}

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetLightIntensity',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.lightIntensity.resetDesc'),
        execute: () => this.resetIntensity()
      }
    ]
  }

  /** 获取渲染器中的所有灯光 */
  private getLights() {
    const renderer = this.ctx.render.getRenderer()
    if (!renderer) return []
    return renderer.getLights()
  }

  /** 应用光照强度到所有灯光 */
  private applyIntensity(value: number): void {
    const clampedValue = Math.max(0, Math.min(1, value))
    const lights = this.getLights()
    for (const light of lights) {
      light.setIntensity(clampedValue)
    }
    this.ctx.render.render()
  }

  /** 增加光照强度 */
  increaseIntensity(): void {
    const step = this.config.step ?? 0.1
    const newVal = Math.min(1, this.intensity.value + step)
    this.intensity.value = Math.round(newVal * 100) / 100
    this.applyIntensity(this.intensity.value)
  }

  /** 减少光照强度 */
  decreaseIntensity(): void {
    const step = this.config.step ?? 0.1
    const newVal = Math.max(0, this.intensity.value - step)
    this.intensity.value = Math.round(newVal * 100) / 100
    this.applyIntensity(this.intensity.value)
  }

  /** 重置光照强度 */
  resetIntensity(): void {
    const defaultVal = this.config.defaultIntensity ?? 1.0
    const clampedVal = Math.max(0, Math.min(1, defaultVal))
    this.intensity.value = clampedVal
    this.applyIntensity(clampedVal)
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)

        const onDocClick = (e: MouseEvent) => {
          if (!self.panelOpen.value) return
          if (el.value && !el.value.contains(e.target as Node)) self.panelOpen.value = false
        }
        onMounted(() => document.addEventListener('click', onDocClick, true))
        onUnmounted(() => document.removeEventListener('click', onDocClick, true))

        return () => {
          return h(
            'div',
            {
              ref: el,
              class: 'iimm-vtk-toolbar-item'
            },
            [
              // 主按钮
              h(
                'button',
                {
                  class: [
                    'iimm-vtk-toolbar-btn',
                    {
                      'is-active':
                        self.panelOpen.value ||
                        self.intensity.value !== (self.config.defaultIntensity ?? 1.0)
                    }
                  ],
                  title: `${i18n.translate('vtkviewer.plugin.lightIntensity.tooltip')}: ${self.intensity.value.toFixed(2)}`,
                  onClick: () => {
                    self.panelOpen.value = !self.panelOpen.value
                  }
                },
                renderToolbarIcon(self.config.icon) ?? ''
              ),
              // 展开面板
              self.panelOpen.value
                ? h(
                    'div',
                    {
                      class: 'iimm-vtk-settings-panel',
                      style: { minWidth: '220px' }
                    },
                    [
                      // title
                      h(
                        'div',
                        {
                          class: 'iimm-vtk-popup-row',
                          style: {
                            borderBottom: '1px solid var(--iimm-vtk-popup-border-color)',
                            paddingBottom: '6px'
                          }
                        },
                        [
                          h(
                            'span',
                            { class: 'iimm-vtk-popup-title' },
                            i18n.translate('vtkviewer.plugin.lightIntensity.title')
                          )
                        ]
                      ),
                      // 滑块区域
                      h('div', { class: 'iimm-vtk-popup-section' }, [
                        h('div', { class: 'iimm-vtk-popup-row' }, [
                          h(
                            'label',
                            { class: 'iimm-vtk-popup-label' },
                            i18n.translate('vtkviewer.plugin.lightIntensity.value')
                          ),
                          h(
                            'span',
                            { class: 'iimm-vtk-popup-value-accent' },
                            self.intensity.value.toFixed(2)
                          )
                        ]),
                        h('div', { class: 'iimm-vtk-popup-row', style: { gap: '4px' } }, [
                          h(
                            'button',
                            {
                              class: 'iimm-vtk-popup-btn',
                              style: { flex: '0 0 auto' },
                              onClick: () => self.decreaseIntensity()
                            },
                            i18n.translate('vtkviewer.plugin.lightIntensity.decrease')
                          ),
                          h('input', {
                            class: 'iimm-vtk-popup-slider',
                            type: 'range',
                            min: '0',
                            max: '1',
                            step: String(self.config.step ?? 0.01),
                            value: self.intensity.value,
                            onInput: (e: Event) => {
                              const val = parseFloat((e.target as HTMLInputElement).value)
                              self.intensity.value = val
                              self.applyIntensity(val)
                            }
                          }),
                          h(
                            'button',
                            {
                              class: 'iimm-vtk-popup-btn',
                              style: { flex: '0 0 auto' },
                              onClick: () => self.increaseIntensity()
                            },
                            i18n.translate('vtkviewer.plugin.lightIntensity.increase')
                          )
                        ])
                      ]),
                      // 重置按钮
                      h(
                        'div',
                        {
                          class: 'iimm-vtk-popup-row',
                          style: {
                            borderTop: '1px solid var(--iimm-vtk-popup-border-color)',
                            paddingTop: '8px'
                          }
                        },
                        [
                          h(
                            'button',
                            {
                              class: 'iimm-vtk-popup-btn',
                              style: { width: '100%' },
                              onClick: () => self.resetIntensity()
                            },
                            i18n.translate('vtkviewer.plugin.lightIntensity.reset')
                          )
                        ]
                      )
                    ]
                  )
                : null
            ]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return []
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return []
  }
}
