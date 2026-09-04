<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ApiVoiceBridgeToken } from '~/types/voiceBridgeToken'
import { Permission } from '~/types/permissions'

const props = defineProps<{
  siteId: number
}>()

const { t } = useI18n()
const toast = useToast()
const { canAtSite } = usePermissions()

const siteIdRef = computed(() => props.siteId)
const canManage = computed(() => canAtSite(Permission.CredentialManage, siteIdRef.value))

const showForm = ref(false)
const editing = ref<ApiVoiceBridgeToken | null>(null)
const revokeTarget = ref<ApiVoiceBridgeToken | null>(null)
const showRevokeConfirm = ref(false)
const regenerateTarget = ref<ApiVoiceBridgeToken | null>(null)
const showRegenerateConfirm = ref(false)
const revealedSecret = ref<string | null>(null)
const showSecretReveal = ref(false)
const secretCopied = ref(false)

const {
  tokens,
  pending,
  error,
  refresh,
  revoke
} = useSiteVoiceBridgeTokens(siteIdRef)

const { regenerateSecret } = useSiteVoiceBridgeTokenForm(siteIdRef)

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const UDropdownMenu = resolveComponent('UDropdownMenu')

function openCreate() {
  editing.value = null
  showForm.value = true
}

function openEdit(item: ApiVoiceBridgeToken) {
  editing.value = item
  showForm.value = true
}

function requestRevoke(item: ApiVoiceBridgeToken) {
  revokeTarget.value = item
  showRevokeConfirm.value = true
}

function requestRegenerate(item: ApiVoiceBridgeToken) {
  regenerateTarget.value = item
  showRegenerateConfirm.value = true
}

function revealSecret(secret: string) {
  revealedSecret.value = secret
  secretCopied.value = false
  showSecretReveal.value = true
}

function closeSecretReveal() {
  showSecretReveal.value = false
  revealedSecret.value = null
  secretCopied.value = false
}

function onSecretRevealOpen(isOpen: boolean) {
  if (!isOpen) {
    revealedSecret.value = null
    secretCopied.value = false
  }
}

async function confirmRevoke() {
  if (!revokeTarget.value) {
    return
  }

  const ok = await revoke(revokeTarget.value)
  if (ok) {
    showRevokeConfirm.value = false
    revokeTarget.value = null
  }
}

async function confirmRegenerate() {
  if (!regenerateTarget.value) {
    return
  }

  const secret = await regenerateSecret(regenerateTarget.value)
  showRegenerateConfirm.value = false
  regenerateTarget.value = null

  if (secret == null) {
    toast.add({
      title: t('facility.voiceBridgeTokens.regenerateError'),
      color: 'error'
    })
    return
  }

  await refresh()
  revealSecret(secret)
}

async function onSaved(token: ApiVoiceBridgeToken) {
  await refresh()

  if (token.secret) {
    revealSecret(token.secret)
    return
  }

  toast.add({
    title: t('facility.voiceBridgeTokens.updateSuccess'),
    color: 'success'
  })
}

async function copySecret() {
  if (!revealedSecret.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(revealedSecret.value)
    secretCopied.value = true
    toast.add({
      title: t('facility.voiceBridgeTokens.secretCopied'),
      color: 'success'
    })
  } catch {
    toast.add({
      title: t('facility.voiceBridgeTokens.copyFailed'),
      color: 'error'
    })
  }
}

