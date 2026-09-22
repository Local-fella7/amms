import { describe, it, expect } from 'vitest'
import type { Member, AgeGroup } from '../../app/types'

// Extracted pure logic matching members/index.vue & SharedMemberModal.vue
export const formatPhoneNumber = (val: string): string => {
  if (!val) return '255'

  // Strip all non-digit characters
  let digits = val.replace(/\D/g, '')

  // Ensure starts with 255
  if (!digits.startsWith('255')) {
    digits = '255' + digits.replace(/^255?/, '')
  }

  // Omit leading zero after 255 (e.g. 2550755555555 -> 255755555555)
  if (digits.startsWith('2550')) {
    digits = '255' + digits.slice(4).replace(/^0+/, '')
  }

  // Max 12 digits
  if (digits.length > 12) {
    digits = digits.slice(0, 12)
  }

  return digits
}

export const calculateAgeFromDob = (dobInput: string | Date, referenceDate = new Date()): number | null => {
  if (!dobInput) return null

  const dobDate = dobInput instanceof Date ? dobInput : new Date(dobInput)
  if (isNaN(dobDate.getTime())) return null

  let age = referenceDate.getFullYear() - dobDate.getFullYear()
  const monthDiff = referenceDate.getMonth() - dobDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && referenceDate.getDate() < dobDate.getDate())) {
    age--
  }

  return age >= 0 ? age : 0
}

export const matchAgeGroup = (age: number | null, ageGroups: AgeGroup[]): AgeGroup | null => {
  if (age === null || !ageGroups || ageGroups.length === 0) return null

  const matched = ageGroups.find(g => {
    const min = g.from_age !== undefined && g.from_age !== null && g.from_age !== '' ? Number(g.from_age) : 0
    const max = g.to_age !== undefined && g.to_age !== null && g.to_age !== '' ? Number(g.to_age) : 999
    return age >= min && age <= max
  })

  return matched || ageGroups[0] || null
}

export const getMemberPhotoPath = (m?: Partial<Member> | null): string => {
  if (!m) return ''
  return m.photo || m.picture || m.photo_url || m.avatar || m.image || ''
}

export const getMemberPhotoUrl = (pic?: string, backendBase = '', updatedAt?: string): string => {
  if (!pic) return ''
  if (pic.startsWith('data:') || pic.startsWith('blob:')) return pic
  let url = ''
  if (pic.startsWith('http')) {
    url = pic
  } else {
    const cleanPath = pic.replace(/^\/+/, '')
    const base = backendBase ? backendBase.replace(/\/+$/, '') : ''
    url = base ? `${base}/${cleanPath}` : `/${cleanPath}`
  }
  if (updatedAt) {
    const sep = url.includes('?') ? '&' : '?'
    url = `${url}${sep}v=${encodeURIComponent(updatedAt)}`
  }
  return url
}

export const buildMemberUpdateFormData = (payload: Record<string, any>, photoFile?: any): FormData => {
  const fd = new FormData()
  fd.append('_method', 'PUT')
  Object.entries(payload).forEach(([k, v]) => {
    if (v !== undefined && v !== null) fd.append(k, String(v))
  })
  if (photoFile) {
    fd.append('photo', photoFile)
  }
  return fd
}

