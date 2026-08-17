interface IFrameResizeOptions {
  checkOrigin?: boolean | Array<string>
  heightCalculationMethod?: string
  sizeWidth?: boolean
  log?: boolean
  minHeight?: number
  onClose?: () => boolean
}

interface IFrameResizerInstance {
  close: () => void
  removeListeners: () => void
}

declare global {
  interface Window {
    iFrameResize?: (
      options: IFrameResizeOptions,
      target: HTMLIFrameElement | string
    ) => Array<HTMLIFrameElement>
  }

  interface HTMLIFrameElement {
    iFrameResizer?: IFrameResizerInstance
  }
}

export type { IFrameResizeOptions }

const loaders = new Map<string, Promise<void>>()

export function loadIframeResizer(origin: string): Promise<void> {
  if (import.meta.server || typeof window === 'undefined') {
    return Promise.reject(new Error('iframe-resizer is client-only'))
  }

  const cached = loaders.get(origin)
  if (cached) {
    return cached
  }

  const promise = new Promise<void>((resolve, reject) => {
    if (typeof window.iFrameResize === 'function') {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = `${origin}/app/iframeResizer.js`
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      reject(new Error(`Failed to load iframe-resizer from ${origin}`))
    }
    document.head.appendChild(script)
  })

  loaders.set(origin, promise)
  promise.catch(() => {
    loaders.delete(origin)
  })

  return promise
}
