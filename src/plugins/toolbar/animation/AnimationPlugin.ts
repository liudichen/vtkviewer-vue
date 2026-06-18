/**
 * 动画插件
 * 支持场景动画播放控制
 */

import { defineComponent, h, ref } from 'vue'

import { i18n } from '@/core'
import { BuiltinEvents } from '@/configs'
import { PlayIcon, PauseIcon } from '@/icons'
import {
  type PluginIcon,
  type ToolbarPluginConfig,
  type KeyboardShortcutConfigItem,
  type KeyboardShortcutAction,
  type IToolbarPlugin,
  PluginType
} from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { renderToolbarIcon, normalizeShortcutConfig } from '@/plugins/toolbar/utils'

/** 动画插件配置 */
export interface AnimationPluginConfig extends ToolbarPluginConfig {
  /** 播放状态图标 */
  playIcon?: PluginIcon
  /** 暂停状态图标 */
  pauseIcon?: PluginIcon
}

export class AnimationPlugin extends PluginBase<AnimationPluginConfig> implements IToolbarPlugin {
  readonly metadata = {
    id: 'animation',
    name: 'AnimationPlugin',
    type: PluginType.TOOLBAR,
    description: i18n.translate('vtkviewer.plugin.animation.description')
  }

  readonly order = 0
  readonly defaultConfig: AnimationPluginConfig = {
    enabled: true,
    shortcut: 'Enter',
    icon: PlayIcon,
    playIcon: PlayIcon,
    pauseIcon: PauseIcon,
    hideWhenNoModel: true
  }

  private isPlaying = ref(false)
  private currentFrame = ref(0)
  private totalFrames = ref(0)

  protected onInit(): void {
    // 注册动画命令
    this.registerCommand('animation:play', {
      execute: () => this.play()
    })
    this.registerCommand('animation:pause', {
      execute: () => this.pause()
    })
    this.registerCommand('animation:goToFrame', {
      execute: (frame: number) => this.goToFrame(frame)
    })
  }

  protected onDispose(): void {}

  private play(): void {
    this.isPlaying.value = true
    this.ctx.events.emit(BuiltinEvents.ANIMATION_PLAY)
  }

  private pause(): void {
    this.isPlaying.value = false
    this.ctx.events.emit(BuiltinEvents.ANIMATION_PAUSE)
  }

  private goToFrame(frame: number): void {
    this.currentFrame.value = frame
  }

  render() {
    const self = this
    return defineComponent({
      setup() {
        return () =>
          h('div', { class: 'iimm-vtk-toolbar-group' }, [
            h(
              'button',
              {
                class: 'iimm-vtk-toolbar-btn',
                title: self.isPlaying.value
                  ? self.config.shortcut
                    ? i18n.translate('vtkviewer.plugin.animation.pause') +
                      ' (' +
                      String(self.config.shortcut) +
                      ')'
                    : i18n.translate('vtkviewer.plugin.animation.pause')
                  : self.config.shortcut
                    ? i18n.translate('vtkviewer.plugin.animation.play') +
                      ' (' +
                      String(self.config.shortcut) +
                      ')'
                    : i18n.translate('vtkviewer.plugin.animation.play'),
                onClick: () => (self.isPlaying.value ? self.pause() : self.play())
              },
              renderToolbarIcon(
                self.isPlaying.value ? self.config.pauseIcon : self.config.playIcon,
                undefined,
                self.isPlaying.value
              ) ?? ''
            ),
            h(
              'span',
              { class: 'iimm-vtk-toolbar-icon' },
              `${self.currentFrame.value} / ${self.totalFrames.value}`
            )
          ])
      }
    })
  }

  isVisible(): boolean {
    return this.totalFrames.value > 0
  }

  getShortcutConfig(): KeyboardShortcutConfigItem[] {
    return normalizeShortcutConfig(
      this.config.shortcut,
      'animation',
      i18n.translate('vtkviewer.plugin.animation.name')
    )
  }

  getKeyboardShortcutActions(): KeyboardShortcutAction[] {
    return this.getShortcutConfig().map(s => ({
      name: s.action,
      key: typeof s.key === 'string' ? s.key.toLowerCase() : '',
      action: () => (this.isPlaying.value ? this.pause() : this.play()),
      description: s.description
    }))
  }
}
