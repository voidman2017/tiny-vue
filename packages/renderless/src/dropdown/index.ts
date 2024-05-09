/**
 * Copyright (c) 2022 - present TinyVue Authors.
 * Copyright (c) 2022 - present Huawei Cloud Computing Technologies Co., Ltd.
 *
 * Use of this source code is governed by an MIT-style license.
 *
 * THE OPEN SOURCE SOFTWARE IN THIS PRODUCT IS DISTRIBUTED IN THE HOPE THAT IT WILL BE USEFUL,
 * BUT WITHOUT ANY WARRANTY, WITHOUT EVEN THE IMPLIED WARRANTY OF MERCHANTABILITY OR FITNESS FOR
 * A PARTICULAR PURPOSE. SEE THE APPLICABLE LICENSES FOR MORE DETAILS.
 *
 */

import type { IDropdownRenderlessParams } from '@/types'
import { KEY_CODE } from '../common'
import { addClass, removeClass, on, off } from '../common/deps/dom'

export const watchVisible =
  ({ broadcast, emit, nextTick }: Pick<IDropdownRenderlessParams, 'broadcast' | 'emit' | 'nextTick'>) =>
  (value: boolean) => {
    broadcast(
      'TinyDropdownMenu',
      'visible',
      value
    ) /* note:【下拉菜单显示】-2 这里会通过 broadcast 发送事件名为 visible 的事件通知 。进而触发 packages/renderless/src/dropdown-menu/index.ts 中   parent.$on('visible'）的事件监听 */

    /**
     * 此处必须延时处理，不然 Vue3 环境下会从 nextTick 冒出一个错误：
     *
     * Uncaught (in promise) TypeError: Cannot read properties of null (reading 'length')
     *
     * 场景：visible-change 事件中，使用 Modal 静态方法
     */

    nextTick(() => emit('visible-change', value))
  }

export const watchFocusing = (parent: IDropdownRenderlessParams['parent']) => (value: boolean) => {
  const selfDefine: HTMLElement | null = parent.$el.querySelector('.tiny-dropdown-selfdefine')

  if (selfDefine) {
    value ? addClass(selfDefine, 'focusing') : removeClass(selfDefine, 'focusing')
  }
}

export const show =
  ({ props, state }: Pick<IDropdownRenderlessParams, 'props' | 'state'>) =>
  () => {
    if (props.disabled) {
      return
    }

    clearTimeout(Number(state.timeout))

    state.timeout = setTimeout(
      () => {
        state.visible =
          true /* note:【下拉菜单显示】-1 当触发下拉菜单显示 ，会改变 state.visible ； packages/renderless/src/dropdown/vue.ts 中 watch 监听了 state.visible 变化，因此变化会导致执行 watchVisible */
      },
      state.trigger === 'click' ? 0 : props.showTimeout
    )
  }

export const hide =
  ({ api, props, state }: Pick<IDropdownRenderlessParams, 'api' | 'props' | 'state'>) =>
  () => {
    if (props.disabled) {
      return
    }

    api.removeTabindex()

    if (props.tabindex >= 0 && state.triggerElm) {
      api.resetTabindex(state.triggerElm)
    }

    clearTimeout(Number(state.timeout))

    state.timeout = setTimeout(
      () => {
        state.visible = false
      },
      state.trigger === 'click' ? 0 : props.hideTimeout
    )
  }

export const handleClick =
  ({ api, props, state, emit }: Pick<IDropdownRenderlessParams, 'api' | 'props' | 'state' | 'emit'>) =>
  () => {
    if (props.disabled) {
      return
    }

    emit('handle-click', state.visible)

    state.visible ? api.hide() : api.show()
  }

export const handleTriggerKeyDown =
  ({ api, state }: Pick<IDropdownRenderlessParams, 'api' | 'state'>) =>
  (event: KeyboardEvent) => {
    const keyCode = event.keyCode

    if (~[KEY_CODE.ArrowUp, KEY_CODE.ArrowDown].indexOf(keyCode)) {
      api.removeTabindex()
      if (state.menuItems) {
        api.resetTabindex(state.menuItems[0])
        state.menuItems[0].focus()
      }

      event.preventDefault()
      event.stopPropagation()
    } else if (keyCode === KEY_CODE.Enter) {
      api.handleClick()
    } else if (~[KEY_CODE.Tab, KEY_CODE.Escape].indexOf(keyCode)) {
      api.hide()
    }
  }

