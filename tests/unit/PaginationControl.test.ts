import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import PaginationControl from '../../app/components/PaginationControl.vue'

describe('PaginationControl.vue', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    totalItems: 50,
    itemsPerPage: 10
  }

  it('renders without errors', () => {
    const wrapper = mount(PaginationControl, { props: defaultProps })
    expect(wrapper.exists()).toBe(true)
  })

  it('shows correct "Showing X to Y of Z entries" text on first page', () => {
    const wrapper = mount(PaginationControl, { props: defaultProps })
    const text = wrapper.text()
    expect(text).toContain('1')
    expect(text).toContain('10')
    expect(text).toContain('50')
  })

  it('shows correct range on middle page', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 3 }
    })
    const text = wrapper.text()
    expect(text).toContain('21')
    expect(text).toContain('30')
  })

  it('shows correct range on last page', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 5 }
    })
    const text = wrapper.text()
    expect(text).toContain('41')
    expect(text).toContain('50')
  })

  it('disables Previous button on first page', () => {
    const wrapper = mount(PaginationControl, { props: defaultProps })
    const prevBtn = wrapper.find('button[title="Previous Page"]')
    expect(prevBtn.attributes('disabled')).toBeDefined()
  })

  it('disables Next button on last page', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 5 }
    })
    const nextBtn = wrapper.find('button[title="Next Page"]')
    expect(nextBtn.attributes('disabled')).toBeDefined()
  })

  it('Previous button is enabled when not on first page', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 3 }
    })
    const prevBtn = wrapper.find('button[title="Previous Page"]')
    expect(prevBtn.attributes('disabled')).toBeUndefined()
  })

  it('Next button is enabled when not on last page', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 3 }
    })
    const nextBtn = wrapper.find('button[title="Next Page"]')
    expect(nextBtn.attributes('disabled')).toBeUndefined()
  })

  it('emits update:currentPage with incremented page when Next is clicked', async () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 2 }
    })
    await wrapper.find('button[title="Next Page"]').trigger('click')
    expect(wrapper.emitted('update:currentPage')).toBeTruthy()
    expect(wrapper.emitted('update:currentPage')![0]).toEqual([3])
  })

  it('emits update:currentPage with decremented page when Previous is clicked', async () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 3 }
    })
    await wrapper.find('button[title="Previous Page"]').trigger('click')
    expect(wrapper.emitted('update:currentPage')![0]).toEqual([2])
  })

  it('does not emit below page 1 when already on page 1 and Previous is clicked', async () => {
    const wrapper = mount(PaginationControl, { props: defaultProps })
    // Button is disabled, click should not emit
    const prevBtn = wrapper.find('button[title="Previous Page"]')
    await prevBtn.trigger('click')
    // No emit expected since button is disabled
    const emitted = wrapper.emitted('update:currentPage')
    expect(emitted).toBeFalsy()
  })

  it('emits update:itemsPerPage when page size dropdown changes', async () => {
    const wrapper = mount(PaginationControl, { props: defaultProps })
    const select = wrapper.find('select#pageSizeSelect')
    await select.setValue('25')
    expect(wrapper.emitted('update:itemsPerPage')).toBeTruthy()
    expect(wrapper.emitted('update:itemsPerPage')![0]).toEqual([25])
  })

  it('shows "Page X of Y" label', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, currentPage: 2, totalPages: 5 }
    })
    expect(wrapper.text()).toContain('Page 2 of 5')
  })

  it('shows "Page 1 of 1" when totalPages is 0', () => {
    const wrapper = mount(PaginationControl, {
      props: { ...defaultProps, totalPages: 0 }
    })
    expect(wrapper.text()).toContain('Page 1 of 1')
  })
})
