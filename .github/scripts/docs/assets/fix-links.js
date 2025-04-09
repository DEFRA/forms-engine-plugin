document.addEventListener('DOMContentLoaded', function () {
  // Fix all links that should have the baseurl
  document.querySelectorAll('a').forEach(function (link) {
    const href = link.getAttribute('href')

    // Skip links that already have the baseurl or are external or anchors
    if (
      href.includes('/forms-engine-plugin') ||
      href.match(/^https?:\/\//) ||
      href.startsWith('#')
    ) {
      return
    }

    // Fix schema links specifically
    if (href.includes('schemas/') || href.startsWith('/schemas/')) {
      link.href =
        '/forms-engine-plugin' + (href.startsWith('/') ? '' : '/') + href
    }
    // Fix other internal links that start with /
    else if (href.startsWith('/')) {
      link.href = '/forms-engine-plugin' + href
    }
  })
})
