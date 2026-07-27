/**
 * Nunjucks filter to add/replace a parameter on a query string of a url
 * @param {string} urlPath - existing relative url with query string
 * @param {string} paramName - name of parameter
 * @param {string} paramValue - value of parameter
 * @returns {string}
 */
export function applyUrlParam(urlPath, paramName, paramValue) {
  if (typeof urlPath !== 'string') {
    return ''
  }
  const url = new URL(urlPath, 'https://dummy')
  url.searchParams.set(paramName, paramValue)

  return url.pathname + url.search
}
