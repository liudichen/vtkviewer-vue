/**
 * 命令注册表
 * 支持跨插件命令执行
 * 命令ID命名规范：{pluginId}:{commandName}
 */

import { i18n } from './I18nManager'

export interface CommandHandler<T = void> {
  execute(...args: any[]): T
  canExecute?(): boolean
}

/**
 * 命令注册表接口
 */
export interface CommandRegistry {
  /** 注册命令 */
  register<T = void>(id: string, handler: CommandHandler<T>): void
  /** 注销命令 */
  unregister(id: string): void
  /** 执行命令 */
  execute<T = void>(id: string, ...args: any[]): T | undefined
  /** 命令是否已注册 */
  has(id: string): boolean
}

/**
 * 命令注册表实现
 */
export class CommandRegistryImpl implements CommandRegistry {
  private handlers = new Map<string, CommandHandler>()

  register<T = void>(id: string, handler: CommandHandler<T>): void {
    if (this.handlers.has(id)) {
      console.warn(
        `[CommandRegistry] ${i18n.translate('vtkviewer.command.alreadyRegistered')}:${id}`
      )
    }
    this.handlers.set(id, handler)
  }

  unregister(id: string): void {
    this.handlers.delete(id)
  }

  execute<T = void>(id: string, ...args: any[]): T | undefined {
    const handler = this.handlers.get(id)
    if (!handler) {
      console.warn(`[CommandRegistry] ${i18n.translate('vtkviewer.command.notFound')}:${id}`)
      return undefined
    }
    if (handler.canExecute && !handler.canExecute()) {
      console.warn(`[CommandRegistry] ${i18n.translate('vtkviewer.command.cannotExecute')}:${id}`)
      return undefined
    }
    return handler.execute(...args) as T
  }

  has(id: string): boolean {
    return this.handlers.has(id)
  }

  /** 清除所有命令 */
  clear(): void {
    this.handlers.clear()
  }
}
