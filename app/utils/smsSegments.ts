export interface SmsSegmentCount {
  segments: number
  length: number
  encoding: 'gsm7' | 'ucs2'
}

// GSM 03.38 basic + extension table — mirrors App\Support\Communications\Messages\SmsMessage
// on the API side so the composer's live counter never lies before send (a naive
// 160-char count breaks the moment an operator types "€").
const GSM7_BASIC = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà'
const GSM7_EXTENDED_CHARS = ['^', '{', '}', '\\', '[', '~', ']', '|', '€']
const GSM7 = GSM7_BASIC + GSM7_EXTENDED_CHARS.join('')

function isGsm7(body: string): boolean {
  for (const char of Array.from(body)) {
    if (!GSM7.includes(char)) {
      return false
    }
  }

  return true
}

function encodingLength(body: string, gsm7: boolean): number {
  if (!gsm7) {
    return Array.from(body).length
  }

  let length = 0
  for (const char of Array.from(body)) {
    length += GSM7_EXTENDED_CHARS.includes(char) ? 2 : 1
  }

  return length
}

export function countSmsSegments(body: string): SmsSegmentCount {
  const gsm7 = isGsm7(body)
  const length = encodingLength(body, gsm7)
  const encoding = gsm7 ? 'gsm7' : 'ucs2'

  if (length === 0) {
    return { segments: 0, length: 0, encoding }
  }

  const segments = gsm7
    ? (length <= 160 ? 1 : Math.ceil(length / 153))
    : (length <= 70 ? 1 : Math.ceil(length / 67))

  return { segments, length, encoding }
}
