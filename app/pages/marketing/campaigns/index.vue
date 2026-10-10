<script setup lang="ts">
import type { CampaignTypeName } from '~/types/campaign'

const type: CampaignTypeName = 'campaign'
</script>

<template>
  <MarketingCampaignList :type="type" />
</template>
