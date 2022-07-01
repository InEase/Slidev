import { createSharedComposable, useWebSocket } from '@vueuse/core'

export const useSharedWebSocket = createSharedComposable(useWebSocket)

export const { status, data, send, open, close } = useSharedWebSocket('ws://127.0.0.1:8080/ws', {
  autoReconnect: {
    retries: 3,
    delay: 1000,
    onFailed() {
      console.warn('Failed to connect Jupyter after 3 retries')
    },
  },
})
