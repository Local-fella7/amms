<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useReportPdf } from '~/composables/useReportPdf'

interface MemberOption {
  id: number
  first_name: string
  last_name: string
  phone?: string
}

interface FeeOption {
  id: number
  year?: number
  fee_year?: number
  name?: string
  amount?: number
}

const { data: members, execute: fetchMembers } = useApi<MemberOption[]>()
const { data: fees, execute: fetchFees } = useApi<FeeOption[]>()
const { downloadPdf, getPdfBlobUrl, openPdfInNewTab, isGenerating } = useReportPdf()

// Selected filter states for parameterized reports
const selectedMemberId = ref<number | string>('')
const selectedFeeId = ref<number | string>('')
const filterFromDate = ref('')
const filterToDate = ref('')

// Preview Modal State
const isPreviewModalOpen = ref(false)
const previewReportTitle = ref('')
const previewPdfUrl = ref<string | null>(null)
const isPreviewLoading = ref(false)
const activeReportKey = ref<string | null>(null)

const loadDependencies = async () => {
  try {
    await Promise.all([
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchFees((api) => api('/api/fees')).catch(() => [])
    ])
    if (members.value && members.value.length > 0) {
      selectedMemberId.value = members.value[0].id
    }
  } catch (err) {
    // Handled
  }
}

// Reports Configuration List
interface ReportDef {
  id: string
  category: 'finance' | 'roster' | 'demographics' | 'member'
  title: string
  description: string
  icon: string
  badgeText: string
  badgeClass: string
  endpoint: string
  requiresMember?: boolean
  supportsFeeFilter?: boolean
  supportsDateFilter?: boolean
}

const reportsList: ReportDef[] = [
  // Financial & Fee Audits
  {
    id: 'outstanding-fees',
    category: 'finance',
    title: 'Outstanding Fees Report',
    description: 'Detailed list of members with pending or overdue fee balances and fee exemption status.',
    icon: 'bi-cash-coin',
    badgeText: 'Finance & Compliance',
    badgeClass: 'bg-danger bg-opacity-10 text-danger border-danger',
    endpoint: '/api/reports/outstanding',
    supportsFeeFilter: true
  },
  {
    id: 'fee-payments',
    category: 'finance',
    title: 'Fee Payments Transactions',
    description: 'Consolidated ledger of all fee collections, payment methods, and transaction receipts.',
    icon: 'bi-receipt-cutoff',
    badgeText: 'Revenue Audit',
    badgeClass: 'bg-success bg-opacity-10 text-success border-success',
    endpoint: '/api/reports/fee-payments',
    supportsFeeFilter: true,
    supportsDateFilter: true
  },

  // Member Rosters
  {
    id: 'members-directory',
    category: 'roster',
    title: 'Member Directory & Roster',
    description: 'Official roster of all registered association members with contact details and branch locations.',
    icon: 'bi-person-lines-fill',
    badgeText: 'Official Registry',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border-primary',
    endpoint: '/api/reports/members'
  },
  {
    id: 'deceased-members',
    category: 'roster',
    title: 'Deceased Members Register',
    description: 'Historical archive and commemorative register of deceased association members.',
    icon: 'bi-bookmark-heart-fill',
    badgeText: 'Memorial Records',
    badgeClass: 'bg-secondary bg-opacity-10 text-secondary border-secondary',
    endpoint: '/api/reports/deceased'
  },

  // Demographics & Analytics
  {
    id: 'age-groups',
    category: 'demographics',
    title: 'Age Group Breakdown',
    description: 'Statistical distribution of membership grouped across Youth, Adult, and Senior age brackets.',
    icon: 'bi-pie-chart-fill',
    badgeText: 'Demographics',
    badgeClass: 'bg-info bg-opacity-10 text-info border-info',
    endpoint: '/api/reports/age-groups'
  },
  {
    id: 'locations-distribution',
    category: 'demographics',
    title: 'Location & Branch Distribution',
    description: 'Geographic spread and member density across municipal regions, districts, and cities.',
    icon: 'bi-geo-alt-fill',
    badgeText: 'Geographic',
    badgeClass: 'bg-warning bg-opacity-15 text-warning border-warning',
    endpoint: '/api/reports/locations'
  },
  {
    id: 'gender-distribution',
    category: 'demographics',
    title: 'Gender Distribution',
    description: 'Gender representation analytics across all active and inactive association members.',
    icon: 'bi-gender-ambiguous',
    badgeText: 'Demographics',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border-primary',
    endpoint: '/api/reports/gender'
  },

  // Specialized Individual Member Profiles
  {
    id: 'member-profile',
    category: 'member',
    title: 'Member Profile Dossier',
    description: 'Complete member dossier including photograph, emergency details, contacts, and fee ledger.',
    icon: 'bi-person-badge-fill',
    badgeText: 'Individual Dossier',
    badgeClass: 'bg-primary bg-opacity-10 text-primary border-primary',
    endpoint: '/api/reports/profile',
    requiresMember: true
  },
  {
    id: 'member-history',
    category: 'member',
    title: 'Member Activity & Statement',
    description: 'Comprehensive financial statement and chronological activity log for a specific member.',
    icon: 'bi-clock-history',
    badgeText: 'Member Statement',
    badgeClass: 'bg-success bg-opacity-10 text-success border-success',
    endpoint: '/api/reports/member-history',
    requiresMember: true,
    supportsDateFilter: true
  }
]

