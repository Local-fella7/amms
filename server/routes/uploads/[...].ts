export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  let apiBase = ((config.apiBase as string) || 'https://asa.or.tz/backend/api').replace(/\/+$/, '')
  const backendBase = apiBase.replace(/\/api\/?$/, '')
  
  const reqUrl = getRequestURL(event)
  return proxyRequest(event, `${backendBase}${reqUrl.pathname}${reqUrl.search}`)
})
