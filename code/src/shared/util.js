/* @flow */

// Object.freeze() 方法用于冻结一个对象。
// 一个被冻结的对象再也不能被修改；
// 冻结了一个对象则不能向这个对象添加新的属性，
// 不能删除已有属性，不能修改该对象已有属性的可枚举性、可配置性、可写性，
// 以及不能修改已有属性的值。
// 此外，冻结一个对象后该对象的原型也不能被修改。
// freeze() 返回和传入的参数相同的对象。
export const emptyObject = Object.freeze({})

// These helpers produce better VM code in JS engines due to their
// explicitness and function inlining.
// 判断一个值是否为 undefined 或者 null
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

/**
 * 判断一个值是否是 不为 undefined 或者 null 的值
 * @param {*} v
 */
export function isDef (v: any): boolean %checks {
  return v !== undefined && v !== null
}

/**
 * 判断一个值是否严格等于 true，而不是 ==
 * @param {*} v
 */
export function isTrue (v: any): boolean %checks {
  return v === true
}
/**
 * 判断一个值是否严格等于 false 而不是 ==
 * @param {*} v
 */
export function isFalse (v: any): boolean %checks {
  return v === false
}

/**
 * Check if value is primitive.
 * 判断一个值是否为 string、number、symbol 或 boolean 类型的基础类型值
 */
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

/**
 * Quick object check - this is primarily used to tell
 * objects from primitive values when we know the value
 * is a JSON-compliant type.
 * 判断一个值是否为 JSON 对象型的对象
 */
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

/**
 * Get the raw type string of a value, e.g., [object Object].
 */
const _toString = Object.prototype.toString

/**
 * 得到一个值的具体类型
 * 比如 [] -> '[object Array]' -> 'Array'
 * @param {*} value
 * @returns
 */
export function toRawType (value: any): string {
  return _toString.call(value).slice(8, -1)
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 * 判断一个值是否为“纯对象”，如 { a: 1 }，而非其他扩展对象如 RegExp、Date 等
 */
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

/**
 * 判断一个值是否为正则对象
 * @param {*} v
 * @returns
 */
export function isRegExp (v: any): boolean {
  return _toString.call(v) === '[object RegExp]'
}

/**
 * Check if val is a valid array index.
 * 判断一个值是否是合法的数组索引（index）
 */
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  // 数组索引需为大于 0 的有限整数
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}

/**
 * 判断一个值是否为 Promise 对象
 * @param {*} val
 * @returns
 */
export function isPromise (val: any): boolean {
  return (
    // 值不能为 undefined 和 null
    isDef(val) &&
    // 并且它身上存在 then() 和 catch() 方法，则认定为 Promise 对象
    typeof val.then === 'function' &&
    typeof val.catch === 'function'
  )
}

/**
 * Convert a value to a string that is actually rendered.
 * 将一个值转换为在模板渲染中展示的字符串
 */
export function toString (val: any): string {
  // 如果值是 null，就是个空字符串''
  return val == null
    ? ''
    // 如果是个数组，或者是个纯对象并且该纯对象的 toString 方法是原生的 Object.prototype.toString 方法
    // 就使用 JSON.stringify 将该对象转成字符串
    : Array.isArray(val) || (isPlainObject(val) && val.toString === _toString)
      ? JSON.stringify(val, null, 2)
      // 否则直接调用 String(val) 转字符串
      : String(val)
}

/**
 * Convert an input value to a number for persistence.
 * If the conversion fails, return original string.
 * 将输入的值尝试转换为 number，如果得到的是 NaN，则认为转换失败，返回原字符串
 */
