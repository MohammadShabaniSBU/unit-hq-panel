<script setup lang="ts">
const open = defineModel<boolean>('open', { default: false })

const { t } = useI18n()
const { employee, setEmployee } = useAuth()
const { patch, post } = useApi()
const toast = useToast()

const firstName = ref('')
const lastName = ref('')
const savingName = ref(false)
const nameError = ref<string | null>(null)

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const savingPassword = ref(false)
const passwordError = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen || !employee.value) {
    return
  }
  firstName.value = employee.value.first_name ?? employee.value.name.split(' ')[0] ?? ''
  lastName.value = employee.value.last_name
    ?? employee.value.name.split(' ').slice(1).join(' ')
  nameError.value = null
  passwordError.value = null
  currentPassword.value = ''
  newPassword.value = ''
  confirmPassword.value = ''
})

async function saveName() {
  savingName.value = true
  nameError.value = null
  try {
    const res = await patch<typeof employee.value>('/api/user', {
      first_name: firstName.value.trim(),
      last_name: lastName.value.trim()
    })
    if (res.data) {
      setEmployee(res.data)
    }
    toast.add({ title: t('profile.nameSaved'), color: 'success' })
  } catch {
    nameError.value = t('profile.nameError')
  } finally {
    savingName.value = false
  }
}

async function changePassword() {
  passwordError.value = null
  if (newPassword.value.length < 12) {
    passwordError.value = t('profile.minLengthHint')
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = t('profile.mismatch')
    return
  }

  savingPassword.value = true
  try {
    await post('/api/user/password', {
      current_password: currentPassword.value,
      password: newPassword.value
    })
    currentPassword.value = ''
    newPassword.value = ''
    confirmPassword.value = ''
    toast.add({ title: t('profile.passwordChanged'), color: 'success' })
  } catch (err: unknown) {
    const fetchError = err as {
      data?: { errors?: Record<string, Array<string>>, message?: string }
    }
    passwordError.value = fetchError.data?.errors?.current_password?.[0]
      ?? fetchError.data?.message
      ?? t('profile.passwordError')
  } finally {
    savingPassword.value = false
  }
}
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="$t('profile.title')"
    :description="$t('profile.subtitle')"
  >
    <template #body>
      <div class="flex flex-col gap-8">
        <div class="flex flex-col gap-3">
          <UFormField
            :label="$t('profile.firstName')"
            required
          >
            <UInput
              v-model="firstName"
              class="w-full"
              :disabled="savingName"
            />
          </UFormField>
          <UFormField
            :label="$t('profile.lastName')"
            required
          >
            <UInput
              v-model="lastName"
              class="w-full"
              :disabled="savingName"
            />
          </UFormField>
          <p
            v-if="nameError"
            class="text-sm text-error"
          >
            {{ nameError }}
          </p>
          <UButton
            color="primary"
            :label="$t('profile.saveName')"
            :loading="savingName"
            :disabled="!firstName.trim() || !lastName.trim()"
            @click="saveName"
          />
        </div>

        <div class="border-t border-default pt-6 flex flex-col gap-3">
          <UFormField
            :label="$t('profile.currentPassword')"
            required
          >
            <UInput
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              class="w-full"
              :disabled="savingPassword"
            />
          </UFormField>
          <UFormField
            :label="$t('profile.newPassword')"
            :hint="$t('profile.minLengthHint')"
            required
          >
            <UInput
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
              :disabled="savingPassword"
            />
          </UFormField>
          <UFormField
            :label="$t('profile.confirmPassword')"
            required
          >
            <UInput
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              class="w-full"
              :disabled="savingPassword"
            />
          </UFormField>
          <p
            v-if="passwordError"
            class="text-sm text-error"
          >
            {{ passwordError }}
          </p>
          <UButton
            color="neutral"
            variant="soft"
            :label="$t('profile.changePassword')"
            :loading="savingPassword"
            :disabled="!currentPassword || !newPassword || !confirmPassword"
            @click="changePassword"
          />
        </div>
      </div>
    </template>
  </USlideover>
</template>