export const handleItemKeyDown =
  ({ api, props, state }: Pick<IDropdownRenderlessParams, 'api' | 'props' | 'state'>) =>
  (event: KeyboardEvent) => {
    const keyCode = event.keyCode
    const target = event.target
    const currentIndex = state.menuItemsArray.indexOf(target)
    const max = state.menuItemsArray.length - 1

    let nextIndex

    if (~[KEY_CODE.ArrowUp, KEY_CODE.ArrowDown].indexOf(keyCode)) {
      if (keyCode === KEY_CODE.ArrowUp) {
        nextIndex = currentIndex !== 0 ? currentIndex - 1 : 0
      } else {
        nextIndex = currentIndex < max ? currentIndex + 1 : max
      }

      api.removeTabindex()
      if (state.menuItems) {
        api.resetTabindex(state.menuItems[nextIndex])
        state.menuItems[nextIndex].focus()
      }

      event.preventDefault()
      event.stopPropagation()
    } else if (keyCode === KEY_CODE.Enter) {
      api.triggerElmFocus()

      target?.click()

      if (props.hideOnClick) {
        state.visible = false
      }
    } else if (~[KEY_CODE.Tab, KEY_CODE.Escape].indexOf(keyCode)) {
      api.hide()
      api.triggerElmFocus()
    }
  }

export const resetTabindex = (api: IDropdownRenderlessParams['api']) => (el: HTMLElement) => {
  api.removeTabindex()

  el.setAttribute('tabindex', '0')
}

export const removeTabindex = (state: IDropdownRenderlessParams['state']) => () => {
  state.triggerElm?.setAttribute('tabindex', '-1')
  state.menuItemsArray?.forEach((item) => {
    item.setAttribute('tabindex', '-1')
  })
}

export const initAria =
  ({ state, props }: Pick<IDropdownRenderlessParams, 'state' | 'props'>) =>
  () => {
    state.dropdownElm?.setAttribute('id', state.listId)
    state.triggerElm?.setAttribute('aria-haspopup', 'list')
    state.triggerElm?.setAttribute('aria-controls', state.listId)

    if (!props.splitButton || !props.singleButton) {
      state.triggerElm?.setAttribute('role', 'button')
      state.triggerElm?.setAttribute('tabindex', String(props.tabindex))
      addClass(state.triggerElm, 'tiny-dropdown-selfdefine')
    }
  }

const toggleFocus =
  ({ state, value }) =>
  () => {
    state.focusing = value
  }

/* note: 【dropdown初始化】 
事件绑定: 
1.根据props.spliteButton，确定事件触发元素
2. 根据 props.trigger 给事件触发元素绑定事件
*/
export const initEvent =
  ({ api, props, state, vm, mode }: Pick<IDropdownRenderlessParams, 'api' | 'props' | 'state' | 'vm' | 'mode'>) =>
  () => {
    let buttonValue = props.splitButton || props.singleButton

    state.triggerElm = buttonValue ? vm.$refs.trigger.$el : props.border ? vm.$refs.trigger.$el : vm.$refs.trigger

    on(state.triggerElm, 'keydown', api.handleTriggerKeyDown)
    state.dropdownElm?.addEventListener('keydown', api.handleItemKeyDown, true)

    if (!props.splitButton || !props.singleButton) {
      on(state.triggerElm, 'focus', toggleFocus({ state, value: true }))
      on(state.triggerElm, 'blur', toggleFocus({ state, value: false }))
      on(state.triggerElm, 'click', toggleFocus({ state, value: false }))
    }

    if (state.trigger === 'hover') {
      on(state.triggerElm, 'mouseenter', api.show)
      on(state.triggerElm, 'mouseleave', api.hide)
      on(state.dropdownElm, 'mouseenter', api.show)
      on(state.dropdownElm, 'mouseleave', api.hide)
    } else if (state.trigger === 'click') {
      on(state.triggerElm, 'click', api.handleClick)
    }

    if (mode === 'mobile-first') {
      if (props.splitButton || props.singleButton) {
        on(state.triggerElm, 'click', api.handleClick)
      }
    }
  }

