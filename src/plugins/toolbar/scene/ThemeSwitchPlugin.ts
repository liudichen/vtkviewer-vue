/**
 * 主题切换插件
 * 在工具栏中提供主题切换交互，支持内置主题和自定义主题
 * 从 ctx.theme 读取和修改主题状态（单一数据源）
 */

import { defineComponent, h, ref } from 'vue'

import { i18n, type ThemeConfig } from '@/core'
import { BUILTIN_THEMES } from '@/configs'
import { type ToolbarPluginConfig, type IToolbarPlugin, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { createDropdownAlignment, getDropdownAlignStyle } from '@/plugins/toolbar/utils'

/** 主题切换插件配置 */
export interface ThemeSwitchPluginConfig extends ToolbarPluginConfig {
  /** 可用主题列表（主题ID数组），默认显示所有内置主题 */
  availableThemes?: string[]
  /** 默认主题ID */
  defaultTheme?: string
}

/**
 * 主题切换插件
 * 在工具栏中提供主题切换下拉菜单
 * 从 ctx.theme 读取和修改主题状态（单一数据源）
 */
export class ThemeSwitchPlugin
  extends PluginBase<ThemeSwitchPluginConfig>
  implements IToolbarPlugin
{
  readonly metadata = {
    id: 'themeSwitch',
    name: 'ThemeSwitchPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.themeSwitch.description')
  }

  readonly order = 10
  readonly defaultConfig: ThemeSwitchPluginConfig = {
    enabled: true,
    hideWhenNoModel: false,
    availableThemes: Object.keys(BUILTIN_THEMES),
    defaultTheme: 'light'
  }

  /** 下拉菜单是否展开 */
  private isDropdownOpen = ref(false)

  /** 下拉弹窗对齐管理器（运行时自动根据按钮位置判断向左/向右展开） */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-theme-switch')

  protected onInit(): void {
    // 监听点击外部关闭下拉菜单
    this.setupOutsideClickListener(this.handleOutsideClick, true)
  }

  protected onDispose(): void {}

  /** 处理点击外部关闭下拉菜单 */
  private handleOutsideClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-theme-switch')) {
      this.isDropdownOpen.value = false
    }
  }

  /** 切换主题（调用 ctx.theme.setTheme） */
  public switchTheme(themeId: string): void {
    const themeContext = this.ctx?.theme
    if (!themeContext) {
      this.debugWarn(
        `[ThemeSwitchPlugin] ${i18n.translate('vtkviewer.plugin.themeSwitch.ctxThemeNotFound')}`
      )
      return
    }
    themeContext.setTheme(themeId)
    this.isDropdownOpen.value = false
  }

  /** 获取当前主题ID（从 ctx.theme 读取） */
  public getCurrentThemeId(): string {
    return this.ctx?.theme?.currentThemeId.value ?? 'light'
  }

  /** 获取VTK容器元素 */
  private getContainer(): HTMLElement | null {
    const contentContainer = this.ctx?.render?.getContainer?.()
    if (!contentContainer) return null
    return (contentContainer.closest('.iimm-vtk-container') as HTMLElement) ?? contentContainer
  }

  /** 切换下拉菜单 */
  private toggleDropdown(e: Event): void {
    e.stopPropagation()
    this.isDropdownOpen.value = !this.isDropdownOpen.value
    if (this.isDropdownOpen.value) {
      this.dropdownAlignment.update()
    }
  }

  /** 可用主题列表（从 ctx.theme 获取） */
  private get availableThemes(): ThemeConfig[] {
    const themeContext = this.ctx?.theme
    if (!themeContext) return []
    const allThemes = themeContext.getAllThemes()
    const themeIds = this.config.availableThemes ?? Object.keys(BUILTIN_THEMES)
    return themeIds.map(id => allThemes[id]).filter(Boolean)
  }

  /** 当前主题配置（从 ctx.theme 获取） */
  private get currentTheme(): ThemeConfig {
    const themeContext = this.ctx?.theme
    if (!themeContext) return BUILTIN_THEMES.dark
    const theme = themeContext.getTheme(themeContext.currentThemeId.value)
    return theme ?? BUILTIN_THEMES.dark
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () => {
          const currentThemeId = self.getCurrentThemeId()
          const currentTheme = self.currentTheme
          const isOpen = self.isDropdownOpen.value

          return h('div', { class: 'iimm-vtk-toolbar-item iimm-vtk-theme-switch' }, [
            // 主题切换按钮
            h(
              'button',
              {
                class: 'iimm-vtk-toolbar-btn iimm-vtk-theme-switch-btn',
                title:
                  i18n.translate('vtkviewer.theme.current') +
                  ': ' +
                  (i18n.translate('vtkviewer.theme.' + currentTheme.id) || currentTheme.name),
                onClick: (e: Event) => self.toggleDropdown(e)
              },
              [
                // 主题图标（调色板）
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
                      h('circle', { cx: '13.5', cy: '6.5', r: '2.5' }),
                      h('circle', { cx: '19', cy: '11.5', r: '2.5' }),
                      h('circle', { cx: '6', cy: '12.5', r: '2.5' }),
                      h('circle', { cx: '17', cy: '18.5', r: '2.5' }),
                      h('circle', { cx: '8.5', cy: '18.5', r: '2.5' })
                    ]
                  )
                ])
              ]
            ),

            // 下拉菜单
            isOpen &&
              h(
                'div',
                {
                  class: 'iimm-vtk-theme-dropdown',
                  style: getDropdownAlignStyle(self.dropdownAlignment.align.value)
                },
                [
                  h('div', { class: 'iimm-vtk-popup-header' }, [
                    h(
                      'span',
                      { class: 'iimm-vtk-popup-title' },
                      i18n.translate('vtkviewer.plugin.themeSwitch.title')
                    )
                  ]),
                  ...self.availableThemes.map(theme =>
                    h(
                      'div',
                      {
                        class: [
                          'iimm-vtk-theme-option',
                          { 'is-active': theme.id === currentThemeId }
                        ],
                        onClick: () => self.switchTheme(theme.id)
                      },
                      [
                        // 主题预览 — 三色板：背景 / 弹窗 / 强调色
                        h('span', { class: 'iimm-vtk-theme-preview' }, [
                          h('span', {
                            class: 'iimm-vtk-theme-preview-swatch',
                            style: { background: theme.colors.toolbarBg }
                          }),
                          h('span', {
                            class: 'iimm-vtk-theme-preview-swatch',
                            style: { background: theme.colors.popupBg }
                          }),
                          h('span', {
                            class: 'iimm-vtk-theme-preview-swatch',
                            style: { background: theme.colors.btnColorActive }
                          })
                        ]),
                        // 主题名称
                        h(
                          'span',
                          { class: 'iimm-vtk-theme-name' },
                          i18n.translate('vtkviewer.theme.' + theme.id) || theme.name
                        ),
                        // 选中标记
                        theme.id === currentThemeId &&
                          h('span', { class: 'iimm-vtk-theme-check' }, '✓')
                      ]
                    )
                  )
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
