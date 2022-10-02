/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

// 这个函数
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    // 如果你试图对 Vue.config 进行赋值，则会在开发环境时给你提示
    // 告诉你不可以替换 Vue.config 对象，而应该考虑设置 Vue.config.xxx 这样对单独的字段进行设置
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 添加 Vue.config 属性
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 在 Vue 构造函数上暴露这几个工具方法，但是这几个 API 并不是公共的 API，
  // 的确，我们在官方文档上也没有见到他们几个的身影
  // 但是开发者依然可以访问到并使用它们，但是能不用尽量不用，否则会存在一定风险
  // 比如在 Vue 的版本迭代过程中这几个 API 随时有可能会发生变更
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 添加了 Vue.set()，Vue.delete()， Vue.nextTick() 这三个方法
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // Vue v2.6 增加的显式的 observable API
  Vue.observable = <T>(obj: T): T => {
    observe(obj)
    return obj
  }

  // 添加 Vue.options 属性，一个 prototype 为 null 的对象
  Vue.options = Object.create(null)

  // ASSET_TYPES 为 ['component', 'directive', 'filter']
  ASSET_TYPES.forEach(type => {
    // 这段代码给Vue.options 上加了 3 个属性
    // 分别为 components、directives、filters
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)

  initUse(Vue)
  initMixin(Vue)
  initExtend(Vue)
  initAssetRegisters(Vue)
}
