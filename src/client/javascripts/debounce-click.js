/** How long (ms) a button stays locked after the first click. */
const DEBOUNCE_TIMEOUT_MS = 10_000

/**
 * Shared debounce logic used by both the click and keydown handlers.
 * @param {Event} event
 */
function handleActivation(event) {
  const button = /** @type {HTMLButtonElement} */ (event.currentTarget)

  if (button.dataset.debouncing === 'true') {
    event.preventDefault()
    event.stopImmediatePropagation()
    return
  }

  button.dataset.debouncing = 'true'

  setTimeout(() => {
    delete button.dataset.debouncing
  }, DEBOUNCE_TIMEOUT_MS)
}

/**
 * Click handler that prevents a button from being activated more than once
 * within {@link DEBOUNCE_TIMEOUT_MS}.
 * @param {MouseEvent} event
 */
function handleButtonClick(event) {
  handleActivation(event)
}

/**
 * Keydown handler that prevents a button from being activated more than once
 * within {@link DEBOUNCE_TIMEOUT_MS} when submitted via Enter or Space.
 * @param {KeyboardEvent} event
 */
function handleButtonKeydown(event) {
  if (event.key === 'Enter' || event.key === ' ') {
    handleActivation(event)
  }
}

/**
 * Attaches {@link handleButtonClick} to every button that carries the
 * `prevent-multiple-clicks` CSS class so that double-submissions are blocked
 * across the page.
 *
 * Safe to call multiple times — adding the same listener twice on a given
 * element has no effect (the browser deduplicates identical listener/options
 * pairs).
 */
export function initDebounceClick() {
  const buttons = /** @type {NodeListOf<HTMLButtonElement>} */ (
    document.querySelectorAll('.prevent-multiple-clicks')
  )

  for (const button of buttons) {
    button.addEventListener('click', handleButtonClick)
    button.addEventListener('keydown', handleButtonKeydown)
  }
}
