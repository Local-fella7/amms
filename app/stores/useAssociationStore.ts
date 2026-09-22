import { defineStore } from 'pinia'
import { resolveAssetUrl } from '~/utils/image'
import type { Association } from '~/types'

export interface AssociationState {
  name: string
  logo: string | null
  logoUpdatedAt: number | string | null
  logoLoadError: boolean
}

export const useAssociationStore = defineStore('association', {
  state: (): AssociationState => {
    let initialName = ''
    let initialLogo: string | null = 'uploads/logos/logo.jpg'
    let initialTs: number | string | null = null

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const cachedName = localStorage.getItem('amms_association_name')
        if (cachedName) initialName = cachedName

        const cachedLogo = localStorage.getItem('amms_association_logo')
        if (cachedLogo) initialLogo = cachedLogo

        const cachedTs = localStorage.getItem('amms_association_logo_ts')
        if (cachedTs) initialTs = Number(cachedTs) || cachedTs
      } catch {
        // Ignore storage errors in restricted contexts
      }
    }

    return {
      name: initialName,
      logo: initialLogo,
      logoUpdatedAt: initialTs,
      logoLoadError: false
    }
  },

  getters: {
    logoUrl: (state): string => {
      if (state.logoLoadError || !state.logo) return ''
      return resolveAssetUrl(state.logo, { timestamp: state.logoUpdatedAt ?? undefined })
    }
  },

  actions: {
    init() {
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const cachedName = localStorage.getItem('amms_association_name')
          if (cachedName) this.name = cachedName

          const cachedLogo = localStorage.getItem('amms_association_logo')
          if (cachedLogo) this.logo = cachedLogo

          const cachedTs = localStorage.getItem('amms_association_logo_ts')
          if (cachedTs) this.logoUpdatedAt = Number(cachedTs) || cachedTs
        } catch {
          // Ignore
        }
      }
    },

    setAssociation(record: Partial<Association> & { logoUpdatedAt?: number | string }) {
      if (record.name !== undefined && record.name !== null) {
        this.name = record.name
      }
      if (record.logo !== undefined) {
        this.logo = record.logo || null
      }

      const ts = record.logoUpdatedAt ?? Date.now()
      this.logoUpdatedAt = ts
      this.logoLoadError = false

      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          if (this.name) localStorage.setItem('amms_association_name', this.name)
          if (this.logo) localStorage.setItem('amms_association_logo', this.logo)
          localStorage.setItem('amms_association_logo_ts', String(ts))
        } catch {
          // Ignore
        }
      }
    },

    setLogoLoadError(val = true) {
      this.logoLoadError = val
    }
  }
})
