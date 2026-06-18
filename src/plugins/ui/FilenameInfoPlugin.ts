/**
 * 文件名信息展示插件
 * 在视口底部显示当前加载模型的文件名或来源信息
 *
 * 显示规则：
 *   - 本地文件 → 显示文件名
 *   - 远程 URL → 尝试从 URL 解析文件名，解析不到则显示完整路径
 *   - ArrayBuffer 无文件名 → 不显示
 *
 * @module plugins/ui/FilenameInfoPlugin
 */

import { defineComponent, h, inject, ref } from 'vue'

import { BuiltinEvents } from '@/configs'
import { type IUIPlugin, type PluginConfig, PluginType } from '@/plugins/types'
import { PluginBase } from '@/plugins/PluginBase'
import { viewerContextKey } from '@/plugins/injectionKeys'

/** 文件名信息插件配置 */
export interface FilenameInfoPluginConfig extends PluginConfig {
  /** 无模型时是否隐藏，默认 true */
  hideWhenNoModel?: boolean
}

/**
 * 从 URL 字符串中尝试解析文件名。
 * 取最后一个路径段，去掉查询参数和 hash。
 *
 * @param url URL 字符串
 * @returns 解析出的文件名，无法解析则返回完整输入
 */
function parseFilenameFromUrl(url: string): string {
  try {
    const pathname = url.split('?')[0].split('#')[0]
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length > 0) {
      return decodeURIComponent(segments[segments.length - 1])
    }
  } catch {
    // 解码失败时忽略，返回原值
  }
  return url
}

/** 场景加载事件 payload 类型 */
interface SceneLoadedPayload {
  format: string
  filename?: string
  supportsColorBy?: boolean
}

/**
 * 文件名信息展示插件
 * 在视口底部以半透明状态栏形式显示当前加载模型的文件名
 */
export class FilenameInfoPlugin extends PluginBase<FilenameInfoPluginConfig> implements IUIPlugin {
  readonly metadata = {
    id: 'filenameInfo',
    name: 'FilenameInfoPlugin',
    type: PluginType.UI,
    description: '在视口底部显示当前加载模型的文件名或来源信息'
  }
  readonly uiType = 'overlay' as const
  readonly order = 2
  readonly defaultConfig: FilenameInfoPluginConfig = {
    enabled: true,
    hideWhenNoModel: true
  }

  /** 当前显示的文件名文本 */
  private displayName = ref('')

  /** 当前显示的文件名类型提示 */
  private sourceType = ref<'file' | 'url'>('file')

  // ============================================================
  // 生命周期
  // ============================================================

  protected onInit(): void {
    // 监听场景加载事件
    this.onEvent('scene:loaded', (payload: SceneLoadedPayload) => {
      const name = this.resolveDisplayName(payload.filename)
      if (name) {
        this.displayName.value = name
        // 判断来源：包含 "://" 即为 URL，否则为本地文件
        this.sourceType.value = (payload.filename ?? '').includes('://') ? 'url' : 'file'
      } else {
        this.displayName.value = ''
      }
    })

    // 监听场景清除事件
    this.onEvent(BuiltinEvents.SCENE_CLEARED, () => {
      this.displayName.value = ''
    })
  }

  // ============================================================
  // 文件名解析
  // ============================================================

  /**
   * 根据输入解析显示名称。
   *
   * @param raw 场景加载事件中的 filename 字段
   * @returns 处理后的显示名称，无效时返回空字符串
   */
  private resolveDisplayName(raw?: string): string {
    if (!raw) return ''

    if (raw.includes('://')) {
      // URL 模式：尝试解析文件名
      const parsed = parseFilenameFromUrl(raw)
      // 如果解析出来的和原始值一样且没有文件扩展名特征，仍显示完整路径
      if (parsed === raw && !raw.match(/[?#]/)) {
        return raw
      }
      return parsed
    }

    // 本地文件名直接使用
    return raw
  }

  // ============================================================
  // 渲染
  // ============================================================

  render() {
    const self = this
    return defineComponent({
      setup() {
        const ctx = inject(viewerContextKey)!

        return () => {
          // 无模型时隐藏
          if (ctx.scene.modelCount.value === 0) return null

          const name = self.displayName.value
          if (!name) return null

          const isUrl = self.sourceType.value === 'url'

          return h(
            'div',
            {
              class: 'iimm-vtk-filename-info'
            },
            [
              // 图标
              h('span', { class: 'iimm-vtk-filename-info-icon' }, isUrl ? '🌐' : '📄'),
              // 文件名
              h(
                'span',
                {
                  class: 'iimm-vtk-filename-info-text',
                  title: name
                },
                name
              )
            ]
          )
        }
      }
    })
  }

  isVisible(): boolean {
    return this.ctx?.scene?.modelCount?.value > 0 && !!this.displayName.value
  }

  getPosition(): 'bottom' {
    return 'bottom'
  }
}
