import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppHeader from '../../app/components/AppHeader.vue'

describe('AppHeader.vue', () => {
  it('renders correctly with default slot content', () => {
    const wrapper = mount(AppHeader, {
      slots: {
        default: '<span class="title">AMMS Portal</span>'
      }
    })

    expect(wrapper.classes()).toContain('app-header')
    expect(wrapper.find('.title').exists()).toBe(true)
    expect(wrapper.text()).toBe('AMMS Portal')
  })

  it('renders an empty container when no slot is passed', () => {
    const wrapper = mount(AppHeader)
    expect(wrapper.classes()).toContain('app-header')
    expect(wrapper.text()).toBe('')
  })
})
