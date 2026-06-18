/**
 * 资源释放注册表
 * 支持自动识别 VTK.js 对象并释放
 */

import { i18n } from './I18nManager'

/** 可释放对象接口 */
export interface Disposable {
  delete?: () => void
  setRenderWindow?: (rw: any) => void
}

/**
 * 资源释放注册表接口
 */
export interface DisposalRegistry {
  /** 注册释放函数（回调形式） */
  register(releaseFn: () => void): void
  /** 注册 VTK.js 可释放对象（自动识别并调用 delete() 或 setRenderWindow(null) 等） */
  registerDisposable(disposable: Disposable): void
  /** 释放所有已注册的资源 */
  dispose(): void
}

/**
 * 资源释放注册表实现
 */
export class DisposalRegistryImpl implements DisposalRegistry {
  private releaseFns: (() => void)[] = []
  private disposed = false

  register(releaseFn: () => void): void {
    if (this.disposed) {
      // console.warn('[DisposalRegistry] Registry already disposed, skipping registration')
      return
    }
    this.releaseFns.push(releaseFn)
  }

  registerDisposable(disposable: Disposable): void {
    this.register(() => {
      try {
        // 优先调用 delete()（VTK.js 对象的标准释放方法）
        if (typeof disposable.delete === 'function') {
          disposable.delete()
          return
        }
        // 回退：调用 setRenderWindow(null) 断开关联
        if (typeof disposable.setRenderWindow === 'function') {
          disposable.setRenderWindow(null)
        }
      } catch (error) {
        console.warn(
          `[DisposalRegistry] ${i18n.translate('vtkviewer.disposal.errorDisposing')}: `,
          error
        )
      }
    })
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true

    // 逆序释放（后注册的先释放）
    for (let i = this.releaseFns.length - 1; i >= 0; i--) {
      try {
        this.releaseFns[i]()
      } catch (error) {
        console.warn(
          `[DisposalRegistry] ${i18n.translate('vtkviewer.disposal.errorInRelease')}: `,
          error
        )
      }
    }
    this.releaseFns = []
  }

  /** 是否已释放 */
  isDisposed(): boolean {
    return this.disposed
  }
}
