document.addEventListener('DOMContentLoaded', function () {
  // Fix all links that should have the baseurl
  document.querySelectorAll('a[href^="/"]').forEach(function (link) {
    if (
      !link.href.includes('/forms-engine-plugin') &&
      !link.href.match(/^https?:\/\//) &&
      !link.getAttribute('href').startsWith('/forms-engine-plugin')
    ) {
      const href = link.getAttribute('href')
      link.href = '/forms-engine-plugin' + href
    }
  })
})
