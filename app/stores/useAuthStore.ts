import { defineStore } from 'pinia'

export interface User {
  id?: number
  first_name?: string
  last_name?: string
  email?: string
  role_id?: number
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: useCookie<string | null>('jwt_token').value || null,
    user: null as User | null,
    loading: false
  }),
  getters: {
    isAuthenticated: (state) => !!state.token
  },
  actions: {
    setToken(token: string, user?: User) {
      this.token = token
      if (user) this.user = user
      const cookie = useCookie('jwt_token')
      cookie.value = token
    },
    logout() {
      this.token = null
      this.user = null
      const cookie = useCookie('jwt_token')
      cookie.value = null
      navigateTo('/login')
    }
  }
})
