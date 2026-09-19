export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.apiBase || 'https://asa.or.tz/backend/api'
  
  // Extract route path following /api/
  const reqUrl = getRequestURL(event)
  const path = reqUrl.pathname.replace(/^\/api/, '')

  // Extract JWT token from cookie or incoming Authorization header
  const authHeader = getHeader(event, 'authorization')
  const cookieToken = getCookie(event, 'jwt_token')
  
  const token = authHeader || (cookieToken ? `Bearer ${cookieToken}` : null)

  const headers: Record<string, string> = {
    'Accept': 'application/json'
  }

  const incomingContentType = getHeader(event, 'content-type')
  if (incomingContentType) {
    headers['Content-Type'] = incomingContentType
  } else if (event.method !== 'GET' && event.method !== 'HEAD') {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = token
  }

  return proxyRequest(event, `${apiBase}${path}${reqUrl.search}`, {
    headers
  })
})