const buildReportUrl = (report: ReportDef, isDownload = false): string => {
  let base = report.endpoint

  if (report.requiresMember) {
    if (!selectedMemberId.value) {
      throw new Error('Please select a member first.')
    }
    base = `${report.endpoint}/${selectedMemberId.value}`
  }

  const params = new URLSearchParams()
  if (isDownload) params.set('download', '1')

  if (report.supportsFeeFilter && selectedFeeId.value) {
    params.set('fee_id', String(selectedFeeId.value))
  }

  if (report.supportsDateFilter) {
    if (filterFromDate.value) params.set('from', filterFromDate.value)
    if (filterToDate.value) params.set('to', filterToDate.value)
  }

  const queryString = params.toString()
  return queryString ? `${base}?${queryString}` : base
}

const handleOpenInNewTab = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    const url = buildReportUrl(report, false)
    await openPdfInNewTab(url)
    push.success(`Opened ${report.title} in new tab`)
  } catch (err: any) {
    push.error(err?.message || 'Failed to open report in new tab')
  } finally {
    activeReportKey.value = null
  }
}

const handleDownloadReport = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    const url = buildReportUrl(report, true)
    const filename = `${report.id}-${new Date().toISOString().substring(0, 10)}.pdf`
    await downloadPdf(url, filename)
    push.success(`${report.title} downloaded successfully!`)
  } catch (err: any) {
    push.error(err?.message || 'Failed to download report')
  } finally {
    activeReportKey.value = null
  }
}

const handlePreviewReport = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    previewReportTitle.value = report.title
    isPreviewLoading.value = true
    isPreviewModalOpen.value = true
    
    const url = buildReportUrl(report, false)
    const blobUrl = await getPdfBlobUrl(url)
    previewPdfUrl.value = blobUrl
  } catch (err: any) {
    push.error(err?.message || 'Failed to generate report preview')
    closePreviewModal()
  } finally {
    isPreviewLoading.value = false
    activeReportKey.value = null
  }
}

const closePreviewModal = () => {
  if (previewPdfUrl.value) {
    window.URL.revokeObjectURL(previewPdfUrl.value)
    previewPdfUrl.value = null
  }
  isPreviewModalOpen.value = false
}

