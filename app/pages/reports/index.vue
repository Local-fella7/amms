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

const searchQuery = ref('')
const activeCategory = ref<'all' | 'finance' | 'roster' | 'demographics' | 'member'>('all')

// Configuration Modal State
const reportToConfigure = ref<ReportDef | null>(null)
const pendingActionType = ref<'preview' | 'download' | 'tab' | null>(null)
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
  } catch (_) {}
}

interface ReportDef {
  id: string
  category: 'finance' | 'roster' | 'demographics' | 'member'
  title: string
  subtitle: string
  description: string
  icon: string
  accentColor: string
  endpoint: string
  requiresMember?: boolean
  supportsFeeFilter?: boolean
  supportsDateFilter?: boolean
}

const reportsList: ReportDef[] = [
  { id: 'outstanding-fees', category: 'finance', title: 'Outstanding Fees Ledger', subtitle: 'Arrears & Exemption Audit', description: 'Detailed roster of members with pending or overdue fee balances and exemption statuses.', icon: 'bi-cash-coin', accentColor: '#76453B', endpoint: '/api/reports/outstanding', supportsFeeFilter: true },
  { id: 'fee-payments', category: 'finance', title: 'Fee Payments Transactions', subtitle: 'Revenue Ledger & Receipts', description: 'Consolidated ledger of all fee collections, payment methods, transaction receipts, and dates.', icon: 'bi-receipt-cutoff', accentColor: '#43766C', endpoint: '/api/reports/fee-payments', supportsFeeFilter: true, supportsDateFilter: true },
  { id: 'members-directory', category: 'roster', title: 'Official Member Directory', subtitle: 'Association Master Roll', description: 'Official master roster of all registered association members with contact details and branch locations.', icon: 'bi-person-lines-fill', accentColor: '#43766C', endpoint: '/api/reports/members' },
  { id: 'deceased-members', category: 'roster', title: 'Deceased Members Register', subtitle: 'Historical Memorial Archive', description: 'Historical archive and commemorative register of deceased association members.', icon: 'bi-bookmark-heart-fill', accentColor: '#B19470', endpoint: '/api/reports/deceased' },
  { id: 'age-groups', category: 'demographics', title: 'Age Group Breakdown', subtitle: 'Generational Distribution', description: 'Statistical age bracket distribution across Youth, Adult, and Senior membership segments.', icon: 'bi-pie-chart-fill', accentColor: '#43766C', endpoint: '/api/reports/age-groups' },
  { id: 'locations-distribution', category: 'demographics', title: 'Location & Branch Density', subtitle: 'Geographic Regional Spread', description: 'Geographic spread and member density across municipal regions, districts, wards, and cities.', icon: 'bi-geo-alt-fill', accentColor: '#B19470', endpoint: '/api/reports/locations' },
  { id: 'gender-distribution', category: 'demographics', title: 'Gender Distribution Analytics', subtitle: 'Representation Metrics', description: 'Gender representation analytics across active, pending, and inactive association members.', icon: 'bi-gender-ambiguous', accentColor: '#76453B', endpoint: '/api/reports/gender' },
  { id: 'marital-status', category: 'demographics', title: 'Marital Status Breakdown', subtitle: 'Family & Marital Analytics', description: 'Statistical distribution of membership across marital classifications (Single, Married, Divorced, Widowed).', icon: 'bi-heart-fill', accentColor: '#B19470', endpoint: '/api/reports/marital-status' },
  { id: 'member-profile', category: 'member', title: 'Member Profile Dossier', subtitle: 'Official Individual Dossier', description: 'Complete member dossier including photograph, emergency details, contacts, and fee ledger.', icon: 'bi-person-badge-fill', accentColor: '#43766C', endpoint: '/api/reports/profile', requiresMember: true },
  { id: 'member-history', category: 'member', title: 'Member Activity & Statement', subtitle: 'Financial Statement & Log', description: 'Comprehensive financial statement and chronological activity log for a specific member.', icon: 'bi-clock-history', accentColor: '#B19470', endpoint: '/api/reports/member-history', requiresMember: true, supportsDateFilter: true }
]

