import { nextTick } from 'vue'

/**
 * 让出执行权给浏览器，确保 Vue DOM 更新已提交。
 *
 * 分两步：
 *   1. nextTick — 等待 Vue 响应式 DOM 更新完成
 *   2. setTimeout(fn, 0) — 将控制权交还给浏览器事件循环，确保本轮绘制完成
 */
export async function yieldToBrowser(): Promise<void> {
  await nextTick()
  await new Promise<void>(resolve => setTimeout(resolve, 0))
}
