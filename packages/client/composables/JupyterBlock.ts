import { set } from '@vueuse/shared'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'
import { data, send, status as wbStatus } from './WebSocket'

type JupyterBlockStatus = 'idle' | 'busy' | 'stopped' | 'disconnected'

export function useJupyterBlock(code: Ref<string>) {
  // jupyter cell binds with initial code sha, so here we need to pass code as parameter
  const output = ref<string>('')
  const status: Ref<JupyterBlockStatus> = ref('idle')
  const hash = sha1(`code${code.value}`)
  // eslint-disable-next-line no-console
  console.log(code.value, `\n--------------\n[${hash.slice(0, 6)}] Register`)

  function evaluate() {
    output.value = ''
    const data = { kind: 'reevaluate', hashids: [hash] }
    send(JSON.stringify(data))
  }

  function set_code(newCode: string) {
    set(code, newCode)
    send(JSON.stringify({ kind: 'set_code', hashid: hash, code: newCode }))
  }

  // should be called during page change
  function get_code() {
    send(JSON.stringify({ kind: 'get_code', hashid: hash }))
  }

  function get_output() {
    send(JSON.stringify({ kind: 'get_output', hashid: hash }))
  }

  function interrupt() {
    send(JSON.stringify({ kind: 'interrupt_kernel' }))
  }

  watch(data, (data) => {
    const msg = JSON.parse(data)
    if (msg.hashid === hash) {
      if (msg.kind === 'code') {
        code.value = msg.code
      }
      else if (msg.kind === 'output') {
        // console.log(msg)
        output.value = msg.output
      }
      else if (msg.kind === 'status') {
        status.value = msg.status
      }
    }
  })

  watch(wbStatus, (wbStatus) => {
    if (wbStatus === 'CLOSED')
      status.value = 'disconnected'
  })

  return { status, evaluate, set_code, get_code, get_output, interrupt, output }
}

function sha1(msg: string): string {
  function rotate_left(n: number, s: number) {
    return (n << s) | (n >>> (32 - s))
  }

  function cvt_hex(val: number) {
    let str = ''
    let i
    let v

    for (i = 7; i >= 0; i--) {
      v = (val >>> (i * 4)) & 0x0F
      str += v.toString(16)
    }

    return str
  }

  function utf8_encode(string: string) {
    string = string.replace(/\r\n/g, '\n')
    let utftext = ''

    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n)

      if (c < 128) {
        utftext += String.fromCharCode(c)
      }
      else if ((c > 127) && (c < 2048)) {
        utftext += String.fromCharCode((c >> 6) | 192)
        utftext += String.fromCharCode((c & 63) | 128)
      }
      else {
        utftext += String.fromCharCode((c >> 12) | 224)
        utftext += String.fromCharCode(((c >> 6) & 63) | 128)
        utftext += String.fromCharCode((c & 63) | 128)
      }
    }

    return utftext
  }

  let blockstart
  let i, j
  const W = new Array(80)
  let H0 = 0x67452301
  let H1 = 0xEFCDAB89
  let H2 = 0x98BADCFE
  let H3 = 0x10325476
  let H4 = 0xC3D2E1F0
  let A, B, C, D, E
  let temp
  msg = utf8_encode(msg)
  const msg_len = msg.length
  const word_array = []

  for (i = 0; i < msg_len - 3; i += 4) {
    j = msg.charCodeAt(i) << 24 | msg.charCodeAt(i + 1) << 16 | msg.charCodeAt(i + 2) << 8 | msg.charCodeAt(i + 3)
    word_array.push(j)
  }

  switch (msg_len % 4) {
    case 0:
      i = 0x080000000
      break
    case 1:
      i = msg.charCodeAt(msg_len - 1) << 24 | 0x0800000
      break
    case 2:
      i = msg.charCodeAt(msg_len - 2) << 24 | msg.charCodeAt(msg_len - 1) << 16 | 0x08000
      break
    case 3:
      i = msg.charCodeAt(msg_len - 3) << 24 | msg.charCodeAt(msg_len - 2) << 16 | msg.charCodeAt(msg_len - 1) << 8 | 0x80
      break
  }

  word_array.push(i)

  while ((word_array.length % 16) != 14) word_array.push(0)
  word_array.push(msg_len >>> 29)
  word_array.push((msg_len << 3) & 0x0FFFFFFFF)

  for (blockstart = 0; blockstart < word_array.length; blockstart += 16) {
    for (i = 0; i < 16; i++) W[i] = word_array[blockstart + i]
    for (i = 16; i <= 79; i++) W[i] = rotate_left(W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16], 1)

    A = H0
    B = H1
    C = H2
    D = H3
    E = H4

    for (i = 0; i <= 19; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (~B & D)) + E + W[i] + 0x5A827999) & 0x0FFFFFFFF
      E = D
      D = C
      C = rotate_left(B, 30)
      B = A
      A = temp
    }

    for (i = 20; i <= 39; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0x6ED9EBA1) & 0x0FFFFFFFF
      E = D
      D = C
      C = rotate_left(B, 30)
      B = A
      A = temp
    }

    for (i = 40; i <= 59; i++) {
      temp = (rotate_left(A, 5) + ((B & C) | (B & D) | (C & D)) + E + W[i] + 0x8F1BBCDC) & 0x0FFFFFFFF
      E = D
      D = C
      C = rotate_left(B, 30)
      B = A
      A = temp
    }

    for (i = 60; i <= 79; i++) {
      temp = (rotate_left(A, 5) + (B ^ C ^ D) + E + W[i] + 0xCA62C1D6) & 0x0FFFFFFFF
      E = D
      D = C
      C = rotate_left(B, 30)
      B = A
      A = temp
    }

    H0 = (H0 + A) & 0x0FFFFFFFF
    H1 = (H1 + B) & 0x0FFFFFFFF
    H2 = (H2 + C) & 0x0FFFFFFFF
    H3 = (H3 + D) & 0x0FFFFFFFF
    H4 = (H4 + E) & 0x0FFFFFFFF
  }

  temp = cvt_hex(H0) + cvt_hex(H1) + cvt_hex(H2) + cvt_hex(H3) + cvt_hex(H4)

  return temp.toLowerCase()
}
