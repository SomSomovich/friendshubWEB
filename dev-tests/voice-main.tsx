import { createRoot } from 'react-dom/client'
// Side-effect import: configures i18next from the stored preference, so the
// stand speaks whichever language the capture asked for.
import '../src/i18n/index'
import '../src/index.css'
import { applyTheme, isTheme, THEME_STORAGE_KEY } from '../src/theme/theme'
import { readPreference } from '../src/utils/browserStorage'
import { VoiceStand } from './voice'

// In the app the theme is on `<html>` before the first paint, put there by the
// bootstrap script in `index.html`. This stand has no such script, so it reads
// the stored preference itself — `readActiveTheme` would only ever find the
// default here, and the light capture came out dark because of it.
const storedTheme = readPreference(THEME_STORAGE_KEY)
applyTheme(isTheme(storedTheme) ? storedTheme : 'dark')

const container = document.getElementById('root')

if (!container) {
  throw new Error('Missing #root element in voice.html')
}

createRoot(container).render(<VoiceStand />)
