import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppTable from '../../app/components/AppTable.vue'
import PaginationControl from '../../app/components/PaginationControl.vue'

describe('AppTable.vue', () => {
  const sampleColumns = [
    { key: 'name', label: 'Member Name', width: '200px' },
    { key: 'phone', label: 'Phone Number', align: 'center' as const },
    { key: 'amount', label: 'Fee Amount', align: 'right' as const }
  ]

  const sampleItems = [
    { id: 1, name: 'Amina Yusuf', phone: '255712345678', amount: 'TZS 50,000' },
    { id: 2, name: 'Hassan Omar', phone: '255788888888', amount: 'TZS 60,000' }
  ]

  it('renders table headers properly', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems
      },
      global: {
        components: { PaginationControl }
      }
    })

    const headers = wrapper.findAll('th')
    expect(headers).toHaveLength(3)
    expect(headers[0].text()).toBe('Member Name')
    expect(headers[1].text()).toBe('Phone Number')
    expect(headers[2].text()).toBe('Fee Amount')
  })

  it('renders data rows properly', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems
      },
      global: {
        components: { PaginationControl }
      }
    })

    const rows = wrapper.findAll('tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].text()).toContain('Amina Yusuf')
    expect(rows[0].text()).toContain('255712345678')
    expect(rows[0].text()).toContain('TZS 50,000')
  })

  it('displays empty state when items is empty', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: [],
        emptyTitle: 'No members found',
        emptySubtitle: 'Try adjusting your search filters'
      },
      global: {
        components: { PaginationControl }
      }
    })

    expect(wrapper.text()).toContain('No members found')
    expect(wrapper.text()).toContain('Try adjusting your search filters')
  })

  it('renders loading overlay when loading is true', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems,
        loading: true
      },
      global: {
        components: { PaginationControl }
      }
    })

    const spinner = wrapper.find('.spinner-border')
    expect(spinner.exists()).toBe(true)
  })

  it('renders custom column slots', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems
      },
      slots: {
        'cell-name': `<template #cell-name="{ item }">
          <span class="custom-badge">{{ item.name.toUpperCase() }}</span>
        </template>`
      },
      global: {
        components: { PaginationControl }
      }
    })

    expect(wrapper.find('.custom-badge').exists()).toBe(true)
    expect(wrapper.find('.custom-badge').text()).toBe('AMINA YUSUF')
  })

  it('renders toolbar slot when provided', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems
      },
      slots: {
        toolbar: '<div id="test-toolbar"><button>Export CSV</button></div>'
      },
      global: {
        components: { PaginationControl }
      }
    })

    expect(wrapper.find('#test-toolbar').exists()).toBe(true)
    expect(wrapper.find('#test-toolbar').text()).toContain('Export CSV')
  })

  it('renders pagination control when totalItems > 0', () => {
    const wrapper = mount(AppTable, {
      props: {
        columns: sampleColumns,
        items: sampleItems,
        totalItems: 50,
        totalPages: 5,
        currentPage: 1,
        itemsPerPage: 10
      },
      global: {
        components: { PaginationControl }
      }
    })

    expect(wrapper.findComponent(PaginationControl).exists()).toBe(true)
  })
})
