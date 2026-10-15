<script setup lang="ts">
/* eslint-disable vue/no-v-html -- assistant text is model markdown rendered through marked + DOMPurify */
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const props = defineProps<{
  text: string
  markdown?: boolean
}>()

const html = computed(() => {
  if (!props.markdown) return ''
  const parsed = marked.parse(props.text, { async: false, gfm: true, breaks: true }) as string
  return import.meta.client ? DOMPurify.sanitize(parsed) : parsed
})
</script>

<template>
  <div
    v-if="markdown"
    class="prose prose-sm dark:prose-invert max-w-none text-sm break-words [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_pre]:overflow-x-auto [&_ul]:list-disc [&_ul]:pl-5"
    v-html="html"
  />
  <p
    v-else
    class="text-sm break-words whitespace-pre-wrap text-default"
  >
    {{ text }}
  </p>
</template>
