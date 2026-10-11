import type {
  AdConversionMappingRow,
  AdConversionTarget,
  AdConversionTestResult,
  ConversionEventKey
} from '~/types/advertising'

export function useAdConversionMappings() {
  const { get, put, post } = useApi()

  async function load(accountId: number) {
    const response = await get<{ mappings: Array<AdConversionMappingRow> }>(
      `/api/ad-platform-accounts/${accountId}/conversion-mappings`
    )
    return response.data.mappings
  }

  async function save(accountId: number, mappings: Array<AdConversionMappingRow>) {
    const response = await put<{ mappings: Array<AdConversionMappingRow> }>(
      `/api/ad-platform-accounts/${accountId}/conversion-mappings`,
      {
        mappings: mappings.map(row => ({
          event_key: row.event_key,
          external_ref: row.external_ref ?? '',
          value_rule: row.value_rule,
          is_active: row.is_active
        }))
      }
    )
    return response.data.mappings
  }

  async function targets(accountId: number) {
    const response = await get<Array<AdConversionTarget>>(
      `/api/ad-platform-accounts/${accountId}/conversion-targets`
    )
    return response.data
  }

  async function sendTest(
    accountId: number,
    eventKey: ConversionEventKey,
    testEventCode: string | null
  ) {
    const body: Record<string, unknown> = { event_key: eventKey }
    if (testEventCode) {
      body.test_event_code = testEventCode
    }
    const response = await post<AdConversionTestResult>(
      `/api/ad-platform-accounts/${accountId}/test-conversion`,
      body
    )
    return response.data
  }

  return {
    load,
    save,
    targets,
    sendTest
  }
}