const categoryDefs = [
  { id: 'finance', label: 'Finance & Revenue', icon: 'bi-wallet2', accentColor: '#43766C', description: 'Fee ledgers, payment receipts, arrears & compliance reports.' },
  { id: 'roster', label: 'Member Rosters', icon: 'bi-people-fill', accentColor: '#B19470', description: 'Official member directories and archival registers.' },
  { id: 'demographics', label: 'Demographics & Trends', icon: 'bi-bar-chart-line-fill', accentColor: '#43766C', description: 'Age, gender, location, and marital distribution analytics.' },
  { id: 'member', label: 'Individual Dossiers', icon: 'bi-person-vcard-fill', accentColor: '#76453B', description: 'Per-member profile documents and financial statements.' }
]

const categoryCounts = computed(() => {
  const counts: Record<string, number> = {}
  reportsList.forEach(r => { counts[r.category] = (counts[r.category] || 0) + 1 })
  return counts
})

const filteredReports = computed(() => {
  let list = reportsList
  if (activeCategory.value !== 'all') list = list.filter(r => r.category === activeCategory.value)
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim()
    list = list.filter(r => r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q) || r.description.toLowerCase().includes(q))
  }
  return list
})

const selectCategory = (catId: string) => {
  activeCategory.value = activeCategory.value === catId ? 'all' : catId as any
}

// Action Dispatcher
const handleActionClick = (report: ReportDef, action: 'preview' | 'download' | 'tab') => {
  const needsConfig = report.requiresMember || report.supportsFeeFilter || report.supportsDateFilter
  if (needsConfig) {
    selectedMemberId.value = ''
    selectedFeeId.value = ''
    filterFromDate.value = ''
    filterToDate.value = ''
    reportToConfigure.value = report
    pendingActionType.value = action
  } else {
    executeAction(report, action)
  }
}

const cancelConfiguration = () => {
  reportToConfigure.value = null
  pendingActionType.value = null
}

const isConfigValid = computed(() => {
  if (!reportToConfigure.value) return false
  if (reportToConfigure.value.requiresMember && !selectedMemberId.value) return false
  return true
})

const confirmConfiguration = () => {
  if (!isConfigValid.value) return
  const report = reportToConfigure.value!
  const action = pendingActionType.value!
  
  // Close modal but keep parameter values for the execution
  reportToConfigure.value = null
  pendingActionType.value = null
  
  executeAction(report, action)
}

const executeAction = (report: ReportDef, action: 'preview' | 'download' | 'tab') => {
  if (action === 'preview') handlePreviewReport(report)
  else if (action === 'download') handleDownloadReport(report)
  else if (action === 'tab') handleOpenInNewTab(report)
}

const buildReportUrl = (report: ReportDef, isDownload = false): string => {
  let base = report.endpoint
  if (report.requiresMember) {
    if (!selectedMemberId.value) throw new Error('Target member is required.')
    base = `${report.endpoint}/${selectedMemberId.value}`
  }
  const params = new URLSearchParams()
  if (isDownload) params.set('download', '1')
  if (report.supportsFeeFilter && selectedFeeId.value) params.set('fee_id', String(selectedFeeId.value))
  if (report.supportsDateFilter) {
    if (filterFromDate.value) params.set('from', filterFromDate.value)
    if (filterToDate.value) params.set('to', filterToDate.value)
  }
  const qs = params.toString()
  return qs ? `${base}?${qs}` : base
}

const handleOpenInNewTab = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    await openPdfInNewTab(buildReportUrl(report, false))
    push.success(`Opened "${report.title}" in new tab`)
  } catch (err: any) {
    push.error(err?.message || 'Failed to open report')
  } finally { activeReportKey.value = null }
}

const handleDownloadReport = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    await downloadPdf(buildReportUrl(report, true), `${report.id}-${new Date().toISOString().substring(0, 10)}.pdf`)
    push.success(`"${report.title}" downloaded!`)
  } catch (err: any) {
    push.error(err?.message || 'Failed to download report')
  } finally { activeReportKey.value = null }
}

const handlePreviewReport = async (report: ReportDef) => {
  try {
    activeReportKey.value = report.id
    previewReportTitle.value = report.title
    isPreviewLoading.value = true
    isPreviewModalOpen.value = true
    previewPdfUrl.value = await getPdfBlobUrl(buildReportUrl(report, false))
  } catch (err: any) {
    push.error(err?.message || 'Failed to preview report')
    closePreviewModal()
  } finally {
    isPreviewLoading.value = false
    activeReportKey.value = null
  }
}

const closePreviewModal = () => {
  if (previewPdfUrl.value) { window.URL.revokeObjectURL(previewPdfUrl.value); previewPdfUrl.value = null }
  isPreviewModalOpen.value = false
}

