<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'
import type { ChartData } from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Line, Bar, Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

const authStore = useAuthStore()

if (!authStore.isAuthenticated) {
  await navigateTo('/login')
}

// ===== Data Fetching =====
const { data: membersResponse, loading: membersLoading, execute: fetchMembers, fetchWithAuth } = useApi<any>()
const { data: paymentsResponse, execute: fetchPayments } = useApi<any>()
const { data: notificationsResponse, execute: fetchNotifications } = useApi<any>()
const { data: locations, execute: fetchLocations } = useApi<any[]>()
const { data: ageGroups, execute: fetchAgeGroups } = useApi<any[]>()
const { data: fees, execute: fetchFees } = useApi<any[]>()

const loading = ref(true)
const error = ref<string | null>(null)

const loadDashboard = async () => {
  loading.value = true
  error.value = null
  try {
    await Promise.all([
      fetchMembers((api) => api('/api/members')).catch(() => null),
      fetchPayments((api) => api('/api/fee-payments')).catch(() => null),
      fetchNotifications((api) => api('/api/notifications')).catch(() => null),
      fetchLocations((api) => api('/api/locations')).catch(() => null),
      fetchAgeGroups((api) => api('/api/age-groups')).catch(() => null),
      fetchFees((api) => api('/api/fees')).catch(() => null)
    ])
  } catch (e: any) {
    error.value = e?.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}

onMounted(loadDashboard)

// ===== Helpers to normalize response shapes =====
const toArray = (res: any): any[] => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

const rawMembers = computed(() => toArray(membersResponse.value))
const rawPayments = computed(() => toArray(paymentsResponse.value))
const rawNotifications = computed(() => toArray(notificationsResponse.value))
const locationList = computed(() => toArray(locations.value))
const ageGroupList = computed(() => toArray(ageGroups.value))
const feeList = computed(() => toArray(fees.value))

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('en-TZ', { style: 'currency', currency: 'TZS', maximumFractionDigits: 0 }).format(val || 0)
}

const formatCompactCurrency = (val: number) => {
  const n = val || 0
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `TZS ${(n / 1_000).toFixed(1)}K`
  return `TZS ${n}`
}

const getLocationName = (locId: number | string) => {
  const found = locationList.value.find(l => Number(l.id) === Number(locId))
  return found ? found.name : `Branch #${locId}`
}

const getAgeGroupName = (gId: number | string) => {
  const found = ageGroupList.value.find(g => Number(g.id) === Number(gId))
  return found ? found.name : `Group #${gId}`
}

const getFeeYear = (f: any) => {
  if (typeof f === 'object' && f !== null) return f.year ?? f.fee_year ?? f.name ?? '—'
  const found = feeList.value.find(item => Number(item.id) === Number(f))
  return found ? (found.year ?? found.fee_year ?? found.name ?? `#${f}`) : `#${f}`
}

// ===== KPI Metrics =====
const totalMembers = computed(() => rawMembers.value.length)
const activeMembers = computed(() => rawMembers.value.filter(m => m.member_status === 'active').length)
const inactiveMembers = computed(() => totalMembers.value - activeMembers.value)
const exemptedMembers = computed(() => rawMembers.value.filter(m => m.fee_exemption === 'yes').length)

