import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeleteConfirmModal from '../../app/components/DeleteConfirmModal.vue'

describe('DeleteConfirmModal.vue', () => {
  const defaultProps = {
    modelValue: true,
    title: 'Delete Member',
    message: 'Are you sure you want to delete this member?',
    itemTitle: 'John Doe',
    loading: false,
    confirmText: 'Delete Member'
  }

  const mountModal = (props = {}) => {
    return mount(DeleteConfirmModal, {
      props: { ...defaultProps, ...props },
      global: {
        stubs: {
          teleport: true
        }
      }
    })
  }

  it('renders the title', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Delete Member')
  })

  it('renders the message text', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Are you sure you want to delete this member?')
  })

  it('renders the itemTitle in highlighted box', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('John Doe')
  })

  it('uses default title "Confirm Deletion" when title prop not provided', () => {
    const wrapper = mountModal({ title: undefined })
    expect(wrapper.text()).toContain('Confirm Deletion')
  })

  it('uses custom confirmText on the confirm button', () => {
    const wrapper = mountModal()
    expect(wrapper.text()).toContain('Delete Member')
  })

  it('uses default "Delete Item" confirmText when not provided', () => {
    const wrapper = mountModal({ confirmText: undefined })
    expect(wrapper.text()).toContain('Delete Item')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mountModal()
    const confirmBtn = wrapper.find('button.btn-danger')
    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('disables confirm button while loading', () => {
    const wrapper = mountModal({ loading: true })
    const confirmBtn = wrapper.find('button.btn-danger')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })

  it('shows spinner when loading', () => {
    const wrapper = mountModal({ loading: true })
    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })

  it('hides spinner when not loading', () => {
    const wrapper = mountModal({ loading: false })
    expect(wrapper.find('.spinner-border').exists()).toBe(false)
  })

  it('emits update:modelValue with false when Cancel button is clicked', async () => {
    const wrapper = mountModal()
    const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Cancel'))
    expect(cancelBtn).toBeDefined()
    await cancelBtn?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toBeTruthy()
    expect(wrapper.emitted('update:modelValue')![0]).toEqual([false])
  })

  it('does not render modal content when modelValue is false', () => {
    const wrapper = mountModal({ modelValue: false })
    expect(wrapper.find('.modal').exists()).toBe(false)
  })
})
