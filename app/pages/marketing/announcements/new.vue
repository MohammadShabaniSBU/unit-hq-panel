<script setup lang="ts">
import type { CampaignTypeName } from '~/types/campaign'

const type: CampaignTypeName = 'announcement'
</script>

<template>
  <MarketingCampaignWizard
    :type="type"
    :campaign="null"
  />
</template>
