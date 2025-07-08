export function initPreviewCloseLink() {
  // Show preview close link via `rel="opener"`
  if (window.opener) {
    const $closeLink = document.querySelector('.js-preview-banner-close')

    $closeLink?.removeAttribute('hidden')
    $closeLink?.addEventListener('click', (event) => {
      event.preventDefault()
      window.close()
    })
  }
}
