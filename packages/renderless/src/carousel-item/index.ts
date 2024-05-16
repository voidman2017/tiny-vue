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
/* note: 
用于处理轮播图中项（item）的索引，从而确定item的位置。该方式确保轮播图可以无缝地从最后一个元素跳转到第一个元素
activeIndex: 当前激活项的索引。
index: 当前正在处理的项的索引。
length: 轮播图中项的总数。
*/
export const processIndex = ({ activeIndex, index, length }) => {
  if (activeIndex === 0 && index === length - 1) {
    /* 
    第一种情况：当激活项在首位，当前项在末位
    当 activeIndex 为 0（即当前激活的是第一个元素）并且 index 为 length - 1（即当前处理的是最后一个元素）时，函数返回 -1。
    这种情况通常用于标识列表中最后一个元素现在应该被视为逻辑上的“前一个”元素，即在视觉上出现在第一个元素的前面。  
    */
    return -1
  } else if (activeIndex === length - 1 && index === 0) {
    /* 
      第二种情况：当激活项在末位，当前项在首位
      当 activeIndex 为 length - 1（即当前激活的是最后一个元素）并且 index 为 0（即当前处理的是第一个元素）时，函数返回 length。
      这表明列表中第一个元素逻辑上应该位于最后一个元素之后。
    */
    return length
  } else if (index < activeIndex - 1 && activeIndex - index >= length / 2) {
    /* 
    第三种情况：当前项远离激活项，并在左侧
    如果当前项的索引小于激活项索引减一，并且当前项与激活项之间的距离大于等于轮播图长度的一半，函数返回 length + 1。
    这种情况可能用于处理循环轮播逻辑，其中元素在视觉上需要从一端跳转到另一端。
    */
    return length + 1
  } else if (index > activeIndex + 1 && index - activeIndex >= length / 2) {
    /* 
    第四种情况：当前项远离激活项，并在右侧
    如果当前项的索引大于激活项索引加一，并且当前项与激活项之间的距离也大于等于轮播图长度的一半，函数返回 -2。
    这可能表示元素需要从列表一端视觉上跳转到另一端。
    */
    return -2
  }
  /* 默认情况：直接返回当前项索引 */
  return index
}

export const calculateTranslate =
  ({ CARD_SCALE, state }) =>
  ({ activeIndex, index, parentWidth }) => {
    if (state.inStage) {
      return (parentWidth * ((2 - CARD_SCALE) * (index - activeIndex) + 1)) / 4
    } else if (index < activeIndex) {
      return (-(1 + CARD_SCALE) * parentWidth) / 4
    }

    return ((3 + CARD_SCALE) * parentWidth) / 4
  }

export const translateItem =
  ({ api, CARD_SCALE, parent, state }) =>
  ({ activeIndex, index, oldIndex }) => {
    const parentHeight = parent.$parent.$el.offsetHeight
    const parentWidth = parent.$parent.$el.offsetWidth
    const vnode = parent.$parent
    const length = vnode.state.items.length
    const { TYPE_CARD, TYPE_VERTICAL } = parent.$constants

    if (vnode.type !== TYPE_CARD && oldIndex !== undefined) {
      state.animating = index === activeIndex || index === oldIndex
    }

    state.animatingMf = ![activeIndex, oldIndex].includes(index)

    /* note: 核心逻辑,计算 index */
    if (index !== activeIndex && length > 2 && vnode.loop) {
      index = api.processIndex({ index, activeIndex, length })
    }

    if (vnode.type === TYPE_CARD) {
      state.inStage = Math.round(Math.abs(index - activeIndex)) <= 1
      state.active = index === activeIndex

      state.translate = api.calculateTranslate({
        index,
        activeIndex,
        parentWidth
      })

      state.scale = state.active ? 1 : CARD_SCALE
    } else {
      state.active = index === activeIndex

      /* note: 【carousel - state.translate】 
      根据type类型，
      */
      state.translate =
        vnode.type === TYPE_VERTICAL ? parentHeight * (index - activeIndex) : parentWidth * (index - activeIndex)
    }

    state.ready = true
  }

export const handleItemClick =
  ({ state, parent }) =>
  () => {
    const vnode = parent.$parent

    if (vnode && vnode.type === parent.$constants.TYPE_CARD) {
      const index = vnode.state.items.findIndex((item) => item.state.translate === state.translate)
      vnode.setActiveItem(index)
    }
  }

export const computedTransform =
  ({ parent, TYPE_VERTICAL, mode, state }) =>
  () => {
    const TRANSLATE =
      parent.$parent.type === TYPE_VERTICAL
        ? `translateY(${state.translate + state.delta}px) scale(${state.scale})`
        : `translateX(${state.translate + state.delta}px) scale(${state.scale})`
    const style = mode === 'mobile-first' ? { width: '100%', height: '100%' } : {}

    return {
      msTransform: TRANSLATE,
      webkitTransform: TRANSLATE,
      transform: TRANSLATE,
      ...style
    }
  }

export const resetAnimatingMf = (state) => () => {
  state.animatingMf = false
}

export const setDelta =
  ({ state }) =>
  (val) => {
    state.delta = val
  }
