/**
 * 配置访问器
 * 提供类型安全的配置访问能力
 */

/**
 * 配置访问器接口
 */
export interface ConfigAccessor {
  /** 获取配置值 */
  get<T>(key: string): T | undefined
  /** 获取配置值（带默认值） */
  get<T>(key: string, defaultValue: T): T
  /** 设置配置值 */
  set<T>(key: string, value: T): void
  /** 检查配置是否存在 */
  has(key: string): boolean
  /** 获取所有配置 */
  getAll(): Record<string, any>
}

/**
 * 配置访问器实现
 */
export class ConfigAccessorImpl implements ConfigAccessor {
  private config: Record<string, any>

  constructor(initialConfig: Record<string, any> = {}) {
    this.config = { ...initialConfig }
  }

  get<T>(key: string): T | undefined
  get<T>(key: string, defaultValue: T): T
  get<T>(key: string, defaultValue?: T): T | undefined {
    const value = this.config[key]
    return value !== undefined ? (value as T) : defaultValue
  }

  set<T>(key: string, value: T): void {
    this.config[key] = value
  }

  has(key: string): boolean {
    return key in this.config
  }

  getAll(): Record<string, any> {
    return { ...this.config }
  }

  /** 更新配置（合并） */
  update(patch: Record<string, any>): void {
    Object.assign(this.config, patch)
  }
}
