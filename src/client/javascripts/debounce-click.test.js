import { initDebounceClick } from '~/src/client/javascripts/debounce-click.js'

const DEBOUNCE_TIMEOUT_MS = 10_000

/**
 * @param {string} [extraClasses]
 * @returns {HTMLButtonElement}
 */
function makeButton(extraClasses = '') {
  const button = document.createElement('button')
  button.className = `prevent-multiple-clicks ${extraClasses}`.trim()
  document.body.appendChild(button)
  return button
}

/**
 * @param {HTMLButtonElement} button
 * @returns {MouseEvent}
 */
function click(button) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true })
  button.dispatchEvent(event)
  return event
}

/**
 * @param {HTMLButtonElement} button
 * @param {string} key
 * @returns {KeyboardEvent}
 */
function keydown(button, key) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true
  })
  button.dispatchEvent(event)
  return event
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('initDebounceClick', () => {
  it('attaches a click listener to every .prevent-multiple-clicks button', () => {
    const b1 = makeButton()
    const b2 = makeButton()
    const spy1 = jest.fn()
    const spy2 = jest.fn()
    b1.addEventListener('click', spy1)
    b2.addEventListener('click', spy2)

    initDebounceClick()

    click(b1)
    click(b2)

    expect(spy1).toHaveBeenCalledTimes(1)
    expect(spy2).toHaveBeenCalledTimes(1)
  })

  it('does not attach to buttons that lack the class', () => {
    const plain = document.createElement('button')
    document.body.appendChild(plain)
    const spy = jest.fn()
    plain.addEventListener('click', spy)

    initDebounceClick()
    click(plain)

    // Listener still runs — debounce was never applied
    expect(plain.dataset.debouncing).toBeUndefined()
  })
})

describe('handleButtonClick (via initDebounceClick)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sets data-debouncing="true" on the first click', () => {
    const button = makeButton()
    initDebounceClick()

    click(button)

    expect(button.dataset.debouncing).toBe('true')
  })

  it('allows a second click after the debounce timeout expires', () => {
    const button = makeButton()
    const spy = jest.fn()
    button.addEventListener('click', spy)
    initDebounceClick()

    click(button)
    jest.advanceTimersByTime(DEBOUNCE_TIMEOUT_MS)
    click(button)

    expect(button.dataset.debouncing).toBe('true')
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('removes data-debouncing after the timeout', () => {
    const button = makeButton()
    initDebounceClick()

    click(button)
    expect(button.dataset.debouncing).toBe('true')

    jest.advanceTimersByTime(DEBOUNCE_TIMEOUT_MS)
    expect(button.dataset.debouncing).toBeUndefined()
  })

  it('prevents the default action on a duplicate click', () => {
    const button = makeButton()
    initDebounceClick()
    click(button)

    const duplicate = new MouseEvent('click', {
      bubbles: true,
      cancelable: true
    })
    button.dispatchEvent(duplicate)

    expect(duplicate.defaultPrevented).toBe(true)
  })

  it('stops immediate propagation on a duplicate click', () => {
    const button = makeButton()
    initDebounceClick()
    click(button)

    const subsequent = jest.fn()
    button.addEventListener('click', subsequent)

    click(button)

    expect(subsequent).not.toHaveBeenCalled()
  })

  it('does not fire listeners registered after the handler for a click within the timeout window', () => {
    const button = makeButton()
    initDebounceClick()
    // Registered after initDebounceClick so the debounce handler runs first and
    // can call stopImmediatePropagation before this listener is reached.
    const spy = jest.fn()
    button.addEventListener('click', spy)

    click(button)
    jest.advanceTimersByTime(DEBOUNCE_TIMEOUT_MS - 1)
    click(button)

    // First click let through, second is still within the window — spy blocked
    expect(spy).toHaveBeenCalledTimes(1)
  })
})

describe('handleButtonKeydown (via initDebounceClick)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('sets data-debouncing="true" on Enter', () => {
    const button = makeButton()
    initDebounceClick()

    keydown(button, 'Enter')

    expect(button.dataset.debouncing).toBe('true')
  })

  it('sets data-debouncing="true" on Space', () => {
    const button = makeButton()
    initDebounceClick()

    keydown(button, ' ')

    expect(button.dataset.debouncing).toBe('true')
  })

  it('ignores keys other than Enter and Space', () => {
    const button = makeButton()
    initDebounceClick()

    keydown(button, 'Tab')

    expect(button.dataset.debouncing).toBeUndefined()
  })

  it('prevents default on a duplicate Enter keydown', () => {
    const button = makeButton()
    initDebounceClick()
    keydown(button, 'Enter')

    const duplicate = keydown(button, 'Enter')

    expect(duplicate.defaultPrevented).toBe(true)
  })

  it('stops immediate propagation on a duplicate keydown within the timeout window', () => {
    const button = makeButton()
    initDebounceClick()
    keydown(button, 'Enter')

    const spy = jest.fn()
    button.addEventListener('keydown', spy)
    keydown(button, 'Enter')

    expect(spy).not.toHaveBeenCalled()
  })

  it('allows a second keydown after the debounce timeout expires', () => {
    const button = makeButton()
    const spy = jest.fn()
    button.addEventListener('keydown', spy)
    initDebounceClick()

    keydown(button, 'Enter')
    jest.advanceTimersByTime(DEBOUNCE_TIMEOUT_MS)
    keydown(button, 'Enter')

    expect(button.dataset.debouncing).toBe('true')
    expect(spy).toHaveBeenCalledTimes(2)
  })
})
