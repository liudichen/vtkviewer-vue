/**
 * 语言切换插件
 * 在工具栏中提供语言切换下拉菜单
 * 语言状态和可用语言列表统一由 I18nManager 单例管理
 */

import { defineComponent, h, ref, type Component } from 'vue'

import { i18n, type LanguageOption } from '@/core'
import { BuiltinEvents } from '@/configs'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { createDropdownAlignment, getDropdownAlignStyle } from '@/plugins/toolbar/utils'

/** 语言切换插件配置 */
export interface LanguageSwitchPluginConfig extends ToolbarPluginConfig {}

/**
 * 语言切换插件
 * 在工具栏中提供语言切换下拉菜单
 * 选择后通过 I18nManager + EventBus 同步状态
 */
export class LanguageSwitchPlugin
  extends PluginBase<LanguageSwitchPluginConfig>
  implements IToolbarPlugin
{
  readonly metadata = {
    id: 'languageSwitch',
    name: 'LanguageSwitchPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.languageSwitch.description')
  }

  readonly order = 11
  readonly defaultConfig: LanguageSwitchPluginConfig = {
    enabled: true,
    hideWhenNoModel: false
  }

  /** 下拉菜单是否展开 */
  private isDropdownOpen = ref(false)

  /** 下拉对齐管理器 */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-language-switch')

  protected onInit(): void {
    // 监听点击外部关闭下拉菜单
    this.setupOutsideClickListener(this.handleOutsideClick, true)
  }

  protected onDispose(): void {}

  /** 处理点击外部关闭下拉菜单 */
  private handleOutsideClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-language-switch')) {
      this.isDropdownOpen.value = false
    }
  }

  /** 切换语言 */
  public switchLanguage(locale: string): void {
    if (locale === i18n.currentLocale.value) return
    this.isDropdownOpen.value = false

    // 通过 I18nManager 统一切换（自动触发所有响应式更新）
    i18n.setLocale(locale)

    // 触发语言变更事件（保持旧路径兼容：VtkViewer 仍通过此事件同步 props.locale）
    this.ctx.events.emit(BuiltinEvents.LOCALE_CHANGED, { locale })
  }

  /** 设置当前语言（供 VtkViewer 外部同步使用，保持向后兼容） */
  public setCurrentLocale(locale: string): void {
    i18n.setLocale(locale)
  }

  /** 获取当前语言 */
  public getCurrentLocale(): string {
    return i18n.currentLocale.value
  }

  /**
   * 设置可用语言列表（供 VtkViewer props.languages 传入，保持向后兼容）。
   * 委托给 I18nManager。
   */
  public setAvailableLanguages(opts?: LanguageOption[]): void {
    i18n.setLanguageOptions(opts)
  }

  /** 切换下拉菜单 */
  private toggleDropdown(e: Event): void {
    e.stopPropagation()
    this.isDropdownOpen.value = !this.isDropdownOpen.value
    if (this.isDropdownOpen.value) {
      this.dropdownAlignment.update()
    }
  }

  render(): Component {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          // 读取 i18n.currentLocale.value → Vue render effect 自动追踪依赖
          // locale 变更时此组件自动重渲染，无需清空 renderCache
          const currentLocale = i18n.currentLocale.value
          const languages = i18n.getLanguageOptions()
          const currentLang = languages.find(l => l.id === currentLocale) ?? languages[0]
          const isOpen = self.isDropdownOpen.value

          return h('div', { class: 'iimm-vtk-toolbar-item iimm-vtk-language-switch' }, [
            // 语言切换按钮
            h(
              'button',
              {
                class: 'iimm-vtk-toolbar-btn iimm-vtk-language-switch-btn',
                title: i18n.translate('vtkviewer.lang.title'),
                onClick: (e: Event) => self.toggleDropdown(e)
              },
              [
                // 语言图标（地球/翻译）
                h('span', { class: 'iimm-vtk-toolbar-icon' }, [
                  h(
                    'svg',
                    {
                      viewBox: '0 0 24 24',
                      fill: 'none',
                      stroke: 'currentColor',
                      'stroke-width': '2',
                      'stroke-linecap': 'round',
                      'stroke-linejoin': 'round'
                    },
                    [
                      h('circle', { cx: '12', cy: '12', r: '10' }),
                      h('path', { d: 'M2 12h20' }),
                      h('path', { d: 'M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10' }),
                      h('path', { d: 'M12 2a15.3 15.3 0 0 0-4 10 15.3 15.3 0 0 0 4 10' })
                    ]
                  )
                ]),
                // 当前语言代码
                h('span', { class: 'iimm-vtk-language-current' }, currentLang.id.toUpperCase())
              ]
            ),

            // 下拉菜单
            isOpen &&
              h(
                'div',
                {
                  class: 'iimm-vtk-language-dropdown',
                  style: getDropdownAlignStyle(self.dropdownAlignment.align.value)
                },
                [
                  h('div', { class: 'iimm-vtk-popup-header' }, [
                    h(
                      'span',
                      { class: 'iimm-vtk-popup-title' },
                      i18n.translate('vtkviewer.lang.title')
                    )
                  ]),
                  ...languages.map(lang => {
                    // 翻译名称：优先用内置 nameKey，否则直接用 label
                    const displayName = i18n.translate(`vtkviewer.lang.${lang.id}`) || lang.label
                    return h(
                      'div',
                      {
                        class: [
                          'iimm-vtk-language-option',
                          { 'is-active': lang.id === currentLocale }
                        ],
                        onClick: () => self.switchLanguage(lang.id)
                      },
                      [
                        h('span', { class: 'iimm-vtk-language-label' }, displayName),
                        lang.id === currentLocale &&
                          h('span', { class: 'iimm-vtk-theme-check' }, '✓')
                      ]
                    )
                  })
                ]
              )
          ])
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }
}