const columns = computed<Array<TableColumn<ApiVoiceBridgeToken>>>(() => [
  {
    accessorKey: 'phone_number',
    header: t('facility.voiceBridgeTokens.phoneNumber'),
    cell: ({ row }) => h('span', { class: 'font-medium text-highlighted' }, row.original.phone_number ?? '—')
  },
  {
    accessorKey: 'main_line_number',
    header: t('facility.voiceBridgeTokens.mainLine'),
    cell: ({ row }) => row.original.main_line_number ?? '—'
  },
  {
    accessorKey: 'voicemail_number',
    header: t('facility.voiceBridgeTokens.voicemail'),
    cell: ({ row }) => row.original.voicemail_number ?? '—'
  },
  {
    accessorKey: 'label',
    header: t('facility.voiceBridgeTokens.label'),
    cell: ({ row }) => row.original.label ?? '—'
  },
  {
    id: 'status',
    header: t('table.status'),
    cell: ({ row }) => {
      const revoked = row.original.is_revoked
      return h(UBadge, {
        label: revoked
          ? t('facility.voiceBridgeTokens.revoked')
          : t('facility.voiceBridgeTokens.active'),
        color: revoked ? 'neutral' : 'success',
        variant: 'subtle',
        size: 'sm'
      })
    }
  },
  {
    id: 'actions',
    header: '',
    enableSorting: false,
    enableHiding: false,
    meta: {
      class: {
        th: 'w-10',
        td: 'w-10 text-right'
      }
    },
    cell: ({ row }) => {
      if (!canManage.value) {
        return null
      }

      const actions: Array<{ label: string, icon: string, onSelect: () => void }> = [
        {
          label: t('facility.voiceBridgeTokens.edit'),
          icon: 'i-lucide-pencil',
          onSelect() {
            openEdit(row.original)
          }
        },
        {
          label: t('facility.voiceBridgeTokens.regenerateSecret'),
          icon: 'i-lucide-key-round',
          onSelect() {
            requestRegenerate(row.original)
          }
        }
      ]

      if (!row.original.is_revoked) {
        actions.push({
          label: t('facility.voiceBridgeTokens.revoke'),
          icon: 'i-lucide-ban',
          onSelect() {
            requestRevoke(row.original)
          }
        })
      }

      return h(UDropdownMenu, {
        items: [actions],
        content: { align: 'end' }
      }, {
        default: () => h(UButton, {
          'icon': 'i-lucide-ellipsis',
          'color': 'neutral',
          'variant': 'ghost',
          'size': 'sm',
          'square': true,
          'aria-label': t('common.actions')
        })
      })
    }
  }
])
</script>

<template>
  <div>
    <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <p class="text-sm text-dimmed">
        {{ $t('facility.voiceBridgeTokens.hint') }}
      </p>

      <UButton
        v-if="canManage"
        icon="i-lucide-plus"
        :label="$t('facility.voiceBridgeTokens.add')"
        color="primary"
        class="shrink-0"
        @click="openCreate"
      />
    </div>

    <div
      v-if="pending"
      class="mt-6 flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-6 animate-spin text-dimmed"
      />
    </div>

    <div
      v-else-if="error"
      class="mt-6 rounded-lg border border-error/30 bg-error/5 p-4"
    >
      <p class="text-sm text-error">
        {{ $t('facility.voiceBridgeTokens.loadError') }}
      </p>
      <UButton
        :label="$t('common.retry')"
        color="neutral"
        variant="outline"
        size="sm"
        class="mt-3"
        @click="refresh()"
      />
    </div>

    <div
      v-else
      class="mt-6 overflow-hidden rounded-lg border border-default"
    >
      <UTable
        :data="tokens"
        :columns="columns"
      />
    </div>

    <FacilitySiteVoiceBridgeFormSlideover
      v-model:open="showForm"
      :site-id="siteId"
      :editing="editing"
      @saved="onSaved"
    />

    <UModal
      v-model:open="showRevokeConfirm"
      :title="$t('facility.voiceBridgeTokens.revokeConfirmTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('facility.voiceBridgeTokens.revokeConfirmBody', {
            phone: revokeTarget?.phone_number ?? ''
          }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="showRevokeConfirm = false"
          />
          <UButton
            :label="$t('facility.voiceBridgeTokens.revoke')"
            color="error"
            @click="confirmRevoke"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="showRegenerateConfirm"
      :title="$t('facility.voiceBridgeTokens.regenerateConfirmTitle')"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ $t('facility.voiceBridgeTokens.regenerateConfirmBody', {
            phone: regenerateTarget?.phone_number ?? ''
          }) }}
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            :label="$t('common.cancel')"
            color="neutral"
            variant="ghost"
            @click="showRegenerateConfirm = false"
          />
          <UButton
            :label="$t('facility.voiceBridgeTokens.regenerateSecret')"
            color="warning"
            @click="confirmRegenerate"
          />
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="showSecretReveal"
      :title="$t('facility.voiceBridgeTokens.secretRevealTitle')"
      @update:open="onSecretRevealOpen"
    >
      <template #body>
        <p class="text-sm text-warning">
          {{ $t('facility.voiceBridgeTokens.secretRevealWarning') }}
        </p>
        <div class="mt-4 flex items-center gap-2">
          <UInput
            :model-value="revealedSecret ?? ''"
            readonly
            class="w-full font-mono"
          />
          <UButton
            :icon="secretCopied ? 'i-lucide-check' : 'i-lucide-copy'"
            color="neutral"
            variant="outline"
            :label="$t('facility.voiceBridgeTokens.copySecret')"
            @click="copySecret"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end">
          <UButton
            :label="$t('facility.voiceBridgeTokens.secretRevealDone')"
            color="primary"
            @click="closeSecretReveal"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
