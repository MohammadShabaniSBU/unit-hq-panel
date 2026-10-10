<script setup lang="ts">
import type { CampaignTypeName } from '~/types/campaign'

const type: CampaignTypeName = 'campaign'
</script>

<template>
  <MarketingCampaignWizard
    :type="type"
    :campaign="null"
  />
</template>
