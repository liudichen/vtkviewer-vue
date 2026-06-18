/**
 * 视图选择插件
 * 选择预设视角
 */

import { defineComponent, h, ref } from 'vue'

import { i18n, ResetScope, type IResettableActions, type ResetAction } from '@/core'
import { BuiltinCommands, BuiltinEvents } from '@/configs'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'

const VIEW_PRESETS: Array<{ name: string; preset: string }> = [
  { name: 'Front', preset: 'front' },
  { name: 'Back', preset: 'back' },
  { name: 'Left', preset: 'left' },
  { name: 'Right', preset: 'right' },
  { name: 'Top', preset: 'top' },
  { name: 'Bottom', preset: 'bottom' },
  { name: 'Isometric', preset: 'iso' }
]

/** 视图预设 i18n key 映射 */
const VIEW_PRESET_I18N_KEYS: Record<string, string> = {
  front: 'vtkviewer.viewPreset.front',
  back: 'vtkviewer.viewPreset.back',
  left: 'vtkviewer.viewPreset.left',
  right: 'vtkviewer.viewPreset.right',
  top: 'vtkviewer.viewPreset.top',
  bottom: 'vtkviewer.viewPreset.bottom',
  iso: 'vtkviewer.viewPreset.iso'
}

/** 视图选择插件配置 */
export interface ViewSelectPluginConfig extends ToolbarPluginConfig {}

export class ViewSelectPlugin
  extends PluginBase<ViewSelectPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'viewSelect',
    name: 'ViewSelectPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.viewSelect.description')
  }

  readonly order = 4
  readonly defaultConfig: ViewSelectPluginConfig = {
    enabled: true,
    hideWhenNoModel: true
  }

  /** 下拉框当前值（类级别状态） */
  private currentValue = ref('reset')

  protected onInit(): void {
    // 监听场景清除事件，模型切换时重置下拉框
    const onSceneCleared = () => {
      this.resetDropdown()
    }
    this.onEvent(BuiltinEvents.SCENE_CLEARED, onSceneCleared)
  }

  /** 重置下拉框到默认状态 */
  resetDropdown(): void {
    this.currentValue.value = 'reset'
  }

  // === IResettableActions 实现 ===
  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetViewSelect',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.viewSelect.resetDesc'),
        execute: () => {
          this.resetDropdown()
        }
      }
    ]
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () =>
          h('div', { class: 'iimm-vtk-toolbar-item' }, [
            h(
              'select',
              {
                class: 'iimm-vtk-view-select',
                title: i18n.translate('vtkviewer.plugin.viewSelect.tooltip'),
                value: self.currentValue.value,
                style: { userSelect: 'none' },
                onChange: (e: Event) => {
                  const select = e.target as HTMLSelectElement
                  const value = select.value
                  self.currentValue.value = value

                  if (value === 'reset') {
                    // 重置视图到初始状态
                    self.ctx.commands.execute(BuiltinCommands.RESET_TO_DEFAULT_VIEW)
                  } else if (value) {
                    // 应用预设视角
                    self.ctx.commands.execute(BuiltinCommands.SET_CAMERA_VIEW, value)
                  }
                }
              },
              [
                // 默认选项：重置视图
                h(
                  'option',
                  { value: 'reset' },
                  i18n.translate('vtkviewer.plugin.viewSelect.placeholder')
                ),
                // 预设视角选项
                ...VIEW_PRESETS.map(view => {
                  const i18nKey = VIEW_PRESET_I18N_KEYS[view.preset]
                  return h(
                    'option',
                    { value: view.preset },
                    i18nKey ? i18n.translate(i18nKey) : view.name
                  )
                })
              ]
            )
          ])
      }
    })
  }
}
