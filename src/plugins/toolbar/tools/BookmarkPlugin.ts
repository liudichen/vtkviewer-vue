/**
 * 书签/视角收藏插件
 * 支持保存、命名、管理和恢复多个相机视角
 * 以下拉弹窗形式展示在工具栏按钮下方
 */

import { defineComponent, h, ref, type Component } from 'vue'

import {
  type CameraState,
  i18n,
  ResetScope,
  type IResettableActions,
  type ResetAction
} from '@/core'
import { BuiltinCommands, BuiltinEvents } from '@/configs'
import { BookmarkFilledIcon, BookmarkIcon, BookmarkAddIcon } from '@/icons'
import {
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  type PluginIcon,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import {
  createDropdownAlignment,
  getDropdownAlignStyle,
  renderToolbarIcon,
  normalizeShortcutConfig
} from '@/plugins/toolbar/utils'

// ============================================================
// 类型定义
// ============================================================

/** 书签条目 */
interface BookmarkEntry {
  /** 唯一标识 */
  id: string
  /** 书签名称 */
  name: string
  /** 保存的相机状态 */
  cameraState: CameraState
  /** 创建时间戳 */
  createdAt: number
}

/** 书签插件配置 */
export interface BookmarkPluginConfig extends ToolbarPluginConfig {
  /** 最大书签数量，默认 20 */
  maxBookmarks?: number
  /** 场景清空时是否自动清除书签，默认 true */
  clearOnSceneClear?: boolean
  /** 添加书签图标 */
  addIcon?: PluginIcon
}

// ============================================================
// 插件实现
// ============================================================

export class BookmarkPlugin
  extends PluginBase<BookmarkPluginConfig>
  implements IToolbarPlugin, IResettableActions
{
  readonly metadata = {
    id: 'bookmark',
    name: 'BookmarkPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.bookmark.description')
  }

  readonly order = 7
  readonly defaultConfig: BookmarkPluginConfig = {
    enabled: true,
    hideWhenNoModel: true,
    clearOnSceneClear: true,
    icon: BookmarkIcon,
    addIcon: BookmarkAddIcon,
    // shortcut: 'B',
    maxBookmarks: 20
  }

  // ============================================================
  // 响应式状态
  // ============================================================

  /** 书签列表 */
  private bookmarks = ref<BookmarkEntry[]>([])

  /** 是否显示下拉弹窗 */
  private isDropdownOpen = ref(false)

  /** 下拉弹窗对齐管理器（运行时自动根据按钮位置判断向左/向右展开） */
  private dropdownAlignment = createDropdownAlignment('iimm-vtk-bookmark')

  /** 新增书签名称输入 */
  private editingName = ref('')

  /** 提示信息 */
  private feedbackText = ref('')
  private feedbackType = ref<'success' | 'error'>('success')

  /** 计数器，用于自动生成书签名称 */
  private autoNameCounter = 1

  /** 最大书签数量（快捷访问） */
  private get maxBookmarks(): number {
    return this.config.maxBookmarks ?? 20
  }

  // ============================================================
  // 生命周期
  // ============================================================

  protected onInit(): void {
    // 场景清空时按配置清除书签
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => {
      this.isDropdownOpen.value = false
      if (this.config.clearOnSceneClear) {
        this.bookmarks.value = []
        this.autoNameCounter = 1
      }
    })

    // 监听点击外部关闭弹窗
    this.setupOutsideClickListener(this.handleOutsideClick, true)
  }

  protected onDispose(): void {
    this.bookmarks.value = []
    this.isDropdownOpen.value = false
  }

  /** 处理点击外部关闭弹窗 */
  private handleOutsideClick = (e: MouseEvent) => {
    if (!this.isDropdownOpen.value) return
    const target = e.target as HTMLElement
    if (!target.closest('.iimm-vtk-bookmark')) {
      this.isDropdownOpen.value = false
      this.editingName.value = ''
    }
  }

  // ============================================================
  // 书签管理
  // ============================================================

  /**
   * 添加书签
   * 支持输入/不输入名称，不输入时自动生成 autoName + N
   */
  private addBookmark(): void {
    const autoPrefix = i18n.translate('vtkviewer.plugin.bookmark.autoName')

    // 名称处理：未输入时自动生成
    let name = this.editingName.value.trim()
    if (!name) {
      name = autoPrefix + ' ' + this.autoNameCounter++
    }

    const maxBookmarks = this.config.maxBookmarks ?? 20
    if (this.bookmarks.value.length >= maxBookmarks) {
      this.showFeedback(
        i18n.translate('vtkviewer.plugin.bookmark.maxFeedback') + ' ' + maxBookmarks,
        'error'
      )
      return
    }

    // 检查名称是否重复
    if (this.bookmarks.value.some(b => b.name === name)) {
      name = autoPrefix + ' ' + this.autoNameCounter++
      // 再检查一次自动生成的是否重复
      while (this.bookmarks.value.some(b => b.name === name)) {
        name = autoPrefix + ' ' + this.autoNameCounter++
      }
    }

    const cameraState = this.ctx.render.saveCameraState()
    const bookmark: BookmarkEntry = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      cameraState,
      createdAt: Date.now()
    }

    this.bookmarks.value = [...this.bookmarks.value, bookmark]
    this.editingName.value = ''
    this.showFeedback(
      i18n.translate('vtkviewer.plugin.bookmark.savedFeedback') + ' ' + name,
      'success'
    )
  }

  /**
   * 恢复书签视角
   */
  private restoreBookmark(bookmark: BookmarkEntry): void {
    this.isDropdownOpen.value = false
    this.ctx.commands.execute(BuiltinCommands.RESTORE_CAMERA, bookmark.cameraState)
  }

  /**
   * 删除书签
   */
  private deleteBookmark(id: string, event: Event): void {
    event.stopPropagation()
    this.bookmarks.value = this.bookmarks.value.filter(b => b.id !== id)
  }

  /**
   * 清除全部书签，重置自动命名计数器
   */
  private clearAllBookmarks(): void {
    if (this.bookmarks.value.length === 0) return
    this.bookmarks.value = []
    this.autoNameCounter = 1
    this.showFeedback(i18n.translate('vtkviewer.plugin.bookmark.cleared'), 'success')
  }

  /**
   * 显示反馈提示
   */
  private showFeedback(text: string, type: 'success' | 'error'): void {
    this.feedbackText.value = text
    this.feedbackType.value = type
    setTimeout(() => {
      this.feedbackText.value = ''
    }, 2000)
  }

  /** 切换下拉弹窗 */
  private toggleDropdown(e: Event): void {
    e.stopPropagation()
    this.isDropdownOpen.value = !this.isDropdownOpen.value
    if (!this.isDropdownOpen.value) {
      this.editingName.value = ''
    } else {
      this.dropdownAlignment.update()
    }
  }

  // ============================================================
  // 重置接口
  // ============================================================

  registerResetActions(): ResetAction[] {
    return [
      {
        name: 'resetBookmark',
        scope: ResetScope.GLOBAL,
        isDefault: true,
        description: i18n.translate('vtkviewer.plugin.bookmark.resetDesc'),
        execute: () => {
          this.bookmarks.value = []
          this.isDropdownOpen.value = false
          this.editingName.value = ''
          this.autoNameCounter = 1
        }
      }
    ]
  }

  // ============================================================
  // 渲染 - 工具栏按钮 + 下拉弹窗
  // ============================================================

  render(): Component {
    const self = this
    return defineComponent({
      setup() {
        const el = ref<HTMLElement | null>(null)

        return () => {
          const count = self.bookmarks.value.length
          const isOpen = self.isDropdownOpen.value

          // ---------- 按钮 ----------
          const buttonContent: any[] = []

          // 图标：有书签时用实心（filled），无书签时用空心（outline）
          const icon = renderToolbarIcon(count > 0 ? BookmarkFilledIcon : self.config.icon) ?? ''
          buttonContent.push(icon)

          // 书签数量徽标
          if (count > 0) {
            buttonContent.push(
              h(
                'span',
                {
                  class: 'iimm-vtk-bookmark-badge'
                },
                String(count > 99 ? '99+' : count)
              )
            )
          }

          const button = h(
            'button',
            {
              class: ['iimm-vtk-toolbar-btn', { 'is-active': isOpen }],
              title: isOpen
                ? i18n.translate('vtkviewer.plugin.bookmark.tooltipClose')
                : count > 0
                  ? i18n.translate('vtkviewer.plugin.bookmark.tooltip') + ' (' + count + ')'
                  : i18n.translate('vtkviewer.plugin.bookmark.tooltip'),
              onClick: (e: Event) => self.toggleDropdown(e)
            },
            buttonContent
          )

          // 如果没有模型且配置为隐藏，不渲染
          const modelCount = self.ctx?.scene?.modelCount?.value ?? 0
          if (self.config.hideWhenNoModel && modelCount === 0 && !isOpen) {
            return null
          }

          // ---------- 下拉弹窗 ----------
          let dropdown: any = null
          if (isOpen) {
            const panelChildren: any[] = []

            // ---- 标题行（统一弹窗头部） ----
            const headerChildren: any[] = [
              h(
                'span',
                { class: 'iimm-vtk-popup-title' },
                i18n.translate('vtkviewer.plugin.bookmark.title')
              )
            ]
            if (count > 0) {
              headerChildren.push(
                h('span', { class: 'iimm-vtk-bookmark-count' }, `${count}/${self.maxBookmarks}`)
              )
            }
            // 清除全部按钮（有书签时显示）
            if (count > 0) {
              headerChildren.push(
                h(
                  'button',
                  {
                    class: 'iimm-vtk-bookmark-clear-btn',
                    title: i18n.translate('vtkviewer.plugin.bookmark.clearAllTitle'),
                    onClick: (e: Event) => {
                      e.stopPropagation()
                      self.clearAllBookmarks()
                    }
                  },
                  i18n.translate('vtkviewer.plugin.bookmark.clearAll')
                )
              )
            }
            panelChildren.push(h('div', { class: 'iimm-vtk-popup-header' }, headerChildren))

            // ---- 添加书签栏 ----
            const isFull = count >= self.maxBookmarks
            const hasInput = self.editingName.value.trim().length > 0
            const maxHint =
              i18n.translate('vtkviewer.plugin.bookmark.maxHint') + ' (' + self.maxBookmarks + ')'
            const saveText = isFull
              ? i18n.translate('vtkviewer.plugin.bookmark.full')
              : hasInput
                ? i18n.translate('vtkviewer.plugin.bookmark.save')
                : i18n.translate('vtkviewer.plugin.bookmark.saveCurrent')
            panelChildren.push(
              h('div', { class: 'iimm-vtk-bookmark-add' }, [
                h('input', {
                  class: 'iimm-vtk-bookmark-input',
                  type: 'text',
                  placeholder: isFull
                    ? maxHint
                    : i18n.translate('vtkviewer.plugin.bookmark.inputPlaceholder'),
                  value: self.editingName.value,
                  disabled: isFull,
                  onInput: (e: Event) => {
                    self.editingName.value = (e.target as HTMLInputElement).value
                  },
                  onKeydown: (e: KeyboardEvent) => {
                    if (e.key === 'Enter' && !isFull) {
                      self.addBookmark()
                    }
                  }
                }),
                h(
                  'button',
                  {
                    class: 'iimm-vtk-bookmark-save-btn',
                    title: isFull ? maxHint : i18n.translate('vtkviewer.plugin.bookmark.saveTip'),
                    disabled: isFull,
                    onClick: () => {
                      if (!isFull) self.addBookmark()
                    }
                  },
                  [
                    h('span', { class: 'iimm-vtk-bookmark-save-icon' }, isFull ? '!' : '+'),
                    h('span', null, saveText)
                  ]
                )
              ])
            )

            // ---- 反馈信息 ----
            if (self.feedbackText.value) {
              panelChildren.push(
                h(
                  'div',
                  {
                    class: ['iimm-vtk-bookmark-toast', `is-${self.feedbackType.value}`]
                  },
                  self.feedbackText.value
                )
              )
            }

            // ---- 分隔线 + 书签列表 ----
            if (count > 0) {
              panelChildren.push(h('div', { class: 'iimm-vtk-bookmark-divider' }))

              const listItems = self.bookmarks.value.map(bookmark =>
                h(
                  'div',
                  {
                    class: 'iimm-vtk-bookmark-item',
                    title:
                      i18n.translate('vtkviewer.plugin.bookmark.restore') + ' ' + bookmark.name,
                    onClick: () => self.restoreBookmark(bookmark)
                  },
                  [
                    h('span', { class: 'iimm-vtk-bookmark-item-icon' }, '📷'),
                    h('span', { class: 'iimm-vtk-bookmark-item-name' }, bookmark.name),
                    h(
                      'button',
                      {
                        class: 'iimm-vtk-bookmark-item-delete',
                        title: i18n.translate('vtkviewer.plugin.bookmark.delete'),
                        onClick: (e: Event) => self.deleteBookmark(bookmark.id, e)
                      },
                      '✕'
                    )
                  ]
                )
              )

              panelChildren.push(h('div', { class: 'iimm-vtk-bookmark-list' }, listItems))
            } else {
              // 空状态
              panelChildren.push(
                h('div', { class: 'iimm-vtk-bookmark-empty' }, [
                  h('div', { class: 'iimm-vtk-bookmark-empty-icon' }, '📍'),
                  h(
                    'div',
                    { class: 'iimm-vtk-bookmark-empty-text' },
                    i18n.translate('vtkviewer.plugin.bookmark.emptyHint')
                  )
                ])
              )
            }

            dropdown = h(
              'div',
              {
                ref: el,
                class: 'iimm-vtk-bookmark-dropdown',
                style: getDropdownAlignStyle(self.dropdownAlignment.align.value)
              },
              panelChildren
            )
          }

          // ---------- 整体容器 ----------
          return h(
            'div',
            {
              class: 'iimm-vtk-toolbar-item iimm-vtk-bookmark'
            },
            [button, dropdown].filter(Boolean)
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return true
  }

  // ============================================================
  // 快捷键
  // ============================================================

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'bookmark',
      i18n.translate('vtkviewer.plugin.bookmark.shortcutDesc')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => {
        this.isDropdownOpen.value = !this.isDropdownOpen.value
        if (!this.isDropdownOpen.value) {
          this.editingName.value = ''
        }
      },
      description: s.description
    }))
  }
}