export function toNumber (val: string): number | string {
  const n = parseFloat(val)
  return isNaN(n) ? val : n
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 * 创建一个闭包对象，保存映射，然后返回一个函数用于判断某个 key 是否存在该 map 中
 */
export function makeMap (
  str: string,
  expectsLowerCase?: boolean
): (key: string) => true | void {
  // 创建一个闭包对象
  const map = Object.create(null)
  // 通过 ‘,’ 来分割字符串，将分割得到的每个子串作为 key
  const list: Array<string> = str.split(',')
  for (let i = 0; i < list.length; i++) {
    map[list[i]] = true
  }
  return expectsLowerCase
    // 是否转成全小写的key进行判断
    ? val => map[val.toLowerCase()]
    : val => map[val]
}

/**
 * Check if a tag is a built-in tag.
 * 判断一个标签是否为 Vue 框架内置标签
 * 就是判断是否为 slot 和 component 这两个标签
 */
export const isBuiltInTag = makeMap('slot,component', true)

/**
 * Check if an attribute is a reserved attribute.
 * 判断 html 标签上某个 attribute 属性是否为 Vue 内部保留的标签属性
 * Vue 内部保留的标签属性包括：key, ref, slot, slot-scope, is
 */
export const isReservedAttribute = makeMap('key,ref,slot,slot-scope,is')

/**
 * Remove an item from an array.
 * 从数组中移除某个元素
 */
export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}

/**
 * Check whether an object has the property.
 * 判断一个属性是否存在于指定对象的自身属性中
 * 通过 Object.prototype.hasOwnProperty 来判断
 */
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

/**
 * Create a cached version of a pure function.
 * 创建一个带执行结果缓存的函数
 */
export function cached<F: Function> (fn: F): F {
  // 创建一个闭包缓存对象
  const cache = Object.create(null)
  // 返回一个带执行结果缓存的函数
  return (function cachedFn (str: string) {
    // 检查缓存
    const hit = cache[str]
    // 如果命中缓存，则直接返回命中的缓存，否则才执行 fn，并将 fn 的执行结果进行缓存
    return hit || (cache[str] = fn(str))
  }: any)
}

/**
 * Camelize a hyphen-delimited string.
 * 将一个连字符（-）分隔的字符串转成小驼峰格式
 * camel-case -> camelCase
 */
const camelizeRE = /-(\w)/g
export const camelize = cached((str: string): string => {
  return str.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : '')
})

/**
 * Capitalize a string.
 * 将一个字符串的首字母大写
 */
export const capitalize = cached((str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1)
})

/**
 * Hyphenate a camelCase string.
 * 将小驼峰的字符串转换成连字符连接的字符串
 * camelCase -> camel-case
 */
const hyphenateRE = /\B([A-Z])/g
export const hyphenate = cached((str: string): string => {
  return str.replace(hyphenateRE, '-$1').toLowerCase()
})

/**
 * Simple bind polyfill for environments that do not support it,
 * e.g., PhantomJS 1.x. Technically, we don't need this anymore
 * since native bind is now performant enough in most browsers.
 * But removing it would mean breaking code that was able to run in
 * PhantomJS 1.x, so this must be kept for backward compatibility.
 */
// Function.prototype.bind 向后兼容的 polyfill
/* istanbul ignore next */
function polyfillBind (fn: Function, ctx: Object): Function {
  function boundFn (a) {
    const l = arguments.length
    return l
      ? l > 1
        ? fn.apply(ctx, arguments)
        : fn.call(ctx, a)
      : fn.call(ctx)
  }

  boundFn._length = fn.length
  return boundFn
}

// 原生的 Function.prototype.bind
function nativeBind (fn: Function, ctx: Object): Function {
  return fn.bind(ctx)
}

export const bind = Function.prototype.bind
  ? nativeBind
  : polyfillBind

/**
 * Convert an Array-like object to a real Array.
 * 将一个类似数组对象转成真的数组类型
 */
export function toArray (list: any, start?: number): Array<any> {
  // start 指定转换的起点索引
  start = start || 0
  let i = list.length - start
  const ret: Array<any> = new Array(i)
  while (i--) {
    ret[i] = list[i + start]
  }
  return ret
}

