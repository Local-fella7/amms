<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import { useReportPdf } from '~/composables/useReportPdf'

interface FeePayment {
  id: number
  date: string
  payment_mode_id: number | string
  amount: number
  fee_id: number | string
  member_id: number | string
  total_paid?: number
  outstanding?: number
  fee_amount?: number
  member?: {
    id: number
    first_name: string
    last_name: string
    phone?: string
  }
  fee?: {
    id: number
    year?: number
    fee_year?: number
    amount?: number
    name?: string
  }
  payment_mode?: {
    id: number
    name: string
  }
  created_at?: string
  updated_at?: string
}

interface MemberOption {
  id: number
  first_name: string
  last_name: string
  phone?: string
  fee_exemption?: string
}

interface FeeOption {
  id: number
  year?: number
  fee_year?: number
  amount?: number
  name?: string
  description?: string
}

interface PaymentModeOption {
  id: number
  name: string
}

const { data: paymentsResponse, loading, error, execute: fetchPayments, fetchWithAuth } = useApi<any>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: fees, execute: fetchFees } = useApi<FeeOption[]>()
const { data: paymentModes, execute: fetchPaymentModes } = useApi<PaymentModeOption[]>()
const { downloadPdf, openPdfInNewTab, isGenerating: isDownloadingPdf } = useReportPdf()

const searchQuery = ref('')
const selectedPaymentModeFilter = ref<string>('')
const selectedFeeYearFilter = ref<string>('')

const isSubmitting = ref(false)
const modalError = ref('')
const isModalOpen = ref(false)

// Form Fields
const memberId = ref<number | string>('')
const memberSearchQuery = ref('')
const isMemberDropdownOpen = ref(false)
const feeId = ref<number | string>('')
const paymentModeId = ref<number | string>('')
const amount = ref<number | ''>('')
const date = ref(new Date().toISOString().substring(0, 10))

const filteredMemberOptions = computed(() => {
  if (!members.value) return []
  if (!memberSearchQuery.value.trim()) return members.value
  const q = memberSearchQuery.value.toLowerCase()
  return members.value.filter(m => 
    `${m.first_name} ${m.last_name}`.toLowerCase().includes(q) ||
    (m.phone && m.phone.includes(q))
  )
})

const selectMember = (m: MemberOption) => {
  memberId.value = m.id
  memberSearchQuery.value = `${m.first_name} ${m.last_name} (${m.phone || 'No phone'})`
  isMemberDropdownOpen.value = false
}

const clearMemberSelection = () => {
  memberId.value = ''
  memberSearchQuery.value = ''
  isMemberDropdownOpen.value = true
}

// Partial Payment & Balance Status Calculation
const selectedFeeSchedule = computed(() => {
  if (!feeId.value) return null
  if (fees.value && fees.value.length > 0) {
    const found = fees.value.find(f => Number(f.id) === Number(feeId.value))
    if (found) return found
  }
  return null
})

const requiredAmount = computed(() => {
  if (!selectedFeeSchedule.value) return 0
  return Number(selectedFeeSchedule.value.amount || 0)
})

const memberPriorPaymentsForFee = computed(() => {
  if (!memberId.value || !feeId.value) return 0
  const matching = rawPaymentsList.value.filter(
    p => Number(p.member_id) === Number(memberId.value) && Number(p.fee_id) === Number(feeId.value)
  )
  return matching.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
})

const remainingSuggestedAmount = computed(() => {
  if (!selectedFeeSchedule.value) return 0
  const fullFee = Number(selectedFeeSchedule.value.amount || 0)
  const priorPaid = memberPriorPaymentsForFee.value
  return Math.max(0, fullFee - priorPaid)
})

const paymentBalance = computed(() => {
  const paid = Number(amount.value) || 0
  const prior = memberPriorPaymentsForFee.value
  const fullReq = requiredAmount.value
  return Math.max(0, fullReq - (prior + paid))
})

