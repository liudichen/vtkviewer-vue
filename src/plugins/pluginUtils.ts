/**
 * 插件配置工具函数
 * 处理分类插件配置的归一化、合并和优先级逻辑
 */

import type { PluginItem, PluginsConfig } from './types'

/** 所有插件分类 */
const PLUGIN_CATEGORIES = ['format', 'toolbar', 'ui', 'service'] as const

/**
 * 将插件配置归一化为 PluginsConfig
 */
export function normalizePluginsConfig(plugins: PluginsConfig | undefined): PluginsConfig {
  if (!plugins) return {}
  return { ...plugins }
}

/**
 * 合并多个插件配置（按优先级从低到高）
 *
 * 规则：同一分类后者 **完全覆盖** 前者
 *
 * @param configs 按优先级从低到高排列的配置列表
 * @returns 合并后的 PluginsConfig
 */
export function mergePluginsConfig(...configs: (PluginsConfig | undefined)[]): PluginsConfig {
  const result: PluginsConfig = {}

  for (const config of configs) {
    if (!config) continue
    for (const key of PLUGIN_CATEGORIES) {
      if (config[key] !== undefined) {
        ;(result as any)[key] = [...config[key]!]
      }
    }
  }

  return result
}

/**
 * 将 PluginsConfig 展平为 PluginItem[]
 * 顺序：format → toolbar → ui → service
 */
export function flattenPluginsConfig(config: PluginsConfig): PluginItem[] {
  const result: PluginItem[] = []

  for (const key of PLUGIN_CATEGORIES) {
    const items = (config as any)[key] as PluginItem[] | undefined
    if (items) {
      result.push(...items)
    }
  }

  return result
}

/**
 * 检查 PluginsConfig 是否为空（无任何插件配置）
 */
export function isPluginsConfigEmpty(config: PluginsConfig): boolean {
  for (const key of PLUGIN_CATEGORIES) {
    const items = (config as any)[key]
    if (items && items.length > 0) return false
  }
  return true
}

/**
 * PluginConfigMerger — 统一的插件配置合并器
 *
 * 将分散的 normalizePluginsConfig / mergePluginsConfig / flattenPluginsConfig /
 * isPluginsConfigEmpty 封装为单一入口，提供简洁的合并 API。
 *
 * 调用方只需：
 *   const merger = new PluginConfigMerger()
 *   const plugins = merger.merge(baseConfig, overrideConfig)  // => PluginItem[]
 *
 * 内部自动处理归一化、空配置检查、合并、展平。
 *
 * @example
 * ```typescript
 * const merger = new PluginConfigMerger()
 * const merged = merger.merge(config.plugins, pluginsOverride)
 * for (const item of merged) {
 *   registry.register(item)
 * }
 * ```
 */
export class PluginConfigMerger {
  /**
   * 合并基础配置和覆盖配置，返回最终的 PluginItem[]
   *
   * @param base 基础配置（低优先级）— PluginsConfig | undefined
   * @param override 覆盖配置（高优先级）— PluginsConfig | undefined
   * @returns 合并并展平后的 PluginItem[]
   */
  merge(base?: PluginsConfig, override?: PluginsConfig): PluginItem[] {
    return flattenPluginsConfig(this.mergeConfigs(base, override))
  }

  /**
   * 合并配置，返回合并后的 PluginsConfig（未展平）
   * 当调用方需要继续处理分类结构时使用
   *
   * 任一配置为空时，直接返回另一方，避免 mergePluginsConfig 清空有效配置。
   */
  mergeConfigs(base?: PluginsConfig, override?: PluginsConfig): PluginsConfig {
    const normalizedBase = normalizePluginsConfig(base)

    if (!override) return normalizedBase

    const normalizedOverride = normalizePluginsConfig(override)

    // 任一配置为空时，直接返回另一方
    if (isPluginsConfigEmpty(normalizedBase)) return normalizedOverride
    if (isPluginsConfigEmpty(normalizedOverride)) return normalizedBase

    return mergePluginsConfig(normalizedBase, normalizedOverride)
  }
}
