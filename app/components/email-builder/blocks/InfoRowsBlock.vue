<script setup lang="ts">
import type { InfoRowsBlockParams } from '~/types/email-builder'

defineProps<{
  params: InfoRowsBlockParams
  selected?: boolean
}>()
</script>

<template>
  <div class="px-4 py-3">
    <table class="w-full border-collapse text-sm">
      <tbody>
        <tr
          v-for="(row, index) in params.rows"
          :key="index"
          :class="params.striped && index % 2 === 1 ? 'bg-gray-50' : ''"
        >
          <td class="px-2 py-1.5 text-gray-600">
            {{ row.label }}
          </td>
          <td
            class="px-2 py-1.5 font-medium text-gray-900"
            :class="params.value_align === 'right' ? 'text-right' : 'text-left'"
          >
            {{ row.value }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
