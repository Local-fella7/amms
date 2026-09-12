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

export const getMemberPhotoUrl = (pic?: string, backendBase = ''): string => {
  if (!pic) return ''
  if (pic.startsWith('http') || pic.startsWith('data:') || pic.startsWith('blob:')) return pic
  const cleanPath = pic.replace(/^\/+/, '')
  const base = backendBase ? backendBase.replace(/\/+$/, '') : ''
  return base ? `${base}/${cleanPath}` : `/${cleanPath}`
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
    const ageGroups: AgeGroup[] = [
      { id: 1, name: 'Children', from_age: 0, to_age: 12 },
      { id: 2, name: 'Youth', from_age: 13, to_age: 24 },
      { id: 3, name: 'Adult', from_age: 25, to_age: 59 },
      { id: 4, name: 'Senior', from_age: 60, to_age: 120 }
    ]

    it('matches child group', () => {
      expect(matchAgeGroup(8, ageGroups)?.name).toBe('Children')
    })

    it('matches youth group', () => {
      expect(matchAgeGroup(18, ageGroups)?.name).toBe('Youth')
    })

    it('matches adult group', () => {
      expect(matchAgeGroup(35, ageGroups)?.name).toBe('Adult')
    })

    it('matches senior group', () => {
      expect(matchAgeGroup(70, ageGroups)?.name).toBe('Senior')
    })

    it('returns null when age is null', () => {
      expect(matchAgeGroup(null, ageGroups)).toBeNull()
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
  })
})
