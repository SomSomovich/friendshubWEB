/**
 * Splitting message text into plain runs and links.
 *
 * Only what a person would recognise as a link is matched: an explicit scheme,
 * or a `www.` prefix. Bare domains are deliberately left alone — "и т.д." and
 * "file.txt" are not links, and guessing which dotted words are turns ordinary
 * text into a minefield of false positives.
 */

export type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'link'; text: string; href: string }

const LINK_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"']+/gi

/** Punctuation that ends a sentence rather than a URL. */
const TRAILING_PUNCTUATION = /[.,!?;:'"»«]+$/

export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = []
  let cursor = 0

  for (const match of text.matchAll(LINK_PATTERN)) {
    const start = match.index
    const raw = trimTrailing(match[0])
    if (raw.length === 0) {
      continue
    }

    if (start > cursor) {
      segments.push({ kind: 'text', text: text.slice(cursor, start) })
    }
    segments.push({ kind: 'link', text: raw, href: withScheme(raw) })
    // Whatever was trimmed off the end is text again, and is picked up by the
    // next iteration through `cursor`.
    cursor = start + raw.length
  }

  if (cursor < text.length) {
    segments.push({ kind: 'text', text: text.slice(cursor) })
  }
  return segments
}

/**
 * Drops sentence punctuation from the end of a match.
 *
 * A closing bracket is kept when the URL opened one — Wikipedia-style links end
 * in `)` far more often than a sentence does.
 */
function trimTrailing(raw: string): string {
  let candidate = raw.replace(TRAILING_PUNCTUATION, '')
  while (candidate.endsWith(')') && countOf(candidate, '(') < countOf(candidate, ')')) {
    candidate = candidate.slice(0, -1)
  }
  return candidate
}

function countOf(text: string, character: string): number {
  return [...text].filter((value) => value === character).length
}

function withScheme(raw: string): string {
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
}
