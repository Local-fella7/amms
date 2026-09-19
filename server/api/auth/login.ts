export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = ((config.apiBase as string) || 'https://asa.or.tz/backend/api').replace(/\/+$/, '')
  const reqUrl = getRequestURL(event)

  return proxyRequest(event, `${apiBase}/auth/login${reqUrl.search}`, {
    headers: {
      Accept: 'application/json',
      'Content-Type': getHeader(event, 'content-type') || 'application/json'
    }
  })
})
