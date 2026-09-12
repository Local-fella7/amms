<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { z } from 'zod'
import type { FeePayment } from '~/types'

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'saved'): void
}>()

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
}
interface PaymentModeOption {
  id: number
  name: string
}

const { data: paymentsResponse, execute: fetchPayments, fetchWithAuth } = useApi<any>()
const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: fees, execute: fetchFees } = useApi<FeeOption[]>()
const { data: paymentModes, execute: fetchPaymentModes } = useApi<PaymentModeOption[]>()

const isSubmitting = ref(false)
const modalError = ref('')

const memberId = ref<number | string>('')
const memberSearchQuery = ref('')
const isMemberDropdownOpen = ref(false)
const feeId = ref<number | string>('')
const paymentModeId = ref<number | string>('')
const amount = ref<number | ''>('')
const date = ref(new Date().toISOString().substring(0, 10))

const schema = z.object({
  member_id: z.union([z.number(), z.string().min(1, 'Member selection is required')]),
  fee_id: z.union([z.number(), z.string().min(1, 'Fee schedule selection is required')]),
  payment_mode_id: z.union([z.number(), z.string().min(1, 'Payment mode is required')]),
  amount: z.number().min(1, 'Amount must be greater than 0'),
  date: z.string().min(4, 'Payment date is required')
})

const rawPaymentsList = computed(() => {
  if (!paymentsResponse.value) return []
  const res = paymentsResponse.value
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
})

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

const selectedFeeSchedule = computed(() => {
  if (!feeId.value || !fees.value) return null
  return fees.value.find(f => Number(f.id) === Number(feeId.value)) || null
})

const requiredAmount = computed(() => Number(selectedFeeSchedule.value?.amount || 0))

const memberPriorPaymentsForFee = computed(() => {
  if (!memberId.value || !feeId.value) return 0
  return rawPaymentsList.value
    .filter((p: FeePayment) => Number(p.member_id) === Number(memberId.value) && Number(p.fee_id) === Number(feeId.value))
    .reduce((sum: number, p: FeePayment) => sum + (Number(p.amount) || 0), 0)
})

const remainingSuggestedAmount = computed(() => {
  if (!selectedFeeSchedule.value) return 0
  return Math.max(0, Number(selectedFeeSchedule.value.amount || 0) - memberPriorPaymentsForFee.value)
})

const paymentBalance = computed(() => {
  const paid = Number(amount.value) || 0
  return Math.max(0, requiredAmount.value - (memberPriorPaymentsForFee.value + paid))
})

const paymentStatusBadge = computed(() => {
  const paid = Number(amount.value) || 0
  const totalCovered = memberPriorPaymentsForFee.value + paid
  const fullReq = requiredAmount.value
  if (fullReq <= 0) return { label: 'Custom Amount', class: 'bg-info bg-opacity-10 text-info border-info' }
  if (totalCovered >= fullReq) return { label: 'Paid in Full', class: 'bg-success bg-opacity-10 text-success border-success' }
  if (totalCovered > 0 && totalCovered < fullReq) return { label: 'Partial Payment', class: 'bg-warning bg-opacity-15 text-warning border-warning' }
  return { label: 'Unpaid', class: 'bg-danger bg-opacity-10 text-danger border-danger' }
})

// Auto-fill suggested amount when member or fee changes
watch([feeId, memberId], () => {
  if (feeId.value && selectedFeeSchedule.value) {
    amount.value = remainingSuggestedAmount.value
  }
})

const getFeeYear = (f: FeeOption) => f.year || f.fee_year || '—'
const formatCurrency = (val?: number) => `TZS ${Number(val || 0).toLocaleString('en-US')}`
const formatDateToYMD = (val: string | Date | null | undefined): string => {
  if (!val) return new Date().toISOString().substring(0, 10)
  if (val instanceof Date) {
    return `${val.getFullYear()}-${String(val.getMonth()+1).padStart(2,'0')}-${String(val.getDate()).padStart(2,'0')}`
  }
  return String(val).substring(0, 10)
}

const loadOptions = async () => {
  await Promise.all([
    fetchPayments((api) => api('/api/fee-payments')).catch(() => null),
    fetchMembers((api) => api('/api/members')).catch(() => null),
    fetchFees((api) => api('/api/fees')).catch(() => null),
    fetchPaymentModes((api) => api('/api/payment-modes')).catch(() => null),
  ])
  // Set defaults
  if (members.value?.length) {
    memberId.value = members.value[0].id
    memberSearchQuery.value = `${members.value[0].first_name} ${members.value[0].last_name} (${members.value[0].phone || 'No phone'})`
  }
  if (fees.value?.length) {
    feeId.value = fees.value[0].id
    amount.value = fees.value[0].amount || ''
  }
  if (paymentModes.value?.length) {
    paymentModeId.value = paymentModes.value[0].id
  }
  date.value = new Date().toISOString().substring(0, 10)
  modalError.value = ''
}