/**
 * Mix properties into target object.
 * 将 _from 对象中的 key-value 复制到 to 对象中
 */
export function extend (to: Object, _from: ?Object): Object {
  for (const key in _from) {
    // 如果存在同名的 key，会被 _from 中的覆盖
    to[key] = _from[key]
  }
  return to
}

/**
 * Merge an Array of Objects into a single Object.
 * 将一个数组中的子项（Object）key-value 合并到一个对象中
 */
export function toObject (arr: Array<any>): Object {
  const res = {}
  for (let i = 0; i < arr.length; i++) {
    if (arr[i]) {
      // 将 arr[i] 对象中的 key-value 复制到 res 对象中
      extend(res, arr[i])
    }
  }
  return res
}

/* eslint-disable no-unused-vars */

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/).
 * 一个没有执行逻辑的空函数，啥也不干的函数
 */
export function noop (a?: any, b?: any, c?: any) {}

/**
 * Always return false.
 * 一个总是返回 false 的函数
 */
export const no = (a?: any, b?: any, c?: any) => false

/* eslint-enable no-unused-vars */

/**
 * Return the same value.
 * 一个返回函数输入值的函数
 */
export const identity = (_: any) => _

/**
 * Generate a string containing static keys from compiler modules.
 */
export function genStaticKeys (modules: Array<ModuleOptions>): string {
  return modules.reduce((keys, m) => {
    return keys.concat(m.staticKeys || [])
  }, []).join(',')
}

/**
 * Check if two values are loosely equal - that is,
 * if they are plain objects, do they have the same shape?
 * 判断两个值是否大致相等，也就是看起来相等，
 * 即如果两个都是对象，则看它们的形状、结构上看起来是否一样，而不管它们是否为同一个引用地址
 */
export function looseEqual (a: any, b: any): boolean {
  if (a === b) return true
  const isObjectA = isObject(a)
  const isObjectB = isObject(b)
  // 如果两个都是 Object
  if (isObjectA && isObjectB) {
    try {
      const isArrayA = Array.isArray(a)
      const isArrayB = Array.isArray(b)
      if (isArrayA && isArrayB) {
        // 如果都是数组，判断长度及对应的每项是否同样 looseEqual
        return a.length === b.length && a.every((e, i) => {
          return looseEqual(e, b[i])
        })
      } else if (a instanceof Date && b instanceof Date) {
        // 如果都是 Date 类型，则判断它们的时间戳是否相等
        return a.getTime() === b.getTime()
      } else if (!isArrayA && !isArrayB) {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        // 如果两个都不是数组，则判断它们的 key 的个数及相应的每个键值是否 looseEqual
        return keysA.length === keysB.length && keysA.every(key => {
          return looseEqual(a[key], b[key])
        })
      } else {
        /* istanbul ignore next */
        return false
      }
    } catch (e) {
      /* istanbul ignore next */
      return false
    }
  } else if (!isObjectA && !isObjectB) {
    // 如果都不是 Object，则调用 String() 将它们都转成字符串判断是否相等
    return String(a) === String(b)
  } else {
    return false
  }
}

/**
 * Return the first index at which a loosely equal value can be
 * found in the array (if value is a plain object, the array must
 * contain an object of the same shape), or -1 if it is not present.
 * 利用上面的 looseEqual 方法找到在数组中与目标值 looseEqual 的对应元素的索引
 * 不存在则返回 -1
 */
export function looseIndexOf (arr: Array<mixed>, val: mixed): number {
  for (let i = 0; i < arr.length; i++) {
    if (looseEqual(arr[i], val)) return i
  }
  return -1
}

/**
 * Ensure a function is called only once.
 * 确保一个函数只能被调用一次
 */
export function once (fn: Function): Function {
  // 闭包，标识保存是否已被调用的
  let called = false
  return function () {
    if (!called) {
      called = true
      fn.apply(this, arguments)
    }
  }
}