const getActionLabel = (action: 'preview' | 'download' | 'tab' | null) => {
  if (action === 'preview') return 'Generate & Preview'
  if (action === 'download') return 'Generate & Download'
  if (action === 'tab') return 'Generate & Open'
  return 'Generate Report'
}

onMounted(loadDependencies)
</script>

<template>
  <div>
    <!-- Page Header -->
    <PageHeader
      title="Reports & Analytics Center"
      subtitle="Generate, preview, and export official PDF ledgers, demographic analytics, member registries, and executive statements"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search reports by name or keyword..."
      hideRefresh
      :showAddButton="false"
    />

    <!-- Category Hub: 2x2 grid of clickable category cards -->
    <div class="row g-3 mb-4">
      <div v-for="cat in categoryDefs" :key="cat.id" class="col-6 col-lg-3">
        <button
          type="button"
          class="rpt-cat-card w-100 text-start"
          :class="{ 'rpt-cat-card--active': activeCategory === cat.id }"
          :style="activeCategory === cat.id ? { borderColor: cat.accentColor, boxShadow: `0 0 0 3px ${cat.accentColor}22` } : {}"
          @click="selectCategory(cat.id)"
        >
          <div class="rpt-cat-card__icon" :style="{ background: cat.accentColor + '18', color: cat.accentColor }">
            <i :class="`bi ${cat.icon}`"></i>
          </div>
          <div class="rpt-cat-card__body">
            <div class="rpt-cat-card__label">{{ cat.label }}</div>
            <div class="rpt-cat-card__count" :style="{ color: cat.accentColor }">
              {{ categoryCounts[cat.id] || 0 }} reports
            </div>
            <div class="rpt-cat-card__desc">{{ cat.description }}</div>
          </div>
          <div v-if="activeCategory === cat.id" class="rpt-cat-card__check" :style="{ background: cat.accentColor }">
            <i class="bi bi-check2"></i>
          </div>
        </button>
      </div>
    </div>

    <!-- Report List -->
    <div class="card border-0 shadow-sm rounded-4 overflow-hidden mb-5">

      <!-- List header bar -->
      <div class="rpt-list-header">
        <span class="rpt-list-header__label">
          <span v-if="activeCategory === 'all'">All Reports</span>
          <span v-else>{{ categoryDefs.find(c => c.id === activeCategory)?.label }}</span>
        </span>
        <span class="rpt-list-header__count">{{ filteredReports.length }} {{ filteredReports.length === 1 ? 'report' : 'reports' }}</span>
        <button v-if="activeCategory !== 'all'" class="rpt-list-header__clear" @click="activeCategory = 'all'">
          <i class="bi bi-x"></i> Show all
        </button>
      </div>

      <!-- Empty state -->
      <div v-if="filteredReports.length === 0" class="rpt-empty">
        <i class="bi bi-search rpt-empty-icon"></i>
        <div class="rpt-empty-title">No reports found</div>
        <p class="rpt-empty-sub">Try a different keyword or select another category.</p>
        <button class="btn btn-sm btn-outline-primary rounded-pill px-4 mt-2" @click="searchQuery = ''; activeCategory = 'all'">Clear Filters</button>
      </div>

      <!-- Report Rows -->
      <div v-else class="rpt-list">
        <div
          v-for="report in filteredReports"
          :key="report.id"
          class="rpt-row"
          :style="{ borderLeftColor: report.accentColor }"
        >
          <!-- Left: icon + info -->
          <div class="rpt-row__left">
            <div class="rpt-row__iconbox" :style="{ background: report.accentColor + '15', color: report.accentColor }">
              <i :class="`bi ${report.icon}`"></i>
            </div>
            <div class="rpt-row__info">
              <div class="rpt-row__title">{{ report.title }}</div>
              <div class="rpt-row__sub">{{ report.subtitle }}</div>
              <div class="rpt-row__desc">{{ report.description }}</div>
            </div>
          </div>

          <!-- Middle: scope tags -->
          <div class="rpt-row__tags">
            <span v-if="report.requiresMember" class="rpt-tag"><i class="bi bi-person-check-fill"></i> Member</span>
            <span v-if="report.supportsFeeFilter" class="rpt-tag"><i class="bi bi-funnel-fill"></i> Fee Year</span>
            <span v-if="report.supportsDateFilter" class="rpt-tag"><i class="bi bi-calendar3"></i> Date Range</span>
            <span v-if="!report.requiresMember && !report.supportsFeeFilter && !report.supportsDateFilter" class="rpt-tag rpt-tag-ok"><i class="bi bi-check2-circle"></i> Full Scope</span>
          </div>

          <!-- Right: actions -->
          <div class="rpt-row__actions">
            <button
              class="rpt-icon-btn"
              :disabled="activeReportKey === report.id || isGenerating"
              @click="handleActionClick(report, 'preview')"
              title="Preview PDF"
            >
              <i class="bi bi-eye"></i>
            </button>
            <button
              class="rpt-icon-btn"
              :disabled="activeReportKey === report.id || isGenerating"
              @click="handleActionClick(report, 'download')"
              title="Download PDF"
            >
              <i class="bi bi-download"></i>
            </button>
            <button
              class="rpt-icon-btn rpt-icon-btn--primary"
              :disabled="activeReportKey === report.id || isGenerating"
              @click="handleActionClick(report, 'tab')"
              title="Open in new tab"
            >
              <span v-if="activeReportKey === report.id" class="spinner-border spinner-border-sm" role="status"></span>
              <i v-else class="bi bi-box-arrow-up-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Configure Contextual Modal Backdrop -->
    <div v-if="reportToConfigure" class="modal-backdrop fade show" style="z-index:1050;"></div>
    
    <!-- Configure Contextual Modal -->
    <div v-if="reportToConfigure" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index:1055;" @click.self="cancelConfiguration">
      <div class="modal-dialog modal-dialog-centered" style="max-width: 540px;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
          
          <div class="modal-header border-bottom px-4 py-3" style="background-color: var(--bs-body-bg);">
            <div class="d-flex align-items-center gap-3">
              <div class="rpt-row__iconbox" :style="{ background: reportToConfigure.accentColor + '15', color: reportToConfigure.accentColor }">
                <i :class="`bi ${reportToConfigure.icon}`"></i>
              </div>
              <div>
                <h5 class="modal-title fw-bold mb-0 text-dark" style="font-size: 1rem;">Configure Report</h5>
                <small class="text-muted" style="font-size: .75rem;">{{ reportToConfigure.title }}</small>
              </div>
            </div>
            <button type="button" class="btn-close" @click="cancelConfiguration" aria-label="Close"></button>
          </div>
          
          <div class="modal-body p-4 bg-body-tertiary">
            <p class="text-secondary-amms text-sm mb-4">
              This report requires specific parameters before it can be generated. Please provide the required information below.
            </p>
            
            <div class="row g-3">
              <!-- Member Filter -->
              <div v-if="reportToConfigure.requiresMember" class="col-12">
                <label class="form-label fw-bold text-xs text-secondary-amms mb-1">
                  Target Member <span class="text-danger">*</span>
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-person-fill"></i></span>
                  <select v-model="selectedMemberId" class="form-select border-start-0" :class="{ 'is-invalid': !selectedMemberId }">
                    <option value="">— Select a member —</option>
                    <option v-for="m in members" :key="m.id" :value="m.id">{{ m.first_name }} {{ m.last_name }}{{ m.phone ? ` · ${m.phone}` : '' }}</option>
                  </select>
                </div>
                <div v-if="!selectedMemberId" class="text-danger mt-1 text-2xs"><i class="bi bi-exclamation-circle"></i> A target member is required.</div>
              </div>
              
              <!-- Fee Year Filter -->
              <div v-if="reportToConfigure.supportsFeeFilter" class="col-12">
                <label class="form-label fw-bold text-xs text-secondary-amms mb-1">
                  Fee Year Filter <span class="text-muted fw-normal">(Optional)</span>
                </label>
                <div class="input-group">
                  <span class="input-group-text bg-white border-end-0 text-muted"><i class="bi bi-receipt"></i></span>
                  <select v-model="selectedFeeId" class="form-select border-start-0">
                    <option value="">— All Years —</option>
                    <option v-for="f in fees" :key="f.id" :value="f.id">{{ f.year || f.fee_year }} — {{ f.name }}</option>
                  </select>
                </div>
              </div>

              <!-- Date Range Filter -->
              <div v-if="reportToConfigure.supportsDateFilter" class="col-12">
                <label class="form-label fw-bold text-xs text-secondary-amms mb-1">
                  Date Range Filter <span class="text-muted fw-normal">(Optional)</span>
                </label>
                <div class="row g-2">
                  <div class="col-6">
                    <div class="input-group">
                      <span class="input-group-text bg-white border-end-0 text-muted" style="font-size: .75rem;">From</span>
                      <input v-model="filterFromDate" type="date" class="form-control border-start-0" style="font-size: .8rem;" />
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="input-group">
                      <span class="input-group-text bg-white border-end-0 text-muted" style="font-size: .75rem;">To</span>
                      <input v-model="filterToDate" type="date" class="form-control border-start-0" style="font-size: .8rem;" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div class="modal-footer border-top px-4 py-3 bg-white">
            <button type="button" class="btn btn-light rounded-pill px-4 fw-semibold border" @click="cancelConfiguration">Cancel</button>
            <button 
              type="button" 
              class="btn btn-primary rounded-pill px-4 fw-semibold d-flex align-items-center gap-2" 
              :style="{ backgroundColor: reportToConfigure.accentColor, borderColor: reportToConfigure.accentColor }"
              :disabled="!isConfigValid"
              @click="confirmConfiguration"
            >
              <i class="bi" :class="{ 'bi-eye': pendingActionType === 'preview', 'bi-download': pendingActionType === 'download', 'bi-box-arrow-up-right': pendingActionType === 'tab' }"></i>
              {{ getActionLabel(pendingActionType) }}
            </button>
          </div>
          
        </div>
      </div>
    </div>

    <!-- Preview Modal Backdrop -->
    <div v-if="isPreviewModalOpen" class="modal-backdrop fade show" style="z-index:1060;"></div>

    <!-- Preview Modal -->
    <div v-if="isPreviewModalOpen" class="modal fade show d-block" tabindex="-1" role="dialog" style="z-index:1065;" @click.self="closePreviewModal">
      <div class="modal-dialog modal-dialog-centered modal-xl" style="max-width:90vw;height:90vh;">
        <div class="modal-content border-0 shadow-lg rounded-4 overflow-hidden d-flex flex-column h-100">
          <div class="modal-header border-bottom px-4 py-3 bg-body-tertiary">
            <div class="d-flex align-items-center gap-2 flex-grow-1">
              <i class="bi bi-file-earmark-pdf-fill text-danger fs-5"></i>
              <div>
                <h5 class="modal-title fw-bold mb-0" style="font-size:.9rem;color:#43766C;">{{ previewReportTitle }}</h5>
                <small class="text-muted" style="font-size:.68rem;">Generated via AMMS Dompdf Engine</small>
              </div>
            </div>
            <div class="d-flex align-items-center gap-2">
              <a v-if="previewPdfUrl" :href="previewPdfUrl" download="report.pdf" class="btn btn-sm btn-light border rounded-pill px-3 d-flex align-items-center gap-1" style="font-size:.75rem;font-weight:600;">
                <i class="bi bi-download" style="color:#43766C;"></i> Download
              </a>
              <button type="button" class="btn-close" @click="closePreviewModal" aria-label="Close"></button>
            </div>
          </div>
          <div class="modal-body p-0 flex-grow-1 bg-dark d-flex align-items-center justify-content-center">
            <div v-if="isPreviewLoading" class="text-center text-white p-5">
              <div class="spinner-border text-light mb-3" style="width:2.5rem;height:2.5rem;" role="status"></div>
              <p class="mb-1 fw-semibold" style="font-size:.9rem;">Rendering PDF Report...</p>
              <small class="text-white-50" style="font-size:.75rem;">Compiling records and formatting layout</small>
            </div>
            <iframe v-else-if="previewPdfUrl" :src="previewPdfUrl" class="w-100 h-100 border-0" title="PDF Report Preview"></iframe>
          </div>
          <div class="modal-footer border-top px-4 py-2 bg-body-tertiary d-flex justify-content-between">
            <small class="text-muted" style="font-size:.7rem;">Official PDF · AMMS Dompdf Engine</small>
            <button type="button" class="btn btn-sm btn-secondary rounded-pill px-4 fw-semibold" @click="closePreviewModal">Close</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* -- Category Hub Cards ------------------- */
