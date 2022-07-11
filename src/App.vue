<template>
<div>
  {{title}}
</div>
</template>
<script>
import { toRefs, reactive } from 'vue'
export default {
  setup() {
    const state = reactive({
      title: 'hello word'
    })

    return {
      ...toRefs(state)
    }
  }
}
</script>