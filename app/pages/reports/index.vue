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

const selectedMemberId = ref<number | string>('')
const selectedFeeId = ref<number | string>('')
const filterFromDate = ref('')
const filterToDate = ref('')
const searchQuery = ref('')

const openSections = ref<Set<string>>(new Set(['finance', 'roster', 'demographics', 'member']))

const toggleSection = (catId: string) => {
  const s = new Set(openSections.value)
  if (s.has(catId)) { s.delete(catId) } else { s.add(catId) }
  openSections.value = s
}

const isPreviewModalOpen = ref(false)
const previewReportTitle = ref('')
const previewPdfUrl = ref<string | null>(null)
const isPreviewLoading = ref(false)
const activeReportKey = ref<string | null>(null)

const hasFilters = computed(() => !!selectedFeeId.value || !!filterFromDate.value || !!filterToDate.value)

const resetFilters = () => {
  selectedFeeId.value = ''
  filterFromDate.value = ''
  filterToDate.value = ''
}

const loadDependencies = async () => {
  try {
    await Promise.all([
      fetchMembers((api) => api('/api/members')).catch(() => []),
      fetchFees((api) => api('/api/fees')).catch(() => [])
    ])
    if (members.value && members.value.length > 0) {
      selectedMemberId.value = members.value[0].id
    }
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

const filteredReports = computed(() => {
  if (!searchQuery.value.trim()) return reportsList
  const q = searchQuery.value.toLowerCase().trim()
  return reportsList.filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.subtitle.toLowerCase().includes(q) ||
    r.description.toLowerCase().includes(q)
  )
})

const categoryGroups = computed(() => [
  { id: 'finance', label: 'Finance & Revenue', icon: 'bi-wallet2', accentColor: '#43766C', reports: filteredReports.value.filter(r => r.category === 'finance') },
  { id: 'roster', label: 'Member Rosters', icon: 'bi-people-fill', accentColor: '#B19470', reports: filteredReports.value.filter(r => r.category === 'roster') },
  { id: 'demographics', label: 'Demographics & Trends', icon: 'bi-bar-chart-line-fill', accentColor: '#43766C', reports: filteredReports.value.filter(r => r.category === 'demographics') },
  { id: 'member', label: 'Individual Dossiers', icon: 'bi-person-vcard-fill', accentColor: '#76453B', reports: filteredReports.value.filter(r => r.category === 'member') }
])

const buildReportUrl = (report: ReportDef, isDownload = false): string => {
  let base = report.endpoint
  if (report.requiresMember) {
    if (!selectedMemberId.value) throw new Error('Please choose a target member from the parameters bar first.')
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

onMounted(loadDependencies)
</script>

<template>
  <div>
    <PageHeader
      title="Reports & Analytics Center"
      subtitle="Generate, preview, and export official PDF ledgers, demographic analytics, member registries, and executive statements"
      v-model:searchQuery="searchQuery"
      searchPlaceholder="Search reports by name or keyword..."
      hideRefresh
      :showAddButton="false"
    />

    <!-- Parameters Bar -->
    <div class="card border-0 shadow-sm rounded-4 mb-4 overflow-hidden rpt-params-card">
      <div class="rpt-params-inner">
        <div class="rpt-params-field">
          <i class="bi bi-person-fill rpt-params-ico"></i>
          <div class="rpt-params-field-content">
            <label class="rpt-params-label">Target Member</label>
            <select v-model="selectedMemberId" class="rpt-params-select">
              <option value="">— Choose member —</option>
              <option v-for="m in members" :key="m.id" :value="m.id">{{ m.first_name }} {{ m.last_name }}{{ m.phone ? ` · ${m.phone}` : '' }}</option>
            </select>
          </div>
        </div>
        <div class="rpt-params-divider"></div>
        <div class="rpt-params-field">
          <i class="bi bi-receipt rpt-params-ico"></i>
          <div class="rpt-params-field-content">
            <label class="rpt-params-label">Fee Year</label>
            <select v-model="selectedFeeId" class="rpt-params-select">
              <option value="">All years</option>
              <option v-for="f in fees" :key="f.id" :value="f.id">{{ f.year || f.fee_year }} — {{ f.name }}</option>
            </select>
          </div>
        </div>
        <div class="rpt-params-divider"></div>
        <div class="rpt-params-field">
          <i class="bi bi-calendar3 rpt-params-ico"></i>
          <div class="rpt-params-field-content">
            <label class="rpt-params-label">Date Range</label>
            <div class="d-flex align-items-center gap-1">
              <input v-model="filterFromDate" type="date" class="rpt-params-date" />
              <span class="text-muted" style="font-size:.8rem;">—</span>
              <input v-model="filterToDate" type="date" class="rpt-params-date" />
            </div>
          </div>
        </div>
        <button v-if="hasFilters" class="rpt-params-reset" @click="resetFilters" title="Clear all filters">
          <i class="bi bi-x-circle-fill"></i>
          <span>Reset</span>
        </button>
      </div>
    </div>

    <!-- Accordion Sections -->
    <div class="rpt-accordions">
      <template v-for="grp in categoryGroups" :key="grp.id">
        <div v-if="grp.reports.length > 0" class="rpt-accordion mb-3">

          <!-- Header -->
          <button class="rpt-accordion-hd" :style="{ background: grp.accentColor }" @click="toggleSection(grp.id)">
            <div class="d-flex align-items-center gap-2">
              <div class="rpt-accordion-hd-icon"><i :class="`bi ${grp.icon}`"></i></div>
              <span class="rpt-accordion-hd-label">{{ grp.label }}</span>
              <span class="rpt-accordion-hd-badge">{{ grp.reports.length }} {{ grp.reports.length === 1 ? 'report' : 'reports' }}</span>
            </div>
            <i class="bi rpt-accordion-chevron" :class="openSections.has(grp.id) ? 'bi-chevron-down' : 'bi-chevron-right'"></i>
          </button>

          <!-- Body -->
          <div v-show="openSections.has(grp.id)" class="rpt-accordion-body">
            <div class="row g-3 p-3">
              <div v-for="report in grp.reports" :key="report.id" class="col-12 col-lg-6">
                <div class="rpt-card h-100" :style="{ borderLeftColor: report.accentColor }">

                  <!-- Icon + Titles -->
                  <div class="rpt-card-head">
                    <div class="rpt-card-iconbox" :style="{ background: report.accentColor + '18', color: report.accentColor }">
                      <i :class="`bi ${report.icon}`"></i>
                    </div>
                    <div class="rpt-card-titles">
                      <div class="rpt-card-title">{{ report.title }}</div>
                      <div class="rpt-card-sub">{{ report.subtitle }}</div>
                    </div>
                  </div>

                  <!-- Description -->
                  <p class="rpt-card-desc">{{ report.description }}</p>

                  <!-- Tags -->
                  <div class="rpt-card-tags">
                    <span v-if="report.requiresMember" class="rpt-tag"><i class="bi bi-person-check-fill"></i> Member Specific</span>
                    <span v-if="report.supportsFeeFilter" class="rpt-tag"><i class="bi bi-funnel-fill"></i> Fee Year Filter</span>
                    <span v-if="report.supportsDateFilter" class="rpt-tag"><i class="bi bi-calendar3"></i> Date Range</span>
                    <span v-if="!report.requiresMember && !report.supportsFeeFilter && !report.supportsDateFilter" class="rpt-tag rpt-tag-ok"><i class="bi bi-check2-circle"></i> Full Scope</span>
                  </div>

                  <!-- Actions -->
                  <div class="rpt-card-actions">
                    <button class="rpt-btn rpt-btn-ghost" :disabled="activeReportKey === report.id || isGenerating" @click="handlePreviewReport(report)" title="Preview in fullscreen viewer">
                      <i class="bi bi-eye"></i><span>Preview</span>
                    </button>
                    <button class="rpt-btn rpt-btn-ghost" :disabled="activeReportKey === report.id || isGenerating" @click="handleDownloadReport(report)" title="Download PDF">
                      <i class="bi bi-download"></i><span>Download</span>
                    </button>
                    <button class="rpt-btn rpt-btn-primary ms-auto" :disabled="activeReportKey === report.id || isGenerating" @click="handleOpenInNewTab(report)" title="Open in new tab">
                      <span v-if="activeReportKey === report.id" class="spinner-border spinner-border-sm" role="status"></span>
                      <i v-else class="bi bi-box-arrow-up-right"></i>
                      <span>{{ activeReportKey === report.id ? 'Loading...' : 'Open Tab' }}</span>
                    </button>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </template>

      <!-- Empty State -->
      <div v-if="filteredReports.length === 0" class="rpt-empty card border-0 shadow-sm rounded-4">
        <i class="bi bi-search rpt-empty-icon"></i>
        <div class="rpt-empty-title">No reports match "{{ searchQuery }}"</div>
        <p class="rpt-empty-sub">Try a different keyword — report name, subtitle, or description.</p>
        <button class="btn btn-sm btn-outline-primary rounded-pill px-4" @click="searchQuery = ''">Clear Search</button>
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
.rpt-params-card { border: 1px solid rgba(0,0,0,.06) !important; }
.rpt-params-inner { display: flex; align-items: stretch; flex-wrap: wrap; }
.rpt-params-field { display: flex; align-items: center; gap: .65rem; padding: .8rem 1.25rem; flex: 1; min-width: 180px; }
.rpt-params-ico { font-size: .95rem; color: #43766C; flex-shrink: 0; }
.rpt-params-field-content { display: flex; flex-direction: column; gap: .08rem; flex: 1; min-width: 0; }
.rpt-params-label { font-size: .6rem; font-weight: 700; text-transform: uppercase; letter-spacing: .065em; color: #bbb; margin: 0; }
.rpt-params-select { border: none; background: transparent; font-size: .8rem; font-weight: 500; color: inherit; outline: none; padding: 0; width: 100%; cursor: pointer; }
.rpt-params-date { border: none; background: transparent; font-size: .78rem; color: inherit; outline: none; padding: 0; min-width: 0; flex: 1; cursor: pointer; font-family: ui-monospace, monospace; }
.rpt-params-divider { width: 1px; background: rgba(0,0,0,.08); margin: .5rem 0; flex-shrink: 0; }
.rpt-params-reset { display: flex; align-items: center; gap: .35rem; padding: .5rem 1.1rem; border: none; background: rgba(220,53,69,.06); color: #dc3545; font-size: .75rem; font-weight: 700; cursor: pointer; border-left: 1px solid rgba(220,53,69,.15); transition: background .15s; flex-shrink: 0; }
.rpt-params-reset:hover { background: rgba(220,53,69,.12); }

.rpt-accordion { border: 1px solid rgba(0,0,0,.08); border-radius: .9rem; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
.rpt-accordion-hd { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: .9rem 1.3rem; border: none; cursor: pointer; color: #fff; text-align: left; transition: filter .15s ease; }
.rpt-accordion-hd:hover { filter: brightness(1.07); }
.rpt-accordion-hd-icon { width: 32px; height: 32px; border-radius: .5rem; background: rgba(255,255,255,.18); display: flex; align-items: center; justify-content: center; font-size: .95rem; flex-shrink: 0; }
.rpt-accordion-hd-label { font-size: .92rem; font-weight: 700; }
.rpt-accordion-hd-badge { font-size: .67rem; font-weight: 600; background: rgba(255,255,255,.2); padding: .12rem .5rem; border-radius: 999px; white-space: nowrap; }
.rpt-accordion-chevron { font-size: .9rem; flex-shrink: 0; transition: transform .2s ease; }
.rpt-accordion-body { background: var(--bs-body-bg, #fff); border-top: 1px solid rgba(0,0,0,.06); }

.rpt-card { background: var(--bs-body-bg, #fff); border: 1px solid rgba(0,0,0,.07); border-left: 4px solid #43766C; border-radius: .75rem; padding: 1rem 1rem .9rem; display: flex; flex-direction: column; gap: .58rem; transition: transform .18s ease, box-shadow .18s ease; }
.rpt-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,.09); }
.rpt-card-head { display: flex; align-items: flex-start; gap: .7rem; }
.rpt-card-iconbox { width: 38px; height: 38px; min-width: 38px; border-radius: .55rem; display: flex; align-items: center; justify-content: center; font-size: 1.05rem; flex-shrink: 0; }
.rpt-card-titles { flex: 1; min-width: 0; }
.rpt-card-title { font-size: .87rem; font-weight: 700; color: #222; line-height: 1.3; }
.rpt-card-sub { font-size: .63rem; font-weight: 600; text-transform: uppercase; letter-spacing: .055em; color: #bbb; margin-top: .1rem; }
.rpt-card-desc { font-size: .77rem; color: #666; line-height: 1.55; margin: 0; flex: 1; }
.rpt-card-tags { display: flex; flex-wrap: wrap; gap: .3rem; }
.rpt-tag { display: inline-flex; align-items: center; gap: .28rem; font-size: .66rem; font-weight: 600; background: rgba(0,0,0,.05); color: #777; border-radius: 999px; padding: .16rem .48rem; }
.rpt-tag-ok { background: rgba(47,133,90,.09); color: #2F855A; }

.rpt-card-actions { display: flex; align-items: center; gap: .4rem; padding-top: .65rem; border-top: 1px solid rgba(0,0,0,.06); margin-top: auto; }
.rpt-btn { display: inline-flex; align-items: center; gap: .3rem; font-size: .73rem; font-weight: 600; padding: .32rem .7rem; border-radius: 999px; border: 1px solid transparent; cursor: pointer; transition: all .15s ease; white-space: nowrap; }
.rpt-btn:disabled { opacity: .5; cursor: not-allowed; }
.rpt-btn-ghost { background: var(--bs-body-bg); border-color: rgba(0,0,0,.13); color: #555; }
.rpt-btn-ghost:hover:not(:disabled) { background: rgba(67,118,108,.07); border-color: #43766C; color: #43766C; }
.rpt-btn-primary { background: #43766C; border-color: #43766C; color: #fff; }
.rpt-btn-primary:hover:not(:disabled) { background: #325e56; border-color: #325e56; }

.rpt-empty { padding: 3.5rem 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: .6rem; border: 1px solid rgba(0,0,0,.06) !important; }
.rpt-empty-icon { font-size: 2.5rem; color: #ccc; }
.rpt-empty-title { font-size: .95rem; font-weight: 700; color: #888; }
.rpt-empty-sub { font-size: .78rem; color: #aaa; margin: 0; }
</style>
