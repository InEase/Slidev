<script setup lang="ts">
import { useElementVisibility } from '@vueuse/core'
import { onMounted, ref, watch } from 'vue'
import * as base64 from 'js-base64'
import { useJupyterBlock } from '../composables/JupyterBlock'

const props = defineProps({
  code: {
    default: '',
  },
  lang: {
    default: 'python',
  },
  readonly: {
    default: false,
  },
  lineNumbers: {
    default: 'off',
  },
  height: {
    default: 'auto',
  },
})

const block = ref<HTMLElement>()
const code = ref(props.code)

const { status, evaluate, set_code, get_code, get_output, interrupt, output } = useJupyterBlock(code)

const target = ref<HTMLElement>(null)
// const targetIsVisible = useElementVisibility(target)

onMounted(() => {
  get_code()
  get_output()
})

// todo: options https://cs.github.com/slidevjs/slidev/blob/5fd401d8327762371eb89951c44552aaed6dc2a5/packages/slidev/node/plugins/markdown.ts?q=monaco
// todo: base64编码
// todo: Draft
// todo: muti end, permissions, share codes and outputs between users
// add styles
</script>

<template>
  <div class="jupyter">
    <Monaco ref="target" :code="base64.encode(code, true)" :lang="props.lang" @change="set_code" />
    <div ref="block" class="code" @click="evaluate()">
      {{ code }}
    </div>
    <div class="output-wrapper " :class="status" v-html="output" />
  </div>
</template>

<style>
</style>