describe('Member Logic & Formatting', () => {
  describe('formatPhoneNumber', () => {
    it('returns "255" when value is empty', () => {
      expect(formatPhoneNumber('')).toBe('255')
    })

    it('adds 255 prefix if user typed only local number without prefix', () => {
      expect(formatPhoneNumber('755123456')).toBe('255755123456')
    })

    it('strips non-digits (spaces, dashes, plus sign)', () => {
      expect(formatPhoneNumber('+255 755-123-456')).toBe('255755123456')
    })

    it('strips leading zero after 255 prefix (e.g. 2550712345678 -> 255712345678)', () => {
      expect(formatPhoneNumber('2550712345678')).toBe('255712345678')
    })

    it('truncates to maximum of 12 digits', () => {
      expect(formatPhoneNumber('255712345678999999')).toBe('255712345678')
    })
  })

  describe('calculateAgeFromDob', () => {
    const fixedRef = new Date(2026, 8, 12) // Sept 12, 2026

    it('accurately calculates age when birthday already occurred this year', () => {
      expect(calculateAgeFromDob('2000-05-10', fixedRef)).toBe(26)
    })

    it('accurately calculates age when birthday is later this year', () => {
      expect(calculateAgeFromDob('2000-11-20', fixedRef)).toBe(25)
    })

    it('returns null for empty or invalid date', () => {
      expect(calculateAgeFromDob('')).toBeNull()
      expect(calculateAgeFromDob('not-a-date')).toBeNull()
    })
  })

  describe('matchAgeGroup', () => {
    const sampleGroups: AgeGroup[] = [
      { id: 1, name: 'Youth', from_age: 18, to_age: 35 },
      { id: 2, name: 'Adult', from_age: 36, to_age: 59 },
      { id: 3, name: 'Senior', from_age: 60, to_age: 120 }
    ]

    it('matches exact bracket boundaries', () => {
      expect(matchAgeGroup(18, sampleGroups)?.name).toBe('Youth')
      expect(matchAgeGroup(35, sampleGroups)?.name).toBe('Youth')
      expect(matchAgeGroup(36, sampleGroups)?.name).toBe('Adult')
      expect(matchAgeGroup(60, sampleGroups)?.name).toBe('Senior')
    })

    it('returns first group as default fallback if age is outside all brackets', () => {
      expect(matchAgeGroup(10, sampleGroups)?.name).toBe('Youth')
    })

    it('returns null if age is null or list is empty', () => {
      expect(matchAgeGroup(null, sampleGroups)).toBeNull()
      expect(matchAgeGroup(25, [])).toBeNull()
    })
  })

  describe('getMemberPhotoPath & getMemberPhotoUrl', () => {
    it('picks photo property first if available', () => {
      const m = { photo: 'uploads/photos/photo.jpg', picture: 'picture.jpg' }
      expect(getMemberPhotoPath(m)).toBe('uploads/photos/photo.jpg')
    })

    it('falls back through picture, photo_url, avatar, image', () => {
      expect(getMemberPhotoPath({ picture: 'pic.jpg' })).toBe('pic.jpg')
      expect(getMemberPhotoPath({ photo_url: 'url.jpg' })).toBe('url.jpg')
      expect(getMemberPhotoPath({ avatar: 'av.jpg' })).toBe('av.jpg')
      expect(getMemberPhotoPath({ image: 'img.jpg' })).toBe('img.jpg')
      expect(getMemberPhotoPath({})).toBe('')
      expect(getMemberPhotoPath(null)).toBe('')
    })

    it('preserves absolute URLs or data/blob strings', () => {
      expect(getMemberPhotoUrl('https://example.com/pic.jpg', 'http://api.local')).toBe('https://example.com/pic.jpg')
      expect(getMemberPhotoUrl('data:image/jpeg;base64,...', 'http://api.local')).toBe('data:image/jpeg;base64,...')
      expect(getMemberPhotoUrl('blob:http://localhost/123', 'http://api.local')).toBe('blob:http://localhost/123')
    })

    it('prefixes relative path with backendBase without double slashes', () => {
      expect(getMemberPhotoUrl('uploads/photos/1.jpg', 'http://api.local')).toBe('http://api.local/uploads/photos/1.jpg')
      expect(getMemberPhotoUrl('/uploads/photos/1.jpg', 'http://api.local/')).toBe('http://api.local/uploads/photos/1.jpg')
      expect(getMemberPhotoUrl('uploads/photos/1.jpg', '')).toBe('/uploads/photos/1.jpg')
    })

    it('appends cache buster timestamp query parameter when updatedAt is provided', () => {
      const url = getMemberPhotoUrl('uploads/members/7.webp', 'https://asa.or.tz/backend', '2026-09-21 08:50:34')
      expect(url).toBe('https://asa.or.tz/backend/uploads/members/7.webp?v=2026-09-21%2008%3A50%3A34')
    })

    it('correctly appends cache buster with & if URL already contains query parameters', () => {
      const url = getMemberPhotoUrl('uploads/members/7.webp?existing=1', 'https://asa.or.tz/backend', '2026-09-21')
      expect(url).toBe('https://asa.or.tz/backend/uploads/members/7.webp?existing=1&v=2026-09-21')
    })
  })

  describe('buildMemberUpdateFormData (Method Spoofing)', () => {
    it('always appends _method=PUT to enable PHP multipart parsing on resource updates', () => {
      const payload = { first_name: 'Ahmed', last_name: 'Mahmoud', email: 'ahmed@example.com' }
      const fd = buildMemberUpdateFormData(payload)
      expect(fd.get('_method')).toBe('PUT')
      expect(fd.get('first_name')).toBe('Ahmed')
      expect(fd.get('last_name')).toBe('Mahmoud')
      expect(fd.get('email')).toBe('ahmed@example.com')
    })

    it('attaches photo file and skips undefined/null fields', () => {
      const payload = { first_name: 'Ahmed', mothers_name: undefined, fathers_name: null }
      const fakePhoto = new File(['fake content'], 'avatar.webp', { type: 'image/webp' })
      const fd = buildMemberUpdateFormData(payload, fakePhoto)
      expect(fd.get('_method')).toBe('PUT')
      expect(fd.get('first_name')).toBe('Ahmed')
      expect(fd.get('mothers_name')).toBeNull()
      expect(fd.get('fathers_name')).toBeNull()
      expect(fd.get('photo')).toBe(fakePhoto)
    })
  })
})