const paymentStatusBadge = computed(() => {
  const paid = Number(amount.value) || 0
  const prior = memberPriorPaymentsForFee.value
  const fullReq = requiredAmount.value
  const totalCovered = prior + paid

  if (fullReq <= 0) return { label: 'Custom Amount', class: 'bg-info bg-opacity-10 text-info border-info' }
  if (totalCovered >= fullReq) return { label: 'Paid in Full', class: 'bg-success bg-opacity-10 text-success border-success' }
  if (totalCovered > 0 && totalCovered < fullReq) return { label: 'Partial Payment', class: 'bg-warning bg-opacity-15 text-warning border-warning' }
  return { label: 'Unpaid', class: 'bg-danger bg-opacity-10 text-danger border-danger' }
})
// View Modal State
const viewingPayment = ref<FeePayment | null>(null)
const isViewModalOpen = ref(false)

// Delete Modal State
const itemToDelete = ref<FeePayment | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleting = ref(false)

// Pagination State
const currentPage = ref(1)
const itemsPerPage = ref(10)

const schema = z.object({
  member_id: z.union([z.number(), z.string().min(1, 'Member selection is required')]),
  fee_id: z.union([z.number(), z.string().min(1, 'Fee schedule selection is required')]),
  payment_mode_id: z.union([z.number(), z.string().min(1, 'Payment mode is required')]),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(4, 'Payment date is required')
})

const loadData = async () => {
  try {
    await Promise.all([
      fetchPayments((api) => api('/api/fee-payments')),
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchFees((api) => api('/api/fees')).catch(() => []),
      fetchPaymentModes((api) => api('/api/payment-modes')).catch(() => [])
    ])
  } catch (err) {
    // Handled by composable
  }
}

const rawPaymentsList = computed<FeePayment[]>(() => {
  if (!paymentsResponse.value) return []
  const res = paymentsResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

const getMemberName = (mId: number | string) => {
  if (!members.value) return `Member #${mId}`
  const found = members.value.find(m => Number(m.id) === Number(mId))
  return found ? `${found.first_name} ${found.last_name}` : `Member #${mId}`
}

const getMemberPhone = (mId: number | string) => {
  if (!members.value) return ''
  const found = members.value.find(m => Number(m.id) === Number(mId))
  return found?.phone || ''
}

const getPaymentModeName = (pmId: number | string) => {
  if (!paymentModes.value) return `Mode #${pmId}`
  const found = paymentModes.value.find(pm => Number(pm.id) === Number(pmId))
  return found ? found.name : `Mode #${pmId}`
}

const getFeeYear = (fItem: FeeOption | number | string) => {
  if (typeof fItem === 'object' && fItem !== null) {
    return fItem.year || fItem.fee_year || '—'
  }
  if (!fees.value) return `Fee #${fItem}`
  const found = fees.value.find(f => Number(f.id) === Number(fItem))
  return found ? (found.year || found.fee_year || '—') : `Fee #${fItem}`
}

const formatCurrency = (val?: number) => {
  if (val === undefined || val === null) return 'TZS 0'
  return `TZS ${Number(val).toLocaleString('en-US')}`
}

const getMemberExemption = (mId: number | string) => {
  if (!members.value) return 'no'
  const found = members.value.find(m => Number(m.id) === Number(mId))
  return found?.fee_exemption || 'no'
}

const getHistoricalRunningBalance = (p: any) => {
  if (p.member?.fee_exemption === 'yes' || getMemberExemption(p.member_id) === 'yes') {
    return 0
  }

  let feeAmt = Number(p.fee_amount || p.fee?.amount || 0)
  if (!feeAmt && fees.value) {
    const feeObj = fees.value.find(f => Number(f.id) === Number(p.fee_id))
    if (feeObj && feeObj.amount) {
      feeAmt = Number(feeObj.amount)
    }
  }

  if (feeAmt <= 0) return 0

  // Filter all payments for the same member & fee year
  const memberFeePayments = rawPaymentsList.value
    .filter(item => Number(item.member_id) === Number(p.member_id) && Number(item.fee_id) === Number(p.fee_id))
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime()
      const dateB = new Date(b.date).getTime()
      if (dateA !== dateB) return dateA - dateB
      return Number(a.id) - Number(b.id)
    })

  // Cumulative sum of payments up to this transaction
  let cumulativePaid = 0
  for (const item of memberFeePayments) {
    cumulativePaid += Number(item.amount) || 0
    if (Number(item.id) === Number(p.id)) {
      break
    }
  }

  return Math.max(0, feeAmt - cumulativePaid)
}

const getPaymentBalance = (p: any) => {
  return getHistoricalRunningBalance(p)
}

