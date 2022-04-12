/* not type checking this file because flow doesn't play well with Proxy */

import config from 'core/config'
import { warn, makeMap, isNative } from '../util/index'

// 声明变量，但是不直接将函数赋值给它
let initProxy

// 在开发环境下initProxy才会被赋值，目的主要是在开发环境给开发者一些开发时的友好提示
// 生产环境时，在core/instance/init.js中将直接vm._renderProxy = vm
if (process.env.NODE_ENV !== 'production') {
  // render函数（或template）中允许使用的全局对象
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,BigInt,' +
    'require' // for Webpack/Browserify
  )

  // 实例上不存在的属性，开发环境时会提示，这个警告相信我们都遇到过
  const warnNonPresent = (target, key) => {
    warn(
      `Property or method "${key}" is not defined on the instance but ` +
      'referenced during render. Make sure that this property is reactive, ' +
      'either in the data option, or for class-based components, by ' +
      'initializing the property. ' +
      'See: https://vuejs.org/v2/guide/reactivity.html#Declaring-Reactive-Properties.',
      target
    )
  }

  // 提示开发者不能以'$'或'_'开头命名属性，防止与Vue框架内部的属性冲突
  const warnReservedPrefix = (target, key) => {
    warn(
      `Property "${key}" must be accessed with "$data.${key}" because ` +
      'properties starting with "$" or "_" are not proxied in the Vue instance to ' +
      'prevent conflicts with Vue internals. ' +
      'See: https://vuejs.org/v2/api/#data',
      target
    )
  }

  // 当前执行环境是否支持原生的Proxy
  const hasProxy =
    typeof Proxy !== 'undefined' && isNative(Proxy)

  if (hasProxy) {
    // 是否为内置的事件修饰符
    const isBuiltInModifier = makeMap('stop,prevent,self,ctrl,shift,alt,meta,exact')
    config.keyCodes = new Proxy(config.keyCodes, {
      // 属性设置操作的捕捉器
      set (target, key, value) {
        // 如果开发者在自定义键位别名时将内置的修饰符覆盖了，这种操作是不被允许的，
        // 比如Vue.config.keyCodes.shift = 16，不允许，因为存在内置的shift修饰符
        if (isBuiltInModifier(key)) {
          warn(`Avoid overwriting built-in modifier in config.keyCodes: .${key}`)
          return false
        } else {
          target[key] = value
          return true
        }
      }
    })
  }

  // 在 vm.$options.render方法中使用了 with 语句块，指定内部代码的执行环境为 this
  // 由于 render 函数调用的时候使用 call 指定了其 this 指向为 vm._renderProxy，
  // 所以 with 语句块内代码的执行环境就是 vm._renderProxy，
  // 因此在 with 语句块内访问 a 就相当于访问 vm._renderProxy 的 a 属性，
  // with 语句块内访问变量将会被 Proxy 的 has 代理所拦截，所以就会执行 has 函数内的代码
  const hasHandler = {
    // in 操作符的捕捉器
    has (target, key) {
      const has = key in target
      // isAllowed 为真的条件： 是全局对象，或者以'_'开头的方法或属性（Vue内部的，如_c等）
      const isAllowed = allowedGlobals(key) ||
        (typeof key === 'string' && key.charAt(0) === '_' && !(key in target.$data))
      if (!has && !isAllowed) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      // has表示当前实例对象上或其原型链上有这个属性
      // 如果没有，则看是不是允许使用的全局对象
      return has || !isAllowed
    }
  }

  const getHandler = {
    // 属性读取操作的捕捉器
    get (target, key) {
      if (typeof key === 'string' && !(key in target)) {
        if (key in target.$data) warnReservedPrefix(target, key)
        else warnNonPresent(target, key)
      }
      return target[key]
    }
  }

  // initProxy在这里被赋值为一个函数
  initProxy = function initProxy (vm) {
    if (hasProxy) {
      // determine which proxy handler to use
      const options = vm.$options
      // render._withStripped 只在单元测试（test/unit/features/instance/render-proxy.spec.js）中被设置为true，
      // 实际上我们的开发和生产环境 render._withStripped 都是undefined，也就是说会走 hasHandler
      const handlers = options.render && options.render._withStripped
        ? getHandler
        : hasHandler
      // Proxy MDN文档：https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Proxy
      vm._renderProxy = new Proxy(vm, handlers)
    } else {
      // 不支持原生Proxy时，则同生产环境，直接赋值为vm
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