const revenueYTD = computed(() => {
  const year = new Date().getFullYear()
  return rawPayments.value
    .filter(p => {
      const d = p.date || p.created_at
      return d && String(d).startsWith(String(year))
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
})

const totalRevenue = computed(() => {
  return rawPayments.value.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
})

const paidMembersThisYear = computed(() => {
  const year = new Date().getFullYear()
  const paidIds = new Set<number>()
  rawPayments.value.forEach(p => {
    const d = p.date || p.created_at
    if (d && String(d).startsWith(String(year))) {
      paidIds.add(Number(p.member_id))
    }
  })
  return paidIds
})

// Overdue: active members who have not paid for the current fee year
const overdueMembers = computed(() => {
  if (totalMembers.value === 0) return []
  return rawMembers.value
    .filter(m => m.member_status === 'active' && !paidMembersThisYear.value.has(Number(m.id)))
    .slice(0, 6)
})

const overdueCount = computed(() => {
  if (activeMembers.value === 0) return 0
  return rawMembers.value.filter(m => m.member_status === 'active' && !paidMembersThisYear.value.has(Number(m.id))).length
})

const complianceRate = computed(() => {
  if (activeMembers.value === 0) return 0
  return Math.round((paidMembersThisYear.value.size / activeMembers.value) * 100)
})

const broadcastCount = computed(() => rawNotifications.value.length)

const activeRate = computed(() => {
  if (totalMembers.value === 0) return 0
  return Math.round((activeMembers.value / totalMembers.value) * 100)
})

// ===== Charts =====
// Revenue by month (last 6 months)
const revenueChartData = computed<ChartData<'line'>>(() => {
  const months: string[] = []
  const totals: number[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(d.toLocaleString('en', { month: 'short' }))
    let sum = 0
    rawPayments.value.forEach(p => {
      const pd = (p.date || p.created_at || '')
      if (pd.startsWith(key)) sum += Number(p.amount) || 0
    })
    totals.push(sum)
  }
  return {
    labels: months,
    datasets: [{
      label: 'Revenue Collected',
      data: totals,
      borderColor: '#1B2A4A',
      backgroundColor: 'rgba(27, 42, 74, 0.12)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#B8923D',
      pointBorderColor: '#B8923D',
      borderWidth: 3
    }]
  }
})

// Membership registration growth (last 6 months)
const growthChartData = computed<ChartData<'bar'>>(() => {
  const months: string[] = []
  const counts: number[] = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    months.push(d.toLocaleString('en', { month: 'short' }))
    let c = 0
    rawMembers.value.forEach(m => {
      const rd = (m.registration_date || m.created_at || '')
      if (rd.startsWith(key)) c++
    })
    counts.push(c)
  }
  return {
    labels: months,
    datasets: [{
      label: 'New Members',
      data: counts,
      backgroundColor: ['#1B2A4A', '#2E4372', '#B8923D', '#2F855A', '#3172B0', '#C97A2B'],
      borderRadius: 6
    }]
  }
})

// Age group distribution (doughnut)
const ageChartData = computed<ChartData<'doughnut'>>(() => {
  const counts: Record<string, number> = {}
  rawMembers.value.forEach(m => {
    const name = getAgeGroupName(m.age_group_id)
    counts[name] = (counts[name] || 0) + 1
  })
  const palette = ['#1B2A4A', '#B8923D', '#2F855A', '#3172B0', '#C97A2B', '#B33A3A', '#2E4372']
  return {
    labels: Object.keys(counts),
    datasets: [{
      data: Object.values(counts),
      backgroundColor: palette,
      borderWidth: 2,
      borderColor: '#FFFFFF'
    }]
  }
})

// Members by location (horizontal bar)
const locationChartData = computed<ChartData<'bar'>>(() => {
  const counts: Record<string, number> = {}
  locationList.value.forEach(l => { counts[l.name] = 0 })
  rawMembers.value.forEach(m => {
    const name = getLocationName(m.location_id)
    if (counts[name] !== undefined) counts[name]++
    else counts[name] = 1
  })
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 6)
  return {
    labels: entries.map(e => e[0]),
    datasets: [{
      label: 'Members',
      data: entries.map(e => e[1]),
      backgroundColor: '#2E4372',
      borderRadius: 6
    }]
  }
})

const lineChartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true }
  }
}

const growthChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: { grid: { display: false } },
    y: { beginAtZero: true }
  }
}

const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 14, font: { size: 11 } } }
  },
  cutout: '62%'
}

const locationChartOptions: ChartOptions<'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: {
    x: { beginAtZero: true, grid: { display: false } },
    y: { grid: { display: false } }
  }
}

// ===== Recent registrations =====
const recentMembers = computed(() => {
  return [...rawMembers.value]
    .sort((a, b) => {
      const da = new Date(a.registration_date || a.created_at || 0).getTime()
      const db = new Date(b.registration_date || b.created_at || 0).getTime()
      return db - da
    })
    .slice(0, 5)
})

// ===== Recent broadcasts =====
const recentBroadcasts = computed(() => {
  return [...rawNotifications.value]
    .sort((a, b) => {
      const da = new Date(a.created_at || a.datetime || 0).getTime()
      const db = new Date(b.created_at || b.datetime || 0).getTime()
      return db - da
    })
    .slice(0, 4)
})