// Auto-fill suggested remaining amount when member or fee schedule is selected
watch([feeId, memberId], ([newFeeId, newMemId]) => {
  if (!newFeeId) return
  if (selectedFeeSchedule.value) {
    amount.value = remainingSuggestedAmount.value
  }
})

const filteredPayments = computed(() => {
  let result = [...rawPaymentsList.value]

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => {
      const mName = p.member ? `${p.member.first_name} ${p.member.last_name}` : getMemberName(p.member_id)
      return mName.toLowerCase().includes(q) || String(p.id).includes(q)
    })
  }

  if (selectedPaymentModeFilter.value) {
    result = result.filter(p => Number(p.payment_mode_id) === Number(selectedPaymentModeFilter.value))
  }

  if (selectedFeeYearFilter.value) {
    result = result.filter(p => Number(p.fee_id) === Number(selectedFeeYearFilter.value))
  }

  // Descending sort by Payment Transaction ID
  return result.sort((a, b) => b.id - a.id)
})

// Pagination Slicing
const totalPages = computed(() => Math.ceil(filteredPayments.value.length / itemsPerPage.value) || 1)

const paginatedPayments = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  return filteredPayments.value.slice(start, start + itemsPerPage.value)
})

watch([searchQuery, selectedPaymentModeFilter, selectedFeeYearFilter, itemsPerPage], () => {
  currentPage.value = 1
})

const openAddModal = () => {
  memberId.value = members.value && members.value.length > 0 ? members.value[0].id : ''
  memberSearchQuery.value = members.value && members.value.length > 0 ? `${members.value[0].first_name} ${members.value[0].last_name}` : ''
  feeId.value = fees.value && fees.value.length > 0 ? fees.value[0].id : ''
  paymentModeId.value = paymentModes.value && paymentModes.value.length > 0 ? paymentModes.value[0].id : ''
  
  if (fees.value && fees.value.length > 0 && fees.value[0].amount) {
    amount.value = fees.value[0].amount
  } else {
    amount.value = ''
  }

  date.value = new Date().toISOString().substring(0, 10)
  modalError.value = ''
  isModalOpen.value = true
}

const openViewModal = (p: FeePayment) => {
  viewingPayment.value = p
  isViewModalOpen.value = true
}

const closeViewModal = () => {
  viewingPayment.value = null
  isViewModalOpen.value = false
}

const closeModal = () => {
  isModalOpen.value = false
}

const formatDateToYMD = (val: any) => {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    const yyyy = val.getFullYear()
    const mm = String(val.getMonth() + 1).padStart(2, '0')
    const dd = String(val.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return String(val).substring(0, 10)
}

const formatDateDisplay = (val?: string) => {
  if (!val) return '—'
  const str = String(val).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const parts = str.substring(0, 10).split('-')
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }
  return str
}