onMounted(loadOptions)

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
    await fetchWithAuth('/api/fee-payments', { method: 'POST', body: payload })
    push.success('Fee payment transaction recorded successfully!')
    emit('saved')
    emit('close')
  } catch (err: unknown) {
    modalError.value = extractErrorMessage(err, 'Failed to save fee payment')
    push.error(modalError.value)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div>
    <div class="modal-backdrop fade show" @click="emit('close')"></div>
    <div class="modal fade show d-block" tabindex="-1" role="dialog" @click.self="emit('close')">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary position-relative justify-content-center">
            <h5 class="modal-title fw-bold text-primary text-sm mb-0 text-center">
              <i class="bi bi-receipt me-1.5 amms-accent"></i>
              <span>Record Fee Payment</span>
            </h5>
            <button type="button" class="btn-close position-absolute end-0 me-3" @click="emit('close')" aria-label="Close"></button>
          </div>

          <form @submit.prevent="handleSave">
            <div class="modal-body p-4">
              <div v-if="modalError" class="alert alert-danger py-2 px-3 mb-3 rounded-3 small">
                <i class="bi bi-exclamation-triangle-fill me-1"></i> {{ modalError }}
              </div>

              <!-- Payment Date -->
              <div class="mb-3">
                <label for="spPayDate" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Payment Date *</label>
                <ClientOnly>
                  <VDatePicker v-model="date" mode="date" string-format="yyyy-MM-dd" :masks="{ input: 'DD-MM-YYYY' }">
                    <template #default="{ inputValue, inputEvents }">
                      <div class="input-group">
                        <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="bi bi-calendar-event text-primary"></i></span>
                        <input :value="inputValue" v-on="inputEvents" class="form-control border-start-0 ps-1 py-2.5 text-sm bg-body font-monospace" placeholder="DD-MM-YYYY" readonly />
                      </div>
                    </template>
                  </VDatePicker>
                </ClientOnly>
              </div>

              <!-- Member Search -->
              <div class="mb-3">
                <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Select Member *</label>
                <div class="position-relative">
                  <div class="input-group">
                    <span class="input-group-text bg-transparent border-end-0 text-muted"><i class="bi bi-person-fill text-primary"></i></span>
                    <input
                      v-model="memberSearchQuery"
                      type="text"
                      class="form-control border-start-0 ps-1 py-2.5 text-sm"
                      placeholder="Search member by name or phone..."
                      @focus="isMemberDropdownOpen = true"
                      @input="memberId = ''; isMemberDropdownOpen = true"
                      autocomplete="off"
                    />
                    <button v-if="memberId" type="button" class="btn btn-outline-secondary border-start-0 px-2" @click="clearMemberSelection">
                      <i class="bi bi-x-lg text-muted"></i>
                    </button>
                  </div>
                  <div v-if="isMemberDropdownOpen && filteredMemberOptions.length > 0"
                    class="position-absolute w-100 bg-body border rounded-3 shadow-lg mt-1 overflow-auto"
                    style="z-index: 9999; max-height: 220px;">
                    <div
                      v-for="m in filteredMemberOptions.slice(0, 30)"
                      :key="m.id"
                      class="px-3 py-2 text-sm cursor-pointer border-bottom hover-highlight"
                      @mousedown.prevent="selectMember(m)"
                    >
                      <span class="fw-semibold">{{ m.first_name }} {{ m.last_name }}</span>
                      <span class="text-muted ms-2 font-monospace text-xs">{{ m.phone }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Fee Schedule -->
              <div class="mb-3">
                <label for="spFeeId" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Fee Schedule / Year *</label>
                <select id="spFeeId" v-model="feeId" class="form-select py-2.5 text-sm" required>
                  <option v-for="f in fees" :key="f.id" :value="f.id">
                    Year: {{ getFeeYear(f) }} ({{ formatCurrency(f.amount) }})
                  </option>
                </select>
              </div>

              <!-- Payment Mode -->
              <div class="mb-3">
                <label for="spPayMode" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase">Payment Mode *</label>
                <select id="spPayMode" v-model="paymentModeId" class="form-select py-2.5 text-sm" required>
                  <option v-for="pm in paymentModes" :key="pm.id" :value="pm.id">{{ pm.name }}</option>
                </select>
              </div>

              <!-- Prior Payments Breakdown -->
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
                  <div class="d-flex align-items-center gap-1.5 mt-2 pt-1 border-top border-secondary border-opacity-10">
                    <button type="button" class="btn btn-xs btn-outline-danger rounded-pill px-2.5 py-0.5 text-xs fw-semibold" @click="amount = remainingSuggestedAmount">
                      Fill Balance ({{ formatCurrency(remainingSuggestedAmount) }})
                    </button>
                    <button type="button" class="btn btn-xs btn-light border rounded-pill px-2.5 py-0.5 text-xs text-muted" @click="amount = selectedFeeSchedule?.amount || 0">
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
                  <label for="spPayAmt" class="form-label text-xs fw-semibold text-secondary-amms text-uppercase mb-0">Amount Paid (TZS) *</label>
                  <span class="badge px-2.5 py-1 rounded-pill text-xs fw-semibold border" :class="paymentStatusBadge.class">
                    {{ paymentStatusBadge.label }}
                  </span>
                </div>
                <input id="spPayAmt" v-model.number="amount" type="number" step="100" class="form-control py-2.5 text-sm font-monospace" placeholder="e.g. 50000" required />
              </div>

              <!-- Partial Payment Warning -->
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
              <button type="button" class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="emit('close')">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2 shadow-sm" :disabled="isSubmitting">
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm" role="status"></span>
                <span>{{ isSubmitting ? 'Recording...' : 'Save Payment' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
.hover-highlight:hover { background-color: rgba(67, 118, 108, 0.08); cursor: pointer; }
</style>
