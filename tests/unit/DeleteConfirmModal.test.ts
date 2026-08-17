import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DeleteConfirmModal from '../../app/components/DeleteConfirmModal.vue'

describe('DeleteConfirmModal.vue', () => {
  const defaultProps = {
    id: 'delete-modal',
    title: 'Delete Member',
    message: 'Are you sure you want to delete this member?',
    itemTitle: 'John Doe',
    loading: false,
    confirmText: 'Delete Member'
  }

  it('renders the title', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Delete Member')
  })

  it('renders the message text', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Are you sure you want to delete this member?')
  })

  it('renders the itemTitle in highlighted box', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    expect(wrapper.text()).toContain('John Doe')
  })

  it('uses default title "Confirm Deletion" when title prop not provided', () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { id: 'modal', message: 'Delete?' }
    })
    expect(wrapper.text()).toContain('Confirm Deletion')
  })

  it('uses custom confirmText on the confirm button', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    expect(wrapper.text()).toContain('Delete Member')
  })

  it('uses default "Delete Item" confirmText when not provided', () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { id: 'modal', message: 'Delete?' }
    })
    expect(wrapper.text()).toContain('Delete Item')
  })

  it('emits confirm when the confirm button is clicked', async () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    const confirmBtn = wrapper.find('button.btn-danger')
    await confirmBtn.trigger('click')
    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('disables confirm button while loading', () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { ...defaultProps, loading: true }
    })
    const confirmBtn = wrapper.find('button.btn-danger')
    expect(confirmBtn.attributes('disabled')).toBeDefined()
  })

  it('shows spinner when loading', () => {
    const wrapper = mount(DeleteConfirmModal, {
      props: { ...defaultProps, loading: true }
    })
    expect(wrapper.find('.spinner-border').exists()).toBe(true)
  })

  it('hides spinner when not loading', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    expect(wrapper.find('.spinner-border').exists()).toBe(false)
  })

  it('has a Cancel button with data-bs-dismiss attribute', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    const cancelBtn = wrapper.findAll('button').find(b => b.text().includes('Cancel'))
    expect(cancelBtn?.attributes('data-bs-dismiss')).toBe('modal')
  })

  it('renders the modal with correct id attribute', () => {
    const wrapper = mount(DeleteConfirmModal, { props: defaultProps })
    const modal = wrapper.find('#delete-modal')
    expect(modal.exists()).toBe(true)
  })
})
