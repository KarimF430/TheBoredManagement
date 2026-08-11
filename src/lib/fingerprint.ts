/**
 * Browser Fingerprinting for Unique Click Dedup
 * Lightweight fingerprinting without external libraries
 */

export interface FingerprintData {
  hash: string
  components: {
    screenResolution: string
    timezone: string
    language: string
    platform: string
    touchSupport: boolean
    canvasHash: string
    webglHash: string
  }
}

export function generateServerFingerprint(
  ip: string,
  userAgent: string,
  acceptLanguage: string
): string {
  const raw = `${ip}|${userAgent}|${acceptLanguage}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return 'fp_' + Math.abs(hash).toString(36)
}

export function generateClientFingerprint(): FingerprintData {
  const components = {
    screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'unknown',
    language: typeof navigator !== 'undefined' ? navigator.language : 'unknown',
    platform: typeof navigator !== 'undefined' ? navigator.platform : 'unknown',
    touchSupport: typeof navigator !== 'undefined' ? 'ontouchstart' in navigator : false,
    canvasHash: '',
    webglHash: '',
  }

  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      canvas.width = 200
      canvas.height = 50
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillStyle = '#f60'
        ctx.fillRect(125, 1, 62, 20)
        ctx.fillStyle = '#069'
        ctx.fillText('TBM fingerprint', 2, 15)
        components.canvasHash = canvas.toDataURL().slice(-50)
      }
    }
  } catch { /* canvas blocked */ }

  try {
    if (typeof document !== 'undefined') {
      const canvas = document.createElement('canvas')
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        if (debugInfo) {
          components.webglHash = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).substring(0, 50)
        }
      }
    }
  } catch { /* webgl blocked */ }

  const raw = Object.values(components).join('|')
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }

  return {
    hash: 'fp_' + Math.abs(hash).toString(36),
    components,
  }
}
