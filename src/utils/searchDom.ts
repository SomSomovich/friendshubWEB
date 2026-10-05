/**
 * The two elements the sidebar's search owns, found by id.
 *
 * The field and the results sit in different branches of the sidebar, and the
 * keystroke that enters the list belongs to one while the ones that move inside
 * it belong to the other. A shared id is the smallest thing that lets them meet;
 * threading a ref through a component that renders neither would be larger and
 * no clearer.
 */

export const SEARCH_RESULTS_ID = 'search-results'
export const SEARCH_INPUT_ID = 'search-input'

/** Every row a key can land on, in the order they are drawn. */
export function focusableRows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>('button')]
}

/** The field, when it is on screen. */
export function searchInput(): HTMLElement | null {
  return document.getElementById(SEARCH_INPUT_ID)
}

/** The results list, when there is one. */
export function searchResults(): HTMLElement | null {
  return document.getElementById(SEARCH_RESULTS_ID)
}
