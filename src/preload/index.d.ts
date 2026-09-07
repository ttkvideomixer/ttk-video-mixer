import type { VideoMixerApi } from './index'

declare global {
  interface Window {
    api: VideoMixerApi
  }
}