onMounted(() => {
  loadDependencies()
})
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Reports & PDF Center"
      subtitle="Generate, preview, and export official association dossiers, financial ledgers, and demographic reports"
      hideSearch
      hideRefresh
      :showAddButton="false"
    />

    <!-- Global Parameters & Filters Bar -->
    <div class="card amms-surface border-0 shadow-sm rounded-4 mb-4 p-3 p-md-4">
      <div class="d-flex align-items-center gap-2 mb-3">
        <i class="bi bi-sliders text-primary fs-5"></i>
        <h6 class="fw-bold text-primary mb-0 text-uppercase text-xs tracking-wider">
          Report Parameters & Scope Filters
        </h6>
      </div>

      <div class="row g-3 align-items-end">
        <!-- Target Member Selector -->
        <div class="col-md-4">
          <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
            Target Member (For Profile & Statement)
          </label>
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-transparent text-muted"><i class="bi bi-person"></i></span>
            <select v-model="selectedMemberId" class="form-select text-xs py-2">
              <option value="">-- Choose Member --</option>
              <option v-for="m in members" :key="m.id" :value="m.id">
                {{ m.first_name }} {{ m.last_name }} ({{ m.phone || 'No phone' }})
              </option>
            </select>
          </div>
        </div>

        <!-- Fee Schedule Selector -->
        <div class="col-md-3">
          <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
            Fee Year Filter (Optional)
          </label>
          <div class="input-group input-group-sm">
            <span class="input-group-text bg-transparent text-muted"><i class="bi bi-receipt"></i></span>
            <select v-model="selectedFeeId" class="form-select text-xs py-2">
              <option value="">All Fee Years</option>
              <option v-for="f in fees" :key="f.id" :value="f.id">
                Year {{ f.year || f.fee_year }} - {{ f.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Date Range Filter -->
        <div class="col-md-5">
          <div class="row g-2">
            <div class="col-6">
              <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                Date From
              </label>
              <input v-model="filterFromDate" type="date" class="form-control form-control-sm text-xs font-monospace py-2" />
            </div>
            <div class="col-6">
              <label class="form-label text-xs fw-semibold text-secondary-amms text-uppercase tracking-wider">
                Date To
              </label>
              <input v-model="filterToDate" type="date" class="form-control form-control-sm text-xs font-monospace py-2" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Reports Grid Layout -->
    <div class="row g-4 mb-4">
      <div v-for="report in reportsList" :key="report.id" class="col-md-6 col-xl-4">
        <div class="card amms-surface border-0 shadow-sm rounded-4 h-100 p-4 d-flex flex-column justify-content-between report-card transition-all">
          
          <div>
            <!-- Header with Badge & Icon -->
            <div class="d-flex align-items-start justify-content-between gap-2 mb-3">
              <div class="report-icon-box rounded-3 d-flex align-items-center justify-content-center text-primary">
                <i :class="`bi ${report.icon} fs-4`"></i>
              </div>
              <span class="badge border px-2.5 py-1 rounded-pill text-xs fw-semibold" :class="report.badgeClass">
                {{ report.badgeText }}
              </span>
            </div>

            <!-- Title & Description -->
            <h5 class="fw-bold text-primary mb-1.5 fs-6">{{ report.title }}</h5>
            <p class="text-secondary-amms text-xs mb-4 leading-relaxed">
              {{ report.description }}
            </p>
          </div>

          <!-- Action Buttons -->
          <div class="pt-3 border-top d-flex align-items-center justify-content-between gap-2">
            <button
              type="button"
              class="btn btn-sm btn-light border rounded-pill px-3 text-xs fw-semibold d-flex align-items-center gap-1.5"
              :disabled="activeReportKey === report.id || isGenerating"
              @click="handlePreviewReport(report)"
            >
              <i class="bi bi-eye text-primary"></i>
              <span>Preview</span>
            </button>

            <button
              type="button"
              class="btn btn-sm btn-primary rounded-pill px-3.5 text-xs fw-semibold d-flex align-items-center gap-1.5 shadow-sm"
              :disabled="activeReportKey === report.id || isGenerating"
              @click="handleOpenInNewTab(report)"
            >
              <span v-if="activeReportKey === report.id" class="spinner-border spinner-border-sm" role="status"></span>
              <i v-else class="bi bi-box-arrow-up-right"></i>
              <span>{{ activeReportKey === report.id ? 'Opening...' : 'Open in New Tab' }}</span>
            </button>
          </div>

        </div>
      </div>
    </div>

    <!-- PDF Fullscreen Preview Modal -->
    <div v-if="isPreviewModalOpen" class="modal-backdrop fade show" style="z-index: 1060;"></div>
    
    <div 
      v-if="isPreviewModalOpen" 
      class="modal fade show d-block" 
      tabindex="-1" 
      role="dialog"
      style="z-index: 1065;"
      @click.self="closePreviewModal"
    >
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width: 90vw; height: 90vh;">
        <div class="modal-content amms-surface border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column h-100">
          
          <!-- Modal Header -->
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary d-flex align-items-center justify-content-between">
            <div class="d-flex align-items-center gap-2">
              <i class="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
              <h5 class="modal-title fw-bold text-primary text-sm mb-0">
                {{ previewReportTitle }} — PDF Document Preview
              </h5>
            </div>
            <button 
              type="button" 
              class="btn-close" 
              @click="closePreviewModal"
              aria-label="Close"
            ></button>
          </div>

          <!-- Modal Body (Iframe) -->
          <div class="modal-body p-0 flex-grow-1 position-relative bg-dark d-flex align-items-center justify-content-center">
            
            <div v-if="isPreviewLoading" class="text-center text-white p-5">
              <div class="spinner-border text-light mb-3" style="width: 3rem; height: 3rem;" role="status"></div>
              <p class="mb-0 fw-semibold text-sm">Rendering PDF Report...</p>
            </div>

            <iframe 
              v-else-if="previewPdfUrl" 
              :src="previewPdfUrl" 
              class="w-100 h-100 border-0"
              title="PDF Report Preview"
            ></iframe>

          </div>

          <!-- Modal Footer -->
          <div class="modal-footer px-4 py-2.5 border-top bg-body-tertiary d-flex justify-content-between">
            <small class="text-muted text-xs">Official PDF generated by AMMS Dompdf Engine</small>
            <button 
              type="button" 
              class="btn btn-sm btn-secondary rounded-pill px-4 text-xs fw-semibold" 
              @click="closePreviewModal"
            >
              Close Preview
            </button>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
.report-card {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid var(--bs-border-color);
}
.report-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 25px -5px rgba(67, 118, 108, 0.12) !important;
}

.report-icon-box {
  width: 48px;
  height: 48px;
  background-color: rgba(67, 118, 108, 0.08);
}
</style>
