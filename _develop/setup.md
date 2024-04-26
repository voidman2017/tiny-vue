观察 packages/vue/src/ 中的组件封装，可以发现所有的组件的 setup 基本如下：

```
 setup(props, context) {
    return setup({ props, context, renderless, api, h })
  }
```

这里对setup进行了封装，调用 packages/vue-common/src/index.ts 中封装的setup方法返回一个对象会暴露给模板和组件实例。

接下里逐步解析封装的目的。

packages/vue-common/src/index.ts 中封装的setup

逻辑如下：

```
export const setup = ({ props, context, renderless, api, extendOptions = {}, mono = false, classes = {} }) => {
  const render = typeof props.tiny_renderless === 'function' ? props.tiny_renderless : renderless

  // 获取组件级配置和全局配置（inject需要带有默认值，否则控制台会报警告）
  const globalDesignConfig: DesignConfig = customDesignConfig.designConfig || hooks.inject(design.configKey, {})
  const designConfig = globalDesignConfig?.components?.[getComponentName().replace($prefix, '')]

  const specifyPc = typeof process === 'object' ? process.env?.TINY_MODE : null
  const utils = {
    $prefix,
    t,
    ...tools(context, resolveMode(props, context)),
    designConfig,
    globalDesignConfig,
    useBreakpoint
  }
  if (specifyPc !== 'pc') {
    utils.mergeClass = mergeClass
  }

  utils.vm.theme = resolveTheme(props, context)
  utils.vm.chartTheme = resolveChartTheme(props, context)
  const sdk = render(props, hooks, utils, extendOptions)

  // 加载全局配置，合并api
  if (typeof designConfig?.renderless === 'function') {
    Object.assign(sdk, designConfig.renderless(props, hooks, utils, sdk))
  }

  const attrs = {
    t,
    vm: utils.vm,
    f: bindFilter,
    a: filterAttrs,
    d: utils.defineInstanceProperties,
    dp: utils.defineParentInstanceProperties,
    gcls: (key) => getElementCssClass(classes, key)
  }
  if (specifyPc !== 'pc') {
    attrs.m = mergeClass
  }
  /**
   * 修复 render 函数下 this.slots 不会动态更新的问题（vue3 环境没有问题）
   * 解决方法：在 instance 下注入 slots、scopedSlots
   * 注意：renderless 下尽量使用 vm.$refs、vm.$slots
   */
  attrs.d({
    slots: { get: () => utils.vm.$slots, configurable: true },
    scopedSlots: { get: () => utils.vm.$scopedSlots, configurable: true }
  })

  attrs.dp({
    slots: { get: () => utils.parent.$slots, configurable: true },
    scopedSlots: { get: () => utils.parent.$scopedSlots, configurable: true }
  })

  initComponent()

  if (Array.isArray(api)) {
    // 允许 design里定义的api扩展出来，
    if (Array.isArray(designConfig?.api)) {
      api = api.concat(designConfig.api)
    }
    api.forEach((name) => {
      const value = sdk[name]

      if (typeof value !== 'undefined') {
        attrs[name] = value
        // 只有单层组件，才需要给setup传递： mono:true
        // 双层组件，需要把内层的api复制到外层，这样用户应用的ref才能拿到组件的api
        if (!mono) {
          utils.setParentAttribute({ name, value })
        }
      }
    })
  }

  return attrs
}
```

setup接收一个对象参数：

- props：组件的props
- context：包含Vue组件上下文的对象，如slots和emit
- renderless：
- api
- extendOptions
- mono
- classes = {}
