const RE_NARGS = /(%|)\{([0-9a-zA-Z_]+)\}/g

export default function (string, ...args) {
  if (args.length === 1 && typeof args[0] === 'object') {
    args = args[0]
  }

  if (!args || !args.hasOwnProperty) {
    args = {}
  }

  return string.replace(RE_NARGS, (match, prefix, i, index) => {
    let result

    if (string[index - 1] === '{' && string[index + match.length] === '}') {
      return i
    } else {
      result = Object.prototype.hasOwnProperty.call(args, i) ? args[i] : null

      if (result === null || result === undefined) {
        return ''
      }

      return result
    }
  })
}
/**
 * 
这个函数是一个用于字符串模板替换的JavaScript函数。其功能是将给定字符串中的占位符替换为相应的参数值。这里是它的具体工作方式：

1.函数定义：function (string, ...args) 接收一个字符串和多个参数。参数可以是单独的值或一个对象。
2.参数处理：
  - 如果传入的参数只有一个，并且是对象类型，则将这个对象作为参数集使用。
  - 如果没有提供参数或参数不包含 hasOwnProperty 方法，会创建一个空对象作为参数集。
3.字符串替换：
  - 使用正则表达式 RE_NARGS 来查找格式为 {key} 的占位符。
  - 对每个匹配项执行替换操作。如果占位符的前一个字符是 { 并且后一个字符是 }（表示这个占位符被双括号包围），则直接返回占位符的键名 i。
  - 如果占位符对应的键在参数集中存在，则使用对应的值进行替换。如果不存在或值为 null 或 undefined，则替换为空字符串。

  这个函数的一个典型用途是在国际化处理或模板生成中，根据不同的输入参数动态生成具有特定数据的字符串。这使得代码可以更灵活地处理不同的数据和语言要求。
 */
