/**
 * 浏览器 polyfills
 * 为 lib 的使用者提供 Node.js 原生模块在浏览器环境中的降级实现
 * 必须在所有其他模块之前加载
 */
import { EventEmitter } from 'events'

/**
 * 将 EventEmitter 注入全局作用域，确保 xmlbuilder2 等依赖
 * 在浏览器环境中能正确访问 events 模块
 */
const g = globalThis as Record<string, unknown>

if (typeof g.EventEmitter === 'undefined') {
  g.EventEmitter = EventEmitter
}
