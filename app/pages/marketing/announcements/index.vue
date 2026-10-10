<script setup lang="ts">
import type { CampaignTypeName } from '~/types/campaign'

const type: CampaignTypeName = 'announcement'
</script>

<template>
  <MarketingCampaignList :type="type" />
</template>
