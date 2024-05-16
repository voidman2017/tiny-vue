<template>
  <!-- 同时设置 .tiny-carousel overflow:visible 来观察变化更直观 -->
  <!-- <tiny-carousel height="150px" style="width: 100px;margin:0 auto;"> -->
  <tiny-carousel height="150px">
    <tiny-carousel-item class="carousel-item-demo" v-for="item in 4" :key="item">
      <h3>{{ item }}</h3>
    </tiny-carousel-item>
  </tiny-carousel>
</template>

<script lang="jsx">
import { Carousel, CarouselItem } from '@opentiny/vue'

export default {
  components: {
    TinyCarousel: Carousel,
    TinyCarouselItem: CarouselItem
  }
}
</script>

<style scoped>
.carousel-item-demo:nth-child(2n) {
  background-color: #fafafa;
}

.carousel-item-demo:nth-child(2n + 1) {
  background-color: #edf0f3;
}
</style>
