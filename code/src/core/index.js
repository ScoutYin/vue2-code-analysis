import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

// 顾名思义，在Vue构造函数上添加了一些全局的api，比如Vue.use()、Vue.mixin()等
initGlobalAPI(Vue)

// 在 Vue.prototype 上添加了一个是否为服务端渲染的标识，
// 当读取 $isServer 属性时会返回 isServerRendering() 的调用结果
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})
// 在 Vue.prototype 上添加 $ssrContext 属性
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// expose FunctionalRenderContext for ssr runtime helper installation
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

// Vue 的版本号，__VERSION__ 将会在构建 Vue 包时被动态替换成真实版本。见 scripts/config.js
Vue.version = '__VERSION__'

export default Vue
