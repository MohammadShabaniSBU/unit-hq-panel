<script setup lang="ts">
/* eslint-disable vue/no-v-html -- HTML is sanitized with DOMPurify */
import DOMPurify from 'dompurify'
import { looksLikeRichText } from '~/utils/richText'

const ALLOWED_TAGS = ['h1', 'h2', 'h3', 'p', 'strong', 'em', 'b', 'i', 'a', 'ul', 'ol', 'li', 'br']
const ALLOWED_ATTR = ['href', 'target', 'rel']

const props = defineProps<{
  html?: string | null
}>()

const isHtml = computed(() => looksLikeRichText(props.html))

const sanitizedHtml = computed(() => {
  const html = props.html ?? ''
  if (!html || !isHtml.value) {
    return ''
  }

  return import.meta.client
    ? DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR })
    : html
})

const plainText = computed(() => {
  if (isHtml.value) {
    return ''
  }

  return props.html ?? ''
})
</script>

<template>
  <div
    v-if="sanitizedHtml"
    class="prose prose-sm max-w-none break-words text-highlighted dark:prose-invert [&_a]:underline"
    v-html="sanitizedHtml"
  />
  <p
    v-else-if="plainText"
    class="whitespace-pre-wrap break-words text-sm text-highlighted"
  >
    {{ plainText }}
  </p>
</template>
