<script setup lang="ts">
import type { ApiEmployeeRow } from '~/types/rbac'

const open = defineModel<boolean>('open', { default: false })

const props = defineProps<{
  employee: ApiEmployeeRow | null
}>()

const emit = defineEmits<{
  saved: []
}>()

const { t } = useI18n()
const { patch } = useApi()

const firstName = ref('')
const lastName = ref('')
const saving = ref(false)
const errorMessage = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen || !props.employee) {
    return
  }
  firstName.value = props.employee.first_name
  lastName.value = props.employee.last_name
  errorMessage.value = null
})

async function save() {
  if (!props.employee) {
    return
  }
  saving.value = true
  errorMessage.value = null
  try {
    await patch(`/api/employees/${props.employee.id}`, {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim()
    })
    emit('saved')
    open.value = false
  } catch (err: unknown) {
    const fetchError = err as { data?: { message?: string } }
    errorMessage.value = fetchError.data?.message ?? t('pages.settings.people.editNameError')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="$t('pages.settings.people.editName')"
  >
    <template #body>
      <div class="flex flex-col gap-3">
        <UFormField
          :label="$t('pages.settings.people.firstName')"
          required
        >
          <UInput
            v-model="firstName"
            class="w-full"
            :disabled="saving"
          />
        </UFormField>
        <UFormField
          :label="$t('pages.settings.people.lastName')"
          required
        >
          <UInput
            v-model="lastName"
            class="w-full"
            :disabled="saving"
          />
        </UFormField>
        <p
          v-if="errorMessage"
          class="text-sm text-error"
        >
          {{ errorMessage }}
        </p>
      </div>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :label="$t('common.cancel')"
          :disabled="saving"
          @click="open = false"
        />
        <UButton
          color="primary"
          :label="$t('common.save')"
          :loading="saving"
          :disabled="!firstName.trim() || !lastName.trim()"
          @click="save"
        />
      </div>
    </template>
  </UModal>
</template>
