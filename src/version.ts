import packageJson from '../package.json'

/**
 * What the About section reports.
 *
 * The version is read from `package.json` rather than written down a second
 * time: a release bumps one file, and a hardcoded copy here would quietly drift
 * out of step with it.
 */
export const APP_VERSION: string = packageJson.version

export const REPOSITORY_URL = 'https://github.com/SomSomovich/friendshubWEB'

/** The crypto module is built from its own repository; see WASM_API.txt. */
export const CRYPTO_MODULE_URL = 'https://github.com/SomSomovich/friendshub-wasm'