const handleSave = async () => {
  modalError.value = ''
  const payload = {
    member_id: Number(memberId.value),
    fee_id: Number(feeId.value),
    payment_mode_id: Number(paymentModeId.value),
    amount: Number(amount.value),
    date: formatDateToYMD(date.value)
  }

  const validation = schema.safeParse(payload)
  if (!validation.success) {
    modalError.value = validation.error.issues[0].message
    push.error(modalError.value)
    return
  }

  isSubmitting.value = true
  try {
    await fetchWithAuth('/api/fee-payments', {
      method: 'POST',
      body: payload
    })
    push.success('Fee payment transaction recorded successfully!')
    
    closeModal()
    await loadData()
  } catch (err: any) {
    console.error('Save payment error:', err)
    const serverErrors = err?.data?.errors ? Object.values(err.data.errors).flat().join(', ') : null
    modalError.value = serverErrors || err?.data?.message || err?.message || 'Failed to save fee payment'
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}

const exportPdfReport = async () => {
  const queryParams = new URLSearchParams()
  if (selectedPaymentModeFilter.value) queryParams.set('payment_mode_id', selectedPaymentModeFilter.value)
  if (selectedFeeYearFilter.value) queryParams.set('fee_id', selectedFeeYearFilter.value)
  
  const url = `/api/reports/fee-payments?${queryParams.toString()}`
  try {
    await openPdfInNewTab(url)
    push.success('Opened fee payments PDF report in new tab')
  } catch (e) {
    push.error('Failed to open PDF report')
  }
}

const downloadMemberStatement = async (mId: number | string) => {
  try {
    await openPdfInNewTab(`/api/reports/member-history/${mId}`)
    push.success('Opened member financial statement in new tab')
  } catch (e) {
    push.error('Failed to open statement')
  }
}

const promptDelete = (p: FeePayment) => {
  itemToDelete.value = p
  isDeleteModalOpen.value = true
}

const cancelDelete = () => {
  itemToDelete.value = null
  isDeleteModalOpen.value = false
}

const confirmDelete = async () => {
  if (!itemToDelete.value) return
  
  isDeleting.value = true
  try {
    await fetchWithAuth(`/api/fee-payments/${itemToDelete.value.id}`, { method: 'DELETE' })
    push.success('Fee payment record deleted successfully!')
    cancelDelete()
    await loadData()
  } catch (err: any) {
    const msg = err?.data?.message || 'Failed to delete fee payment'
    push.error(msg)
  } finally {
    isDeleting.value = false
  }
}

onMounted(() => {
  loadData()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Fee Payments"
      subtitle="Track and manage annual membership fee transaction receipts"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search member name..."
      :loading="loading"
      hideRefresh
      showAddButton
      addButtonText="Record Fee Payment"
      @add="openAddModal"
    />

    <!-- Integrated Table Container with Top Toolbar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden mb-4 position-relative">
      
      <!-- Top Table Toolbar with Integrated Filters -->
      <div class="card-header bg-body-tertiary border-bottom px-4 py-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div class="d-flex align-items-center gap-2 flex-wrap">
          <span class="text-xs fw-bold text-uppercase text-secondary-amms tracking-wider me-1">
            <i class="bi bi-funnel-fill text-primary me-1"></i> Quick Filters:
          </span>

          <!-- Payment Mode Filter Pill -->
          <div style="min-width: 170px;">
            <select 
              v-model="selectedPaymentModeFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedPaymentModeFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Payment Modes</option>
              <option v-for="pm in paymentModes" :key="pm.id" :value="pm.id">{{ pm.name }}</option>
            </select>
          </div>

          <!-- Fee Year Filter Pill -->
          <div style="min-width: 160px;">
            <select 
              v-model="selectedFeeYearFilter" 
              class="form-select form-select-sm rounded-pill text-xs fw-semibold border bg-body ps-3 pe-4 shadow-sm cursor-pointer filter-pill-select"
              :class="selectedFeeYearFilter ? 'border-primary text-primary bg-primary bg-opacity-10' : 'text-body-secondary'"
            >
              <option value="">All Fee Years</option>
              <option v-for="f in fees" :key="f.id" :value="f.id">
                Year {{ getFeeYear(f) }}
              </option>
            </select>
          </div>

          <!-- Clear Filters Link -->
          <button 
            v-if="selectedPaymentModeFilter || selectedFeeYearFilter || searchQuery"
            type="button" 
            class="btn btn-xs btn-link text-danger text-xs text-decoration-none px-2 fw-semibold ms-1"
            @click="selectedPaymentModeFilter = ''; selectedFeeYearFilter = ''; searchQuery = ''"
          >
            <i class="bi bi-x-lg me-1"></i> Clear Filters
          </button>
        </div>

        <div class="d-flex align-items-center gap-3">
          <!-- Total Filtered Counter Badge -->
          <div class="text-xs text-muted font-monospace d-none d-sm-block">
            Showing <span class="fw-bold text-primary">{{ filteredPayments.length }}</span> payments
          </div>

          <!-- Export Report PDF Button -->
          <button
            type="button"
            class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-xs"
            :disabled="isDownloadingReport"
            @click="exportPdfReport"
            title="Download PDF Financial Report"
          >
            <span v-if="isDownloadingReport" class="spinner-border spinner-border-sm" role="status"></span>
            <i v-else class="bi bi-file-earmark-pdf-fill text-danger"></i>
            <span>{{ isDownloadingReport ? 'Exporting...' : 'Export PDF' }}</span>
          </button>
        </div>
      </div>

      <!-- Center Loading Spinner Overlay -->
      <div v-if="loading" class="position-absolute top-0 start-0 w-100 h-100 bg-body bg-opacity-75 d-flex flex-column align-items-center justify-content-center z-3">
        <div class="spinner-border text-primary" role="status" style="width: 2.5rem; height: 2.5rem;">
          <span class="visually-hidden">Loading payments...</span>
        </div>
        <span class="text-xs fw-semibold text-primary mt-2">Loading fee payment records...</span>
      </div>

      <!-- Error Alert -->
      <div v-if="error" class="alert alert-danger rounded-0 mb-0 py-3 px-4 d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <i class="bi bi-exclamation-triangle-fill fs-5"></i>
          <span>{{ error }}</span>
        </div>
        <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadData">Retry</button>
      </div>

      <div class="table-responsive">
        <table class="table align-middle mb-0 custom-amms-table">
          <thead>
            <tr>
              <th class="ps-4" style="width: 70px;"># ID</th>
              <th>Member Name</th>
              <th>Fee Year</th>
              <th>Payment Mode</th>
              <th>Amount Paid</th>
              <th>Balance Due</th>
              <th>Payment Date</th>
              <th class="text-end pe-4" style="width: 140px;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <!-- Loading Skeleton -->
            <template v-if="loading && rawPaymentsList.length === 0">
              <tr v-for="i in 5" :key="i">
                <td class="ps-4"><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-8"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td><span class="placeholder col-6"></span></td>
                <td class="pe-4 text-end"><span class="placeholder col-10"></span></td>
              </tr>
            </template>

            <!-- Empty State -->
            <tr v-else-if="filteredPayments.length === 0">
              <td colspan="8" class="text-center py-5 text-muted">
                <i class="bi bi-receipt-cutoff fs-1 d-block mb-2 text-opacity-50"></i>
                <p class="mb-0 fw-medium">No fee payment records found</p>
                <small>Click "Record Fee Payment" above to enter a payment transaction.</small>
              </td>
            </tr>

            <!-- Payment Rows -->
            <tr v-for="p in paginatedPayments" :key="p.id">
              <td class="ps-4 font-monospace text-muted text-xs">#{{ p.id }}</td>
              <td class="fw-semibold text-primary">
                <div class="d-flex align-items-center gap-2.5">
                  <div class="pay-icon-badge rounded-circle d-flex align-items-center justify-content-center">
                    <i class="bi bi-person text-primary text-xs"></i>
                  </div>
                  <div>
                    <span>{{ p.member ? `${p.member.first_name} ${p.member.last_name}` : getMemberName(p.member_id) }}</span>
                    <small v-if="getMemberPhone(p.member_id)" class="d-block text-muted font-monospace text-xs">{{ getMemberPhone(p.member_id) }}</small>
                  </div>
                </div>
              </td>
              <td>
                <span class="badge bg-body-tertiary text-body border px-2.5 py-1 rounded-pill font-monospace text-xs">
                  Year {{ p.fee ? getFeeYear(p.fee) : getFeeYear(p.fee_id) }}
                </span>
              </td>
              <td class="text-xs fw-medium text-body">
                <span class="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-20 px-2.5 py-1 rounded-pill text-xs">
                  <i class="bi bi-credit-card me-1"></i>
                  {{ p.payment_mode?.name || getPaymentModeName(p.payment_mode_id) }}
                </span>
              </td>
              <td class="fw-bold text-success font-monospace text-sm">
                {{ formatCurrency(p.amount) }}
              </td>
              <td class="font-monospace text-xs">
                <span 
                  v-if="p.member?.fee_exemption === 'yes' || getMemberExemption(p.member_id) === 'yes'" 
                  class="badge bg-warning bg-opacity-15 text-warning border border-warning border-opacity-25 px-2 py-0.5 rounded-pill"
                >
                  Exempted
                </span>
                <span 
                  v-else-if="getPaymentBalance(p) > 0" 
                  class="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-20 px-2 py-0.5 rounded-pill fw-bold"
                >
                  <i class="bi bi-exclamation-circle me-1"></i>{{ formatCurrency(getPaymentBalance(p)) }}
                </span>
                <span 
                  v-else 
                  class="badge bg-success bg-opacity-10 text-success border border-success border-opacity-20 px-2 py-0.5 rounded-pill"
                >
                  <i class="bi bi-check2 me-1"></i>0.00 (Paid)
                </span>
              </td>
              <td class="font-monospace text-xs text-body">
                {{ formatDateDisplay(p.date) }}
              </td>
              <td class="pe-4 text-end">
                <div class="d-flex align-items-center justify-content-end gap-1">
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="openViewModal(p)"
                    title="View Receipt Details"
                  >
                    <i class="bi bi-eye-fill text-primary"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn" 
                    @click="downloadMemberStatement(p.member_id)"
                    title="Download Member Statement PDF"
                  >
                    <i class="bi bi-file-earmark-pdf text-danger"></i>
                  </button>
                  <button 
                    class="btn btn-sm btn-light border-0 rounded-circle action-btn hover-danger" 
                    @click="promptDelete(p)"
                    title="Delete / Void Transaction"
                  >
                    <i class="bi bi-trash-fill text-danger"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Reusable Pagination Control Footer -->
      <PaginationControl
        v-if="filteredPayments.length > 0"
        v-model:currentPage="currentPage"
        v-model:itemsPerPage="itemsPerPage"
        :totalPages="totalPages"
        :totalItems="filteredPayments.length"
      />

    </div>

    <!-- View Payment Receipt Details Modal -->
    <ViewDetailModal
      v-if="isViewModalOpen"
      id="viewPaymentModal"
      title="Fee Payment Receipt Details"
      icon="bi bi-receipt"
      @close="closeViewModal"
    >
      <div class="p-3 bg-body-tertiary rounded-3 border mb-3">
        <div class="row g-3">
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Member Name</span>
            <span class="fw-bold text-primary fs-6">
              {{ viewingPayment ? (viewingPayment.member ? `${viewingPayment.member.first_name} ${viewingPayment.member.last_name}` : getMemberName(viewingPayment.member_id)) : '—' }}
            </span>
          </div>
          <div class="col-md-6">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Amount Paid</span>
            <span class="fw-bold text-success font-monospace fs-5">{{ viewingPayment ? formatCurrency(viewingPayment.amount) : 'TZS 0' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Fee Schedule</span>
            <span class="fw-semibold font-monospace text-body text-xs">{{ viewingPayment ? (viewingPayment.fee?.name || `Year ${getFeeYear(viewingPayment.fee_id)}`) : '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Payment Mode</span>
            <span class="fw-semibold text-body text-xs">{{ viewingPayment ? (viewingPayment.payment_mode?.name || getPaymentModeName(viewingPayment.payment_mode_id)) : '—' }}</span>
          </div>
          <div class="col-md-4">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Payment Date</span>
            <span class="font-monospace text-xs text-body">{{ formatDateDisplay(viewingPayment?.date) }}</span>
          </div>
          <div class="col-md-6" v-if="viewingPayment">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Balance After This Receipt</span>
            <span class="text-xs fw-bold font-monospace" :class="getHistoricalRunningBalance(viewingPayment) > 0 ? 'text-danger' : 'text-success'">
              {{ getHistoricalRunningBalance(viewingPayment) > 0 ? `${formatCurrency(getHistoricalRunningBalance(viewingPayment))} Due` : '0.00 (Paid in Full)' }}
            </span>
          </div>
          <div class="col-md-6" v-if="viewingPayment?.created_at">
            <span class="text-xs text-muted text-uppercase fw-semibold d-block">Transaction Timestamp</span>
            <span class="text-xs text-secondary-amms font-monospace">{{ viewingPayment.created_at }}</span>
          </div>
        </div>
      </div>

      <div class="d-flex justify-content-end gap-2 pt-2 border-top">
        <button
          v-if="viewingPayment"
          type="button"
          class="btn btn-sm btn-outline-primary rounded-pill px-3.5 py-2 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-xs"
          @click="downloadMemberStatement(viewingPayment.member_id)"
        >
          <i class="bi bi-file-earmark-pdf-fill text-danger"></i>
          <span>Download Member Statement PDF</span>
        </button>
      </div>
    </ViewDetailModal>

    <!-- Custom Delete Confirmation Modal -->
    <div v-if="isDeleteModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div 
      v-if="isDeleteModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
      @click.self="cancelDelete"
    >
      <div class="modal-dialog modal-dialog-centered modal-sm">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden text-center p-4">
          
          <div class="d-inline-flex align-items-center justify-content-center bg-danger bg-opacity-10 text-danger rounded-circle p-3 mx-auto mb-3" style="width: 56px; height: 56px;">
            <i class="bi bi-trash3-fill fs-3"></i>
          </div>

          <h5 class="fw-bold text-primary text-sm mb-1">Confirm Deletion</h5>
          <p class="text-secondary-amms text-xs mb-2">Are you sure you want to permanently delete this fee payment transaction?</p>
          
          <p class="fw-bold text-danger text-xs mb-4 font-monospace bg-danger bg-opacity-10 py-1.5 px-3 rounded-3 d-inline-block mx-auto">
            Payment for {{ itemToDelete ? getMemberName(itemToDelete.member_id) : '' }} ({{ itemToDelete ? formatCurrency(itemToDelete.amount) : '' }})
          </p>

          <div class="d-flex justify-content-center gap-2">
            <button 
              type="button" 
              class="btn btn-sm btn-light border rounded-pill px-3 text-xs fw-semibold"
              :disabled="isDeleting"
              @click="cancelDelete"
            >
              Cancel
            </button>
            <button 
              type="button" 
              class="btn btn-sm btn-danger rounded-pill px-4 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              :disabled="isDeleting"
              @click="confirmDelete"
            >
              <span v-if="isDeleting" class="spinner-border spinner-border-sm" role="status"></span>
              <span>{{ isDeleting ? 'Deleting...' : 'Delete Transaction' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- Create Payment Vue Pure Modal -->
    <div v-if="isModalOpen" class="modal-backdrop fade show"></div>
    
    <div 
      v-if="isModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      @click.self="closeModal"
    >
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-receipt me-1.5 amms-accent"></i>
              <span>Record Fee Payment</span>
            </h5>
            <button 
              type="button" 
              class="btn-close position-absolute end-0 me-3" 
              @click="closeModal"
              aria-label="Close"
            ></button>
          </div>

          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Single Column Form Fields -->
              <div class="mb-3">
                <label for="payDate" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Payment Date *
                </label>
                <ClientOnly>
                  <VDatePicker v-model="date" mode="date" string-format="yyyy-MM-dd" :masks="{ input: 'DD-MM-YYYY' }">
                    <template #default="{ inputValue, inputEvents }">
                      <div class="input-group">
                        <span class="input-group-text bg-transparent border-end-0 text-muted">
                          <i class="bi bi-calendar-event text-primary"></i>
                        </span>
                        <input
                          :value="inputValue"
                          v-on="inputEvents"
                          class="form-control border-start-0 ps-1 py-2.5 text-sm bg-body font-monospace"
                          placeholder="DD-MM-YYYY"
                          readonly
                        />
                      </div>
                    </template>
                  </VDatePicker>
                </ClientOnly>
              </div>

              <div class="mb-3">
                <label for="memId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Select Member *
                </label>
                <select id="memId" v-model="memberId" class="form-select py-2.5 text-sm" required>
                  <option v-for="m in members" :key="m.id" :value="m.id">
                    {{ m.first_name }} {{ m.last_name }} ({{ m.phone || 'No phone' }})
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label for="feeId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Fee Schedule / Year *
                </label>
                <select id="feeId" v-model="feeId" class="form-select py-2.5 text-sm" required>
                  <option v-for="f in fees" :key="f.id" :value="f.id">
                    Year: {{ getFeeYear(f) }} ({{ formatCurrency(f.amount) }})
                  </option>
                </select>
              </div>

              <div class="mb-3">
                <label for="payMode" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">
                  Payment Mode *
                </label>
                <select id="payMode" v-model="paymentModeId" class="form-select py-2.5 text-sm" required>
                  <option v-for="pm in paymentModes" :key="pm.id" :value="pm.id">
                    {{ pm.name }}
                  </option>
                </select>
              </div>

              <!-- Prior Payments Breakdown Notice -->
              <div v-if="memberId && feeId && selectedFeeSchedule" class="mb-3">
                <div v-if="memberPriorPaymentsForFee > 0" class="p-2.5 bg-body-tertiary rounded-3 border text-xs">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <span class="text-muted">Total Annual Fee:</span>
                    <span class="fw-semibold text-body font-monospace">{{ formatCurrency(selectedFeeSchedule.amount) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <span class="text-muted">Already Paid in Past Receipts:</span>
                    <span class="fw-semibold text-success font-monospace">- {{ formatCurrency(memberPriorPaymentsForFee) }}</span>
                  </div>
                  <div class="d-flex align-items-center justify-content-between pt-1.5 border-top">
                    <span class="fw-bold text-primary">Remaining Balance Needed:</span>
                    <span class="fw-bold font-monospace fs-6" :class="remainingSuggestedAmount > 0 ? 'text-danger' : 'text-success'">
                      {{ formatCurrency(remainingSuggestedAmount) }}
                    </span>
                  </div>

                  <!-- Quick Fill Helper Buttons -->
                  <div class="d-flex align-items-center gap-1.5 mt-2 pt-1 border-top border-secondary border-opacity-10">
                    <button 
                      type="button" 
                      class="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-0.5 text-xs fw-semibold"
                      @click="amount = remainingSuggestedAmount"
                    >
                      Fill Balance ({{ formatCurrency(remainingSuggestedAmount) }})
                    </button>
                    <button 
                      type="button" 
                      class="btn btn-xs btn-light border rounded-pill px-2.5 py-0.5 text-xs text-muted"
                      @click="amount = selectedFeeSchedule?.amount || 0"
                    >
                      Full Fee
                    </button>
                  </div>
                </div>

                <div v-else-if="memberPriorPaymentsForFee === 0" class="text-xs text-muted font-monospace d-flex align-items-center justify-content-between px-1">
                  <span>Standard Annual Fee:</span>
                  <span class="fw-semibold text-body">{{ formatCurrency(selectedFeeSchedule.amount) }}</span>
                </div>
              </div>

              <!-- Amount Paid -->
              <div class="mb-3">
                <div class="d-flex align-items-center justify-content-between mb-1">
                  <label for="payAmt" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">
                    Amount Paid (TZS) *
                  </label>
                  <span 
                    class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold border"
                    :class="paymentStatusBadge.class"
                  >
                    {{ paymentStatusBadge.label }}
                  </span>
                </div>
                <input id="payAmt" v-model.number="amount" type="number" step="100" class="form-control py-2.5 text-sm font-monospace" placeholder="e.g. 50000" required />
              </div>

              <!-- Partial Payment Alert Notice -->
              <div v-if="paymentBalance > 0 && requiredAmount > 0" class="alert alert-warning py-2.5 px-3 rounded-3 text-xs mb-3 border-warning border-opacity-30 d-flex align-items-center justify-content-between">
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-exclamation-circle-fill text-warning fs-6"></i>
                  <div>
                    <span class="fw-bold d-block text-warning">Partial Payment Notice</span>
                    <span class="text-secondary-amms">Required: {{ formatCurrency(requiredAmount) }}</span>
                  </div>
                </div>
                <div class="text-end">
                  <span class="text-muted d-block text-xs">Remaining Balance</span>
                  <span class="fw-bold text-danger font-monospace text-xs">{{ formatCurrency(paymentBalance) }}</span>
                </div>
              </div>

            </div>

            <div class="modal-footer border-top px-4 py-3 bg-body-tertiary">
              <button 
                type="button" 
                class="btn btn-sm btn-outline-secondary rounded-pill px-3" 
                @click="closeModal"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm"
                :disabled="isSubmitting"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Recording...' : (editingPayment ? 'Update Payment' : 'Save Payment') }}</span>
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.filter-pill-select {
  height: 34px;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.filter-pill-select:hover {
  border-color: var(--amms-primary) !important;
}

.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }

/* Civic Registry Custom Table Styling */
.custom-amms-table {
  --bs-table-bg: transparent;
  --bs-table-hover-bg: rgba(27, 42, 74, 0.03);
}

.custom-amms-table thead {
  background-color: var(--amms-primary) !important;
}

.custom-amms-table thead th {
  color: #FFFFFF !important;
  border-bottom: 2px solid var(--amms-accent);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  padding-top: 0.85rem;
  padding-bottom: 0.85rem;
}

.pay-icon-badge {
  width: 28px;
  height: 28px;
  background-color: rgba(27, 42, 74, 0.08);
}

.action-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.15s ease;
}

.hover-danger:hover {
  background-color: rgba(220, 53, 69, 0.12) !important;
}
</style>
