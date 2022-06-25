import { inBrowser } from './env'

// 导出的两个用于性能测定的方法
export let mark
export let measure

// 在非生产环境下，判断在浏览器环境，并且支持原生 window.performance 对象
// 才会有 mark 和 measure 方法，否则是 undefined
if (process.env.NODE_ENV !== 'production') {
  // 浏览器原生 performance 对象
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark &&
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    // mark 方法内部调用 window.performance.mark 方法
    mark = tag => perf.mark(tag)
    measure = (name, startTag, endTag) => {
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
