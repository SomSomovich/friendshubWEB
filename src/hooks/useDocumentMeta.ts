import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * Keeps the document title and the social tags in step with the language.
 *
 * The tags in `index.html` are the Russian defaults — what a crawler that never
 * runs JavaScript sees. This rewrites them for the visitor's own language, and
 * makes `og:image` absolute, which the crawlers that do run later require.
 */
export function useDocumentMeta(title: string, description: string): void {
  const { i18n } = useTranslation()

  useEffect(() => {
    document.title = title
    setMeta('name', 'description', description)
    setMeta('property', 'og:title', title)
    setMeta('property', 'og:description', description)
    setMeta('property', 'og:locale', i18n.language === 'en' ? 'en_US' : 'ru_RU')
    setMeta('name', 'twitter:title', title)
    setMeta('name', 'twitter:description', description)
    setMeta('property', 'og:image', new URL('/icons/icon-512.png', window.location.origin).toString())
  }, [title, description, i18n.language])
}

function setMeta(attribute: 'name' | 'property', key: string, content: string): void {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (element === null) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.append(element)
  }
  element.setAttribute('content', content)
}
