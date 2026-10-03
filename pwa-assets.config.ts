import { defineConfig } from '@vite-pwa/assets-generator/config'
import type { Preset } from '@vite-pwa/assets-generator/config'

/**
 * Background colour of `public/icons/icon-512.png`, sampled from the artwork.
 * Maskable icons are padded with it so Android's mask never cuts into a
 * colour that is not part of the icon.
 */
const ICON_BACKGROUND = '#17173d'

const preset: Preset = {
  transparent: {
    sizes: [16, 32, 64, 192, 512],
  },
  maskable: {
    sizes: [512],
    padding: 0.15,
    resizeOptions: { background: ICON_BACKGROUND },
  },
  apple: {
    sizes: [180],
  },
}

export default defineConfig({
  preset,
  /**
   * The generator always writes its output next to the source image, so the
   * source has to live in `public/pwa-icons/`. `scripts/generate-pwa-assets.mjs`
   * copies `public/icons/icon-512.png` there under a temporary name and removes
   * the copy again once generation is done.
   */
  images: ['public/pwa-icons/icon-source.png'],
  headLinkOptions: {
    basePath: '/pwa-icons/',
  },
})