/* note: 【dropdown - 菜单项点击】-3 
响应菜单项点击。如果 dropdown 的 props.hideOnClick 且当前菜单项的 props.disabled 不为 true，则设置 state.visble = false。隐藏菜单项
如果菜单项的 props.disabled 不为 true，emit('item-click', data)，触发事件 item-click，传递点击的菜单项数据
*/
export const handleMenuItemClick =
  ({ props, state, emit }: Pick<IDropdownRenderlessParams, 'props' | 'state' | 'emit'>) =>
  ({ itemData, vm, disabled }) => {
    if (props.hideOnClick && !disabled) {
      state.visible = false
    }

    if (!disabled) {
      const data = { itemData, vm }
      emit('item-click', data)
    }
  }

export const triggerElmFocus = (state: IDropdownRenderlessParams['state']) => () => {
  state.triggerElm?.focus && state.triggerElm.focus()
}

export const initDomOperation =
  ({ api, state, vm }: Pick<IDropdownRenderlessParams, 'api' | 'state' | 'vm'>) =>
  () => {
    state.dropdownElm = vm.popperElm
    state.menuItems = state.dropdownElm?.querySelectorAll('[tabindex="-1"]')
    state.menuItemsArray = [].slice.call(state.menuItems)

    api.initEvent() // packages/renderless/src/dropdown-menu/index.ts:138 中调用
    api.initAria()
  }

export const handleMainButtonClick =
  ({ api, emit }: Pick<IDropdownRenderlessParams, 'api' | 'emit'>) =>
  (event: MouseEvent) => {
    emit('button-click', event)
    api.hide()
  }

export const mounted =
  ({ api, vm, state, broadcast }: Pick<IDropdownRenderlessParams, 'api' | 'vm' | 'state' | 'broadcast'>) =>
  () => {
    if (state.showSelfIcon) {
      state.showIcon = false
    }

    /* note:【dropdown - 菜单项点击】-1
    vm.$on 源自 packages/vue-common/src/adapter/utils.ts 中 on 方法 
    这里通过 on 方法监听菜单项点击
    由 packages/renderless/src/dropdown-item/index.ts 中 dispatch 该事件
    最终执行 handleMenuItemClick 
    */
    vm.$on('menu-item-click', api.handleMenuItemClick)
    vm.$on('current-item-click', api.handleMenuItemClick)
    vm.$on('selected-index', (selectedIndex) => {
      broadcast('TinyDropdownMenu', 'menu-selected-index', selectedIndex)
    })
    vm.$on('is-disabled', api.clickOutside)
  }

export const beforeDistory =
  ({ api, state }: Pick<IDropdownRenderlessParams, 'api' | 'state'>) =>
  () => {
    if (state.triggerElm) {
      off(state.triggerElm, 'keydown', api.handleTriggerKeyDown)
      off(state.triggerElm, 'focus', toggleFocus({ state, value: true }))
      off(state.triggerElm, 'blur', toggleFocus({ state, value: false }))
      off(state.triggerElm, 'click', toggleFocus({ state, value: false }))
      off(state.triggerElm, 'mouseenter', api.show)
      off(state.triggerElm, 'mouseleave', api.hide)
      off(state.triggerElm, 'click', api.handleClick)
      state.triggerElm = null
    }

    if (state.dropdownElm) {
      state.dropdownElm.removeEventListener('keydown', api.handleItemKeyDown, true)

      off(state.dropdownElm, 'mouseenter', api.show)
      off(state.dropdownElm, 'mouseleave', api.hide)

      state.dropdownElm = null
    }
  }

export const clickOutside =
  ({ props, api }: Pick<IDropdownRenderlessParams, 'props' | 'api'>) =>
  (disabled: boolean) => {
    if (props.hideOnClick) {
      disabled ? api.show() : api.hide()
    }
  }
