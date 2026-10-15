import { defineStore } from 'pinia'

export const useTemplateAssistUiStore = defineStore('templateAssistUi', () => {
  const rightTab = ref<'settings' | 'assistant'>('settings')

  function openAssistant() {
    rightTab.value = 'assistant'
  }

  return { rightTab, openAssistant }
})