.rpt-cat-card {
  background: var(--bs-body-bg, #fff);
  border: 1.5px solid rgba(0,0,0,.08);
  border-radius: .9rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: .6rem;
  cursor: pointer;
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
  position: relative;
  overflow: hidden;
}
.rpt-cat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(0,0,0,.09);
  border-color: rgba(0,0,0,.15);
}
.rpt-cat-card--active {
  transform: translateY(-3px);
  box-shadow: 0 10px 28px rgba(0,0,0,.1);
}
.rpt-cat-card__icon {
  width: 44px;
  height: 44px;
  border-radius: .65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}
.rpt-cat-card__label {
  font-size: .85rem;
  font-weight: 700;
  color: #222;
  line-height: 1.25;
}
.rpt-cat-card__count {
  font-size: .75rem;
  font-weight: 700;
}
.rpt-cat-card__desc {
  font-size: .72rem;
  color: #999;
  line-height: 1.45;
}
.rpt-cat-card__check {
  position: absolute;
  top: .65rem;
  right: .65rem;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: .75rem;
}

/* -- Report List -------------------------- */
.rpt-list-header {
  display: flex;
  align-items: center;
  gap: .6rem;
  padding: .75rem 1.25rem;
  border-bottom: 1px solid rgba(0,0,0,.06);
  background: var(--bs-tertiary-bg, #f8f9fa);
}
.rpt-list-header__label { font-size: .8rem; font-weight: 700; color: #444; flex: 1; }
.rpt-list-header__count { font-size: .72rem; font-weight: 600; background: rgba(0,0,0,.06); color: #777; padding: .15rem .55rem; border-radius: 999px; }
.rpt-list-header__clear { border: none; background: none; font-size: .72rem; font-weight: 600; color: #43766C; cursor: pointer; display: flex; align-items: center; gap: .2rem; padding: .15rem .4rem; border-radius: .35rem; transition: background .15s; }
.rpt-list-header__clear:hover { background: rgba(67,118,108,.08); }

.rpt-list { display: flex; flex-direction: column; }

.rpt-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(0,0,0,.05);
  border-left: 4px solid transparent;
  transition: background .15s ease;
}
.rpt-row:last-child { border-bottom: none; }
.rpt-row:hover { background: rgba(0,0,0,.018); }

.rpt-row__left {
  display: flex;
  align-items: flex-start;
  gap: .85rem;
  flex: 1;
  min-width: 0;
}
.rpt-row__iconbox {
  width: 38px;
  height: 38px;
  min-width: 38px;
  border-radius: .55rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}
.rpt-row__info { flex: 1; min-width: 0; }
.rpt-row__title { font-size: .86rem; font-weight: 700; color: #222; line-height: 1.3; }
.rpt-row__sub { font-size: .63rem; font-weight: 600; text-transform: uppercase; letter-spacing: .05em; color: #bbb; margin-bottom: .2rem; }
.rpt-row__desc { font-size: .75rem; color: #888; line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 420px; }

.rpt-row__tags {
  display: flex;
  flex-wrap: wrap;
  gap: .3rem;
  justify-content: flex-end;
  min-width: 120px;
}
.rpt-tag { display: inline-flex; align-items: center; gap: .25rem; font-size: .65rem; font-weight: 600; background: rgba(0,0,0,.05); color: #777; border-radius: 999px; padding: .14rem .45rem; white-space: nowrap; }
.rpt-tag-ok { background: rgba(47,133,90,.09); color: #2F855A; }

.rpt-row__actions {
  display: flex;
  align-items: center;
  gap: .35rem;
  flex-shrink: 0;
}
.rpt-icon-btn {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0,0,0,.12);
  background: var(--bs-body-bg);
  border-radius: .5rem;
  cursor: pointer;
  font-size: .85rem;
  color: #555;
  transition: all .15s ease;
  flex-shrink: 0;
}
.rpt-icon-btn:hover:not(:disabled) { background: rgba(67,118,108,.07); border-color: #43766C; color: #43766C; }
.rpt-icon-btn--primary { background: #43766C; border-color: #43766C; color: #fff; }
.rpt-icon-btn--primary:hover:not(:disabled) { background: #325e56; border-color: #325e56; }
.rpt-icon-btn:disabled { opacity: .45; cursor: not-allowed; }

/* -- Empty State -------------------------- */
.rpt-empty { padding: 3.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .6rem; }
.rpt-empty-icon { font-size: 2.5rem; color: #ccc; }
.rpt-empty-title { font-size: .95rem; font-weight: 700; color: #888; }
.rpt-empty-sub { font-size: .78rem; color: #aaa; margin: 0; }

/* -- Responsive --------------------------- */
@media (max-width: 767px) {
  .rpt-row { flex-wrap: wrap; }
  .rpt-row__tags { min-width: unset; justify-content: flex-start; }
  .rpt-row__desc { max-width: 100%; white-space: normal; }
}
</style>
