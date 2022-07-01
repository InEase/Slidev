import { set } from '@vueuse/shared'
import sha1 from 'sha1'
import type { Ref } from 'vue'
import { ref, watch } from 'vue'
import { data, send, status as wbStatus } from './WebSocket'

type JupyterBlockStatus = 'idle' | 'busy' | 'stopped' | 'disconnected'

export function useJupyterBlock(code: Ref<string>) {
  // jupyter cell binds with initial code sha, so here we need to pass code as parameter
  const output = ref<string>('')
  const status: Ref<JupyterBlockStatus> = ref('idle')
  const hash = sha1(`code${code.value}`)
  // console.log(code.value, `\n--------------\n[${hash.slice(0, 6)}] Register`)

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