const formatDate = (val?: string) => {
  if (!val) return '—'
  const d = new Date(val)
  if (isNaN(d.getTime())) return val
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const sendReminder = async (m: any) => {
  try {
    await fetchWithAuth('/api/notifications', {
      method: 'POST',
      body: {
        name: `Fee Reminder - ${m.first_name} ${m.last_name}`,
        content: `Dear ${m.first_name}, your annual membership fee for ${new Date().getFullYear()} is still outstanding. Kindly settle it soon.`
      }
    })
    push.success(`Reminder queued for ${m.first_name} ${m.last_name}`)
  } catch (e: any) {
    push.error(e?.data?.message || 'Failed to send reminder')
  }
}
</script>

<template>
  <div class="amms-dashboard">
    <!-- Top Greeting Banner -->
    <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
      <div>
        <h2 class="fw-bold text-primary mb-1">Executive Overview</h2>
        <p class="text-secondary-amms mb-0">
          Welcome back, {{ authStore.user?.first_name || 'System Admin' }}! Here is what's happening today.
        </p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-medium" @click="loadDashboard" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1" :class="{ 'spin': loading }"></i> Refresh
        </button>
        <NuxtLink to="/members" class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold shadow-sm">
          <i class="bi bi-plus-lg me-1"></i> Register Member
        </NuxtLink>
      </div>
    </div>

    <!-- Loading placeholder -->
    <div v-if="loading" class="row g-3 mb-4">
      <div v-for="i in 4" :key="i" class="col-sm-6 col-xl-3">
        <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
          <span class="placeholder col-8"></span>
          <span class="placeholder col-5 mt-2"></span>
          <span class="placeholder col-6 mt-2"></span>
        </div>
      </div>
    </div>

    <!-- Error alert -->
    <div v-else-if="error" class="alert alert-danger mb-4 d-flex align-items-center justify-content-between rounded-4 border-0 shadow-sm">
      <div><i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}</div>
      <button class="btn btn-sm btn-outline-danger rounded-pill" @click="loadDashboard">Retry</button>
    </div>

    <template v-else>
      <!-- ================= HERO KPI ROW (4 cards) ================= -->
      <div class="row g-3 mb-3">
        <!-- Total Members (absorbs Active count as secondary stat) -->
        <div class="col-sm-6 col-xl-3">
          <div class="card kpi-card kpi-accent-primary amms-surface border-0 shadow-sm rounded-4 h-100">
            <div class="p-4">
              <div class="d-flex align-items-start justify-content-between mb-2">
                <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Total Members</span>
                <div class="kpi-icon bg-primary bg-opacity-10 text-primary">
                  <i class="bi bi-people-fill"></i>
                </div>
              </div>
              <h2 class="fw-bold text-primary mb-2 kpi-number">{{ totalMembers }}</h2>
              <div class="d-flex align-items-center gap-2">
                <span class="kpi-pill kpi-pill-success">
                  <i class="bi bi-person-check-fill"></i> {{ activeMembers }} active
                </span>
                <span class="kpi-pill kpi-pill-muted">{{ activeRate }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Revenue YTD (absorbs lifetime total as secondary stat) -->
        <div class="col-sm-6 col-xl-3">
          <div class="card kpi-card kpi-accent-warning amms-surface border-0 shadow-sm rounded-4 h-100">
            <div class="p-4">
              <div class="d-flex align-items-start justify-content-between mb-2">
                <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Revenue YTD</span>
                <div class="kpi-icon bg-warning bg-opacity-10 text-warning">
                  <i class="bi bi-wallet2"></i>
                </div>
              </div>
              <h2 class="fw-bold text-warning-emphasis mb-2 kpi-number kpi-number-currency">{{ formatCompactCurrency(revenueYTD) }}</h2>
              <div class="d-flex align-items-center gap-2">
                <span class="kpi-pill kpi-pill-muted">
                  <i class="bi bi-clock-history"></i> lifetime {{ formatCompactCurrency(totalRevenue) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fee Compliance -->
        <div class="col-sm-6 col-xl-3">
          <div class="card kpi-card kpi-accent-info amms-surface border-0 shadow-sm rounded-4 h-100">
            <div class="p-4">
              <div class="d-flex align-items-start justify-content-between mb-2">
                <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Fee Compliance</span>
                <div class="kpi-icon bg-info bg-opacity-10 text-info">
                  <i class="bi bi-check2-circle"></i>
                </div>
              </div>
              <h2 class="fw-bold text-info-emphasis mb-2 kpi-number">{{ complianceRate }}%</h2>
              <div class="progress rounded-pill mb-2" style="height: 6px;">
                <div class="progress-bar bg-info rounded-pill" :style="{ width: complianceRate + '%' }"></div>
              </div>
              <span class="kpi-pill kpi-pill-muted">{{ paidMembersThisYear.size }} of {{ activeMembers }} paid</span>
            </div>
          </div>
        </div>

        <!-- Overdue Members (actionable) -->
        <div class="col-sm-6 col-xl-3">
          <div class="card kpi-card kpi-accent-danger amms-surface border-0 shadow-sm rounded-4 h-100">
            <div class="p-4">
              <div class="d-flex align-items-start justify-content-between mb-2">
                <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Overdue Members</span>
                <div class="kpi-icon bg-danger bg-opacity-10 text-danger">
                  <i class="bi bi-exclamation-triangle-fill"></i>
                </div>
              </div>
              <h2 class="fw-bold text-danger mb-2 kpi-number">{{ overdueCount }}</h2>
              <span class="kpi-pill" :class="overdueCount > 0 ? 'kpi-pill-danger' : 'kpi-pill-success'">
                <i class="bi" :class="overdueCount > 0 ? 'bi-bell-fill' : 'bi-check2'"></i>
                {{ overdueCount > 0 ? 'Needs reminders' : 'All settled' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= QUICK ACTIONS (icon-forward buttons, directly under KPIs) ================= -->
      <div class="quick-actions-panel mb-4">
        <h6 class="fw-bold mb-3 text-secondary-amms text-uppercase text-xs tracking-wider">
          <i class="bi bi-lightning-charge-fill amms-accent me-1"></i>Quick Actions
        </h6>
        <div class="quick-actions-grid">
          <NuxtLink to="/members" class="icon-action-btn">
            <span class="icon-action-circle bg-primary bg-opacity-10 text-primary">
              <i class="bi bi-person-plus-fill"></i>
            </span>
            <span class="icon-action-label">Register<br />Member</span>
          </NuxtLink>
          <NuxtLink to="/fee-payments" class="icon-action-btn">
            <span class="icon-action-circle bg-success bg-opacity-10 text-success">
              <i class="bi bi-credit-card-2-front-fill"></i>
            </span>
            <span class="icon-action-label">Record<br />Payment</span>
          </NuxtLink>
          <NuxtLink to="/notifications" class="icon-action-btn">
            <span class="icon-action-circle bg-warning bg-opacity-10 text-warning">
              <i class="bi bi-chat-dots-fill"></i>
            </span>
            <span class="icon-action-label">Send<br />Broadcast</span>
          </NuxtLink>
          <NuxtLink to="/fee-payments" class="icon-action-btn">
            <span class="icon-action-circle bg-danger bg-opacity-10 text-danger">
              <i class="bi bi-bell-fill"></i>
            </span>
            <span class="icon-action-label">Remind<br />Overdue</span>
          </NuxtLink>
          <NuxtLink to="/members" class="icon-action-btn">
            <span class="icon-action-circle bg-info bg-opacity-10 text-info">
              <i class="bi bi-search"></i>
            </span>
            <span class="icon-action-label">Find<br />Member</span>
          </NuxtLink>
        </div>
      </div>

      <!-- ================= ANALYTICS SECTION ================= -->
      <div class="d-flex align-items-center justify-content-between mb-2 ms-1">
        <h6 class="fw-bold text-secondary-amms text-uppercase text-xs tracking-wider mb-0">Analytics</h6>
      </div>
      <div class="row g-4 mb-4">
        <div class="col-lg-6">
          <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 class="fw-bold mb-0 text-primary">Revenue Trend</h6>
                <small class="text-muted">Collections over the last 6 months</small>
              </div>
              <i class="bi bi-graph-up-arrow text-primary fs-4"></i>
            </div>
            <div style="height: 240px;">
              <Line :data="revenueChartData" :options="lineChartOptions" />
            </div>
          </div>
        </div>

        <div class="col-lg-6">
          <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 class="fw-bold mb-0 text-primary">Membership Growth</h6>
                <small class="text-muted">New registrations per month</small>
              </div>
              <i class="bi bi-bar-chart-fill text-primary fs-4"></i>
            </div>
            <div style="height: 240px;">
              <Bar :data="growthChartData" :options="growthChartOptions" />
            </div>
          </div>
        </div>
      </div>

      <div class="row g-4 mb-4">
        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
            <div class="mb-3">
              <h6 class="fw-bold mb-0 text-primary">Age Group Distribution</h6>
              <small class="text-muted">Members by demographic bracket</small>
            </div>
            <div style="height: 240px;">
              <Doughnut v-if="ageChartData.labels && ageChartData.labels.length" :data="ageChartData" :options="doughnutOptions" />
              <div v-else class="text-center text-muted py-5">No data yet</div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
            <div class="mb-3">
              <h6 class="fw-bold mb-0 text-primary">Members by Location</h6>
              <small class="text-muted">Distribution across branches</small>
            </div>
            <div style="height: 240px;">
              <Bar v-if="locationChartData.labels && locationChartData.labels.length" :data="locationChartData" :options="locationChartOptions" />
              <div v-else class="text-center text-muted py-5">No data yet</div>
            </div>
          </div>
        </div>

        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
            <div class="d-flex align-items-center justify-content-between mb-3">
              <div>
                <h6 class="fw-bold mb-0 text-primary">Compliance Snapshot</h6>
                <small class="text-muted">Current year fee status</small>
              </div>
              <i class="bi bi-pie-chart-fill text-primary fs-4"></i>
            </div>
            <div class="d-flex align-items-center gap-3 mb-3">
              <div class="display-4 fw-bold text-primary">{{ complianceRate }}%</div>
              <div class="text-xs text-muted">of active members have paid this year's fee</div>
            </div>
            <div class="progress rounded-pill" style="height: 10px;">
              <div class="progress-bar bg-success rounded-pill" :style="{ width: complianceRate + '%' }"></div>
            </div>
            <div class="d-flex justify-content-between text-xs text-muted mt-2 mb-3">
              <span>{{ paidMembersThisYear.size }} paid</span>
              <span>{{ overdueCount }} outstanding</span>
            </div>
            <div class="d-flex flex-column gap-2">
              <div class="d-flex justify-content-between bg-body-tertiary rounded-3 px-3 py-2">
                <span class="text-xs text-muted">Active Members</span>
                <span class="fw-bold text-xs">{{ activeMembers }}</span>
              </div>
              <div class="d-flex justify-content-between bg-body-tertiary rounded-3 px-3 py-2">
                <span class="text-xs text-muted">Inactive Members</span>
                <span class="fw-bold text-xs">{{ inactiveMembers }}</span>
              </div>
              <div class="d-flex justify-content-between bg-body-tertiary rounded-3 px-3 py-2">
                <span class="text-xs text-muted">Fee Exempted</span>
                <span class="fw-bold text-xs">{{ exemptedMembers }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ================= ACTIVITY SECTION ================= -->
      <h6 class="fw-bold text-secondary-amms text-uppercase text-xs tracking-wider mb-2 ms-1">Activity</h6>
      <div class="row g-4">

        <!-- Overdue Members -->
        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 class="fw-bold mb-0 text-danger"><i class="bi bi-exclamation-triangle me-1"></i> Overdue Members</h6>
              <NuxtLink to="/fee-payments" class="text-xs fw-semibold text-decoration-none">Track Payments</NuxtLink>
            </div>
            <div class="p-3">
              <div v-if="overdueMembers.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-check2-all fs-3 d-block mb-2 text-success"></i>
                <span class="text-xs">All active members are up to date!</span>
              </div>
              <div v-else class="d-flex flex-column gap-2">
                <div v-for="m in overdueMembers" :key="m.id" class="d-flex align-items-center justify-content-between border rounded-3 p-2 activity-row">
                  <div class="d-flex align-items-center gap-2">
                    <div class="avatar-circle rounded-circle bg-danger bg-opacity-10 text-danger d-flex align-items-center justify-content-center fw-bold text-xs">
                      {{ m.first_name ? m.first_name[0] : '?' }}{{ m.last_name ? m.last_name[0] : '' }}
                    </div>
                    <div>
                      <span class="fw-semibold d-block text-sm text-truncate" style="max-width: 120px;">{{ m.first_name }} {{ m.last_name }}</span>
                      <small class="text-muted text-xs">{{ getLocationName(m.location_id) }}</small>
                    </div>
                  </div>
                  <button class="btn btn-sm btn-outline-danger rounded-pill text-xs fw-semibold" @click="sendReminder(m)">
                    <i class="bi bi-bell me-1"></i> Remind
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Broadcasts (badge shows broadcastCount, contextual instead of a top KPI) -->
        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 class="fw-bold mb-0 text-primary">
                <i class="bi bi-megaphone me-1"></i> Recent Broadcasts
                <span class="badge rounded-pill bg-primary bg-opacity-10 text-primary ms-1">{{ broadcastCount }}</span>
              </h6>
              <NuxtLink to="/notifications" class="text-xs fw-semibold text-decoration-none">View All</NuxtLink>
            </div>
            <div class="p-3">
              <div v-if="recentBroadcasts.length === 0" class="text-center text-muted py-4">
                <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                <span class="text-xs">No broadcasts sent yet</span>
              </div>
              <div v-else class="d-flex flex-column gap-2">
                <div v-for="n in recentBroadcasts" :key="n.id" class="border rounded-3 p-2 activity-row">
                  <div class="d-flex align-items-center justify-content-between mb-1">
                    <span class="fw-semibold text-sm text-primary text-truncate">{{ n.name }}</span>
                    <small class="text-muted text-xs text-nowrap ms-2">{{ formatDate(n.created_at) }}</small>
                  </div>
                  <p class="text-xs text-muted mb-0 text-truncate">{{ n.content }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Registrations Table -->
        <div class="col-lg-4">
          <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden h-100">
            <div class="card-header bg-transparent border-bottom p-3 d-flex align-items-center justify-content-between">
              <h6 class="fw-bold mb-0 text-primary">Recent Registrations</h6>
              <NuxtLink to="/members" class="text-xs fw-semibold text-decoration-none">View All &rarr;</NuxtLink>
            </div>
            <div class="table-responsive">
              <table class="table align-middle mb-0 text-sm">
                <thead class="table-light text-uppercase text-xs text-muted">
                  <tr>
                    <th class="ps-4">Member</th>
                    <th>Status</th>
                    <th class="pe-4 text-end">Registered</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="member in recentMembers" :key="member.id">
                    <td class="ps-4 fw-semibold text-primary">{{ member.first_name }} {{ member.last_name }}</td>
                    <td>
                      <span
                        class="badge rounded-pill px-2.5 py-1 text-capitalize fw-semibold"
                        :class="member.member_status === 'active' ? 'amms-status-active' : 'amms-status-inactive'"
                      >
                        {{ member.member_status }}
                      </span>
                    </td>
                    <td class="pe-4 text-end text-muted text-xs">{{ formatDate(member.registration_date || member.created_at) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.amms-dashboard {
  --amms-transition: 0.15s ease;
}

.text-xs { font-size: 0.775rem; }
.text-sm { font-size: 0.875rem; }
.tracking-wider { letter-spacing: 0.04em; }

/* ===== Hero KPI cards ===== */
.kpi-card {
  position: relative;
  transition: transform var(--amms-transition), box-shadow var(--amms-transition);
  border-left: 4px solid transparent;
}
.kpi-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.07) !important;
}
.kpi-accent-primary { border-left-color: #1B2A4A; }
.kpi-accent-warning { border-left-color: #B8923D; }
.kpi-accent-info    { border-left-color: #3172B0; }
.kpi-accent-danger  { border-left-color: #B33A3A; }

.kpi-icon {
  width: 40px;
  height: 40px;
  min-width: 40px;
  border-radius: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
}

.kpi-number {
  font-size: 2rem;
  line-height: 1.1;
}
.kpi-number-currency {
  font-size: 1.35rem;
}

.kpi-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.04);
  color: var(--bs-secondary-color, #6c757d);
}
.kpi-pill-success { background: rgba(47, 133, 90, 0.1); color: #2F855A; }
.kpi-pill-danger  { background: rgba(179, 58, 58, 0.1); color: #B33A3A; }
.kpi-pill-muted   { background: rgba(0, 0, 0, 0.05); color: #6c757d; }

/* ===== Quick actions: icon-forward buttons ===== */
.quick-actions-panel {
  background: var(--bs-body-bg, #fff);
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 1rem;
  padding: 1.1rem 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}
.quick-actions-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.icon-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  width: 96px;
  padding: 0.85rem 0.5rem;
  border-radius: 0.9rem;
  text-decoration: none;
  color: inherit;
  text-align: center;
  transition: transform var(--amms-transition), background-color var(--amms-transition);
}
.icon-action-btn:hover {
  transform: translateY(-2px);
  background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.03));
  color: inherit;
}
.icon-action-circle {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  transition: transform var(--amms-transition), box-shadow var(--amms-transition);
}
.icon-action-btn:hover .icon-action-circle {
  transform: scale(1.06);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
}
.icon-action-label {
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.2;
  color: var(--bs-secondary-color, #495057);
}

/* ===== Activity rows ===== */
.activity-row {
  transition: background-color var(--amms-transition);
}
.activity-row:hover {
  background-color: var(--bs-tertiary-bg, rgba(0, 0, 0, 0.02));
}

.avatar-circle { width: 32px; height: 32px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>