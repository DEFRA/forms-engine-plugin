/**
 * In local development environments, we sometimes need to rewrite the
 * CDP upload URL to work with CSP/CORS restrictions.
 * This helper function rewrites localhost URLs to use the sslip.io proxy
 * This is only used when running locally with a development proxy.
 * In non-local environments, this function returns null
 * @param {string} [uploadUrl] - The original upload URL from CDP
 * @returns {string | null}
 */
export function getProxyUrlForLocalDevelopment(uploadUrl) {
  if (!uploadUrl?.includes('localhost:7337')) {
    return null
  }

  return uploadUrl.replace(
    /localhost:7337/g,
    'uploader.127.0.0.1.sslip.io:7300'
  )
}
