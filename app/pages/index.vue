<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '~/stores/useAuthStore'
import type { ChartData, ChartOptions } from 'chart.js'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

const authStore = useAuthStore()
if (!authStore.isAuthenticated) await navigateTo('/login')

const { data: membersResponse,       execute: fetchMembers,       fetchWithAuth } = useApi<any>()
const { data: paymentsResponse,      execute: fetchPayments     } = useApi<any>()
const { data: notificationsResponse, execute: fetchNotifications } = useApi<any>()
const { data: locations,             execute: fetchLocations     } = useApi<any[]>()
const { data: ageGroups,             execute: fetchAgeGroups     } = useApi<any[]>()
const { data: fees,                  execute: fetchFees          } = useApi<any[]>()

const loading = ref(true)
const error   = ref<string | null>(null)

const loadDashboard = async () => {
  loading.value = true
  error.value   = null
  try {
    await Promise.all([
      fetchMembers      ((api) => api('/api/members')).catch(() => null),
      fetchPayments     ((api) => api('/api/fee-payments')).catch(() => null),
      fetchNotifications((api) => api('/api/notifications')).catch(() => null),
      fetchLocations    ((api) => api('/api/locations')).catch(() => null),
      fetchAgeGroups    ((api) => api('/api/age-groups')).catch(() => null),
      fetchFees         ((api) => api('/api/fees')).catch(() => null),
    ])
  } catch (e: any) {
    error.value = e?.message || 'Failed to load dashboard data'
  } finally {
    loading.value = false
  }
}
onMounted(loadDashboard)

const toArray = (res: any): any[] => {
  if (!res) return []
  if (Array.isArray(res)) return res
  if (Array.isArray(res.data)) return res.data
  if (res.data && Array.isArray(res.data.data)) return res.data.data
  return []
}

const rawMembers       = computed(() => toArray(membersResponse.value))
const rawPayments      = computed(() => toArray(paymentsResponse.value))
const rawNotifications = computed(() => toArray(notificationsResponse.value))
const locationList     = computed(() => toArray(locations.value))
const ageGroupList     = computed(() => toArray(ageGroups.value))
const feeList          = computed(() => toArray(fees.value))

const formatCompact = (val: number) => {
  const n = val || 0
  if (n >= 1_000_000) return `TZS ${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000)     return `TZS ${(n / 1_000).toFixed(0)}K`
  return `TZS ${n}`
}
const formatDate = (val?: string) => {
  if (!val) return '\u2014'
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
const getLocationName = (id: any) => locationList.value.find((l: any) => Number(l.id) === Number(id))?.name ?? '\u2014'
const getAgeGroupName = (id: any) => ageGroupList.value.find((g: any) => Number(g.id) === Number(id))?.name ?? '\u2014'
const initials = (m: any) => `${(m.first_name || '?')[0]}${(m.last_name || '')[0] || ''}`.toUpperCase()

const currentYear = new Date().getFullYear()

const totalMembers    = computed(() => rawMembers.value.length)
const activeMembers   = computed(() => rawMembers.value.filter((m: any) => m.member_status === 'active').length)
const inactiveMembers = computed(() => totalMembers.value - activeMembers.value)
const exemptedMembers = computed(() => rawMembers.value.filter((m: any) => m.fee_exemption === 'yes').length)
const activeRate      = computed(() => totalMembers.value ? Math.round((activeMembers.value / totalMembers.value) * 100) : 0)
const broadcastCount  = computed(() => rawNotifications.value.length)

const revenueYTD = computed(() =>
  rawPayments.value
    .filter((p: any) => (p.date || p.created_at || '').startsWith(String(currentYear)))
    .reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0)
)
const totalRevenue = computed(() => rawPayments.value.reduce((s: number, p: any) => s + (Number(p.amount) || 0), 0))

const paidThisYear = computed(() => {
  const ids = new Set<number>()
  rawPayments.value.forEach((p: any) => {
    if ((p.date || p.created_at || '').startsWith(String(currentYear))) ids.add(Number(p.member_id))
  })
  return ids
})
const overdueCount   = computed(() => rawMembers.value.filter((m: any) => m.member_status === 'active' && !paidThisYear.value.has(Number(m.id))).length)
const overdueMembers = computed(() => rawMembers.value.filter((m: any) => m.member_status === 'active' && !paidThisYear.value.has(Number(m.id))).slice(0, 6))
const complianceRate = computed(() => activeMembers.value ? Math.round((paidThisYear.value.size / activeMembers.value) * 100) : 0)

const recentMembers    = computed(() => [...rawMembers.value].sort((a: any, b: any) => new Date(b.registration_date||b.created_at||0).getTime()-new Date(a.registration_date||a.created_at||0).getTime()).slice(0,5))
const recentPayments   = computed(() => [...rawPayments.value].sort((a: any, b: any) => new Date(b.date||b.created_at||0).getTime()-new Date(a.date||a.created_at||0).getTime()).slice(0,5))
const recentBroadcasts = computed(() => [...rawNotifications.value].sort((a: any, b: any) => new Date(b.created_at||0).getTime()-new Date(a.created_at||0).getTime()).slice(0,4))

const getMemberName = (p: any) => {
  if (p.member) return `${p.member.first_name} ${p.member.last_name}`
  const m = rawMembers.value.find((m: any) => Number(m.id) === Number(p.member_id))
  return m ? `${m.first_name} ${m.last_name}` : `Member #${p.member_id}`
}
const getMemberInitials = (p: any) => { const parts = getMemberName(p).split(' '); return `${(parts[0]||'?')[0]}${(parts[1]||'')[0]||''}`.toUpperCase() }

const PALETTE = ['#43766C','#B19470','#76453B','#6B9E8C','#C4A882','#9E6358']

const revenueChartData = computed<ChartData<'line'>>(() => {
  const months: string[] = [], totals: number[] = [], now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    months.push(d.toLocaleString('en',{month:'short'}))
    totals.push(rawPayments.value.filter((p: any)=>(p.date||p.created_at||'').startsWith(key)).reduce((s: number,p: any)=>s+(Number(p.amount)||0),0))
  }
  return {
    labels: months,
    datasets: [{
      label: 'Revenue (TZS)', data: totals,
      borderColor: '#43766C', backgroundColor: 'rgba(67,118,108,0.12)',
      fill: true, tension: 0.42,
      pointBackgroundColor: '#B19470', pointBorderColor: '#fff', pointBorderWidth: 2, pointRadius: 5, pointHoverRadius: 7, borderWidth: 2.5
    }]
  }
})
const lineChartOptions: ChartOptions<'line'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', titleColor: '#F8FAE5', bodyColor: '#ccc', padding: 10, cornerRadius: 8, callbacks: { label: (c) => ` TZS ${Number(c.parsed.y).toLocaleString()}` } } },
  scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, color: '#888', callback: (v) => `${Number(v)/1000}K` } } }
}

const growthChartData = computed<ChartData<'bar'>>(() => {
  const months: string[] = [], counts: number[] = [], now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
    months.push(d.toLocaleString('en',{month:'short'}))
    counts.push(rawMembers.value.filter((m: any)=>(m.registration_date||m.created_at||'').startsWith(key)).length)
  }
  return { labels: months, datasets: [{ label: 'New Members', data: counts, backgroundColor: PALETTE, borderRadius: 7, borderSkipped: false as any }] }
})
const growthChartOptions: ChartOptions<'bar'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', titleColor: '#F8FAE5', bodyColor: '#ccc', padding: 10, cornerRadius: 8 } },
  scales: { x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#888' } }, y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, color: '#888', stepSize: 1 } } }
}

const ageChartData = computed<ChartData<'doughnut'>>(() => {
  const counts: Record<string,number> = {}
  rawMembers.value.forEach((m: any) => { const n=getAgeGroupName(m.age_group_id); counts[n]=(counts[n]||0)+1 })
  return { labels: Object.keys(counts), datasets: [{ data: Object.values(counts), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }] }
})
const doughnutOptions: ChartOptions<'doughnut'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom', labels: { boxWidth: 11, padding: 12, font: { size: 11 }, color: '#555' } }, tooltip: { backgroundColor: '#1a1a1a', titleColor: '#F8FAE5', bodyColor: '#ccc', padding: 10, cornerRadius: 8 } },
  cutout: '65%'
}

const locationChartData = computed<ChartData<'bar'>>(() => {
  const counts: Record<string,number> = {}
  locationList.value.forEach((l: any) => { counts[l.name] = 0 })
  rawMembers.value.forEach((m: any) => { const n=getLocationName(m.location_id); counts[n]=(counts[n]||0)+1 })
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,7)
  return { labels: entries.map(e=>e[0]), datasets: [{ label: 'Members', data: entries.map(e=>e[1]), backgroundColor: PALETTE, borderRadius: 7, borderSkipped: false as any }] }
})
const locationChartOptions: ChartOptions<'bar'> = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a1a1a', titleColor: '#F8FAE5', bodyColor: '#ccc', padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10 }, color: '#555', maxRotation: 30, minRotation: 0 } },
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { size: 10 }, color: '#888', stepSize: 1 } }
  }
}

const sendingReminderId = ref<number|null>(null)
const sendReminder = async (m: any) => {
  sendingReminderId.value = m.id
  try {
    await fetchWithAuth('/api/notifications', { method: 'POST', body: { name: `Fee Reminder \u2014 ${m.first_name} ${m.last_name}`, content: `Dear ${m.first_name}, your annual membership fee for ${currentYear} is still outstanding. Kindly settle it at your earliest convenience.` } })
    push.success(`Reminder queued for ${m.first_name} ${m.last_name}`)
  } catch(e: any) { push.error(e?.data?.message || 'Failed to send reminder') }
  finally { sendingReminderId.value = null }
}
</script>

<template>
  <div class="dash-root">

    <!-- PAGE HEADER -->
    <div class="dash-header mb-4">
      <div>
        <h1 class="dash-title">Executive Overview</h1>
        <p class="dash-subtitle">Welcome back, <strong>{{ authStore.user?.first_name || 'Admin' }}</strong> &mdash; your association at a glance.</p>
      </div>
      <div class="dash-header__actions">
        <span class="dash-date">{{ new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'}) }}</span>
        <button class="btn btn-sm btn-outline-secondary rounded-pill px-3" @click="loadDashboard" :disabled="loading">
          <i class="bi bi-arrow-clockwise me-1" :class="{'spin':loading}"></i> Refresh
        </button>
      </div>
    </div>

    <!-- SKELETON -->
    <template v-if="loading">
      <div class="row g-3 mb-4">
        <div v-for="i in 5" :key="i" class="col-sm-6 col-xl">
          <div class="card border-0 rounded-4 p-4 skel-card">
            <div class="skel skel-sm mb-2"></div><div class="skel skel-lg mb-3"></div><div class="skel skel-sm" style="width:60%"></div>
          </div>
        </div>
      </div>
      <div class="row g-4">
        <div v-for="i in 4" :key="i" class="col-lg-6">
          <div class="card border-0 rounded-4 p-4 skel-card" style="height:260px">
            <div class="skel skel-sm mb-3" style="width:40%"></div><div class="skel" style="height:180px;border-radius:.75rem"></div>
          </div>
        </div>
      </div>
    </template>

    <!-- ERROR -->
    <div v-else-if="error" class="alert border-0 rounded-4 shadow-sm d-flex align-items-center justify-content-between" style="background:#fff0f0;color:#76453B">
      <div><i class="bi bi-exclamation-triangle-fill me-2"></i>{{ error }}</div>
      <button class="btn btn-sm rounded-pill px-3 fw-semibold" style="background:#76453B;color:#F8FAE5" @click="loadDashboard">Retry</button>
    </div>

    <template v-else>
      <!-- KPI STRIP -->
      <div class="row g-3 mb-4">
        <div class="col-6 col-sm-4 col-xl">
          <div class="kpi kpi--teal">
            <div class="kpi__body">
              <div class="kpi__label">Total Members</div>
              <div class="kpi__val">{{ totalMembers }}</div>
              <div class="d-flex gap-1 flex-wrap mt-1">
                <span class="kpib kpib--green"><i class="bi bi-person-check-fill"></i> {{ activeMembers }} active</span>
                <span class="kpib">{{ activeRate }}%</span>
              </div>
            </div>
            <div class="kpi__icon"><i class="bi bi-people-fill"></i></div>
          </div>
        </div>
        <div class="col-6 col-sm-4 col-xl">
          <div class="kpi kpi--gold">
            <div class="kpi__body">
              <div class="kpi__label">Revenue YTD</div>
              <div class="kpi__val kpi__val--sm">{{ formatCompact(revenueYTD) }}</div>
              <span class="kpib mt-1"><i class="bi bi-clock-history"></i> Lifetime {{ formatCompact(totalRevenue) }}</span>
            </div>
            <div class="kpi__icon kpi__icon--gold"><i class="bi bi-wallet2"></i></div>
          </div>
        </div>
        <div class="col-6 col-sm-4 col-xl">
          <div class="kpi kpi--brown">
            <div class="kpi__body">
              <div class="kpi__label">Fee Compliance</div>
              <div class="kpi__val">{{ complianceRate }}<span class="kpi__unit">%</span></div>
              <div class="cbar mt-2 mb-1"><div class="cbar__fill" :style="{width:complianceRate+'%'}"></div></div>
              <span class="kpib">{{ paidThisYear.size }} of {{ activeMembers }} paid</span>
            </div>
            <div class="kpi__icon kpi__icon--brown"><i class="bi bi-check2-circle"></i></div>
          </div>
        </div>
        <div class="col-6 col-sm-4 col-xl">
          <div class="kpi kpi--danger">
            <div class="kpi__body">
              <div class="kpi__label">Overdue Members</div>
              <div class="kpi__val" :class="overdueCount>0?'text-danger':'text-success'">{{ overdueCount }}</div>
              <span class="kpib mt-1" :class="overdueCount>0?'kpib--red':'kpib--green'">
                <i class="bi" :class="overdueCount>0?'bi-bell-fill':'bi-check2'"></i>
                {{ overdueCount>0?'Needs attention':'All settled' }}
              </span>
            </div>
            <div class="kpi__icon kpi__icon--red"><i class="bi bi-exclamation-triangle-fill"></i></div>
          </div>
        </div>
        <div class="col-6 col-sm-4 col-xl">
          <div class="kpi kpi--neutral">
            <div class="kpi__body">
              <div class="kpi__label">Broadcasts Sent</div>
              <div class="kpi__val">{{ broadcastCount }}</div>
              <span class="kpib mt-1"><i class="bi bi-megaphone-fill"></i> All channels</span>
            </div>
            <div class="kpi__icon kpi__icon--neutral"><i class="bi bi-megaphone-fill"></i></div>
          </div>
        </div>
      </div>

      <!-- QUICK ACTIONS -->
      <div class="qpanel mb-4">
        <span class="sec-lbl"><i class="bi bi-lightning-charge-fill me-1" style="color:#B19470"></i> Quick Actions</span>
        <div class="qgrid">
          <NuxtLink to="/members" class="qa"><span class="qa__icon" style="background:rgba(67,118,108,.12);color:#43766C"><i class="bi bi-person-plus-fill"></i></span><span class="qa__lbl">Register<br/>Member</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/fee-payments" class="qa"><span class="qa__icon" style="background:rgba(177,148,112,.15);color:#B19470"><i class="bi bi-credit-card-2-front-fill"></i></span><span class="qa__lbl">Record<br/>Payment</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/notifications" class="qa"><span class="qa__icon" style="background:rgba(118,69,59,.10);color:#76453B"><i class="bi bi-chat-dots-fill"></i></span><span class="qa__lbl">Send<br/>Broadcast</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/reports" class="qa"><span class="qa__icon" style="background:rgba(67,118,108,.12);color:#43766C"><i class="bi bi-file-earmark-bar-graph-fill"></i></span><span class="qa__lbl">View<br/>Reports</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/fee-payments" class="qa"><span class="qa__icon" style="background:rgba(220,53,69,.08);color:#dc3545"><i class="bi bi-bell-fill"></i></span><span class="qa__lbl">Remind<br/>Overdue</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/members" class="qa"><span class="qa__icon" style="background:rgba(67,118,108,.10);color:#43766C"><i class="bi bi-people"></i></span><span class="qa__lbl">View<br/>Members</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/settings/users" class="qa"><span class="qa__icon" style="background:rgba(177,148,112,.12);color:#B19470"><i class="bi bi-person-gear"></i></span><span class="qa__lbl">Manage<br/>Users</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/settings/fees" class="qa"><span class="qa__icon" style="background:rgba(118,69,59,.08);color:#76453B"><i class="bi bi-calendar2-check"></i></span><span class="qa__lbl">Fee<br/>Schedules</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/audit-trail" class="qa"><span class="qa__icon" style="background:rgba(67,118,108,.10);color:#43766C"><i class="bi bi-shield-check"></i></span><span class="qa__lbl">Audit<br/>Trail</span></NuxtLink>
          <div class="qa-divider"></div>
          <NuxtLink to="/settings" class="qa"><span class="qa__icon" style="background:rgba(0,0,0,.05);color:#888"><i class="bi bi-gear-fill"></i></span><span class="qa__lbl">System<br/>Settings</span></NuxtLink>
        </div>
      </div>

      <!-- ANALYTICS ROW 1 -->
      <div class="sec-lbl mb-3"><i class="bi bi-bar-chart-line me-1" style="color:#B19470"></i> Analytics</div>
      <div class="row g-4 mb-4">
        <div class="col-lg-7">
          <div class="ccrd">
            <div class="ccrd__hd">
              <div><div class="ccrd__ttl">Revenue Trend</div><div class="ccrd__sub">Monthly collections &mdash; last 6 months</div></div>
              <span class="cbadge" style="background:rgba(67,118,108,.1);color:#43766C"><i class="bi bi-graph-up-arrow"></i> {{ formatCompact(revenueYTD) }} YTD</span>
            </div>
            <div style="height:220px"><Line :data="revenueChartData" :options="lineChartOptions" /></div>
          </div>
        </div>
        <div class="col-lg-5">
          <div class="ccrd">
            <div class="ccrd__hd">
              <div><div class="ccrd__ttl">Membership Growth</div><div class="ccrd__sub">New registrations per month</div></div>
              <span class="cbadge" style="background:rgba(177,148,112,.12);color:#B19470"><i class="bi bi-people"></i> {{ totalMembers }} total</span>
            </div>
            <div style="height:220px"><Bar :data="growthChartData" :options="growthChartOptions" /></div>
          </div>
        </div>
      </div>

      <!-- ANALYTICS ROW 2 -->
      <div class="row g-4 mb-4">
        <div class="col-lg-4">
          <div class="ccrd">
            <div class="ccrd__hd"><div><div class="ccrd__ttl">Age Demographics</div><div class="ccrd__sub">Members by age group bracket</div></div></div>
            <div style="height:220px">
              <Doughnut v-if="ageChartData.labels?.length" :data="ageChartData" :options="doughnutOptions" />
              <div v-else class="echart"><i class="bi bi-pie-chart"></i><span>No demographic data yet</span></div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="ccrd">
            <div class="ccrd__hd"><div><div class="ccrd__ttl">Members by Branch</div><div class="ccrd__sub">Distribution across locations</div></div></div>
            <div style="height:220px">
              <Bar v-if="locationChartData.labels?.length" :data="locationChartData" :options="locationChartOptions" />
              <div v-else class="echart"><i class="bi bi-geo-alt"></i><span>No location data yet</span></div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="ccrd h-100">
            <div class="ccrd__hd mb-2"><div><div class="ccrd__ttl">Compliance Snapshot</div><div class="ccrd__sub">{{ currentYear }} fee payment status</div></div></div>
            <div class="ring-wrap mb-3">
              <svg viewBox="0 0 80 80" class="ring-svg">
                <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(67,118,108,0.1)" stroke-width="8"/>
                <circle cx="40" cy="40" r="34" fill="none"
                  :stroke="complianceRate>=70?'#43766C':complianceRate>=40?'#B19470':'#76453B'"
                  stroke-width="8" stroke-linecap="round"
                  :stroke-dasharray="`${complianceRate*2.136} 213.6`"
                  stroke-dashoffset="53.4"
                  style="transition:stroke-dasharray .8s ease"
                />
                <text x="40" y="36" text-anchor="middle" font-size="14" font-weight="700" fill="#43766C">{{ complianceRate }}%</text>
                <text x="40" y="50" text-anchor="middle" font-size="7" fill="#888">compliance</text>
              </svg>
            </div>
            <div class="crows">
              <div class="crow crow--paid"><span>Paid This Year</span><strong>{{ paidThisYear.size }}</strong></div>
              <div class="crow crow--overdue"><span>Outstanding</span><strong>{{ overdueCount }}</strong></div>
              <div class="crow"><span>Inactive Members</span><strong>{{ inactiveMembers }}</strong></div>
              <div class="crow"><span>Fee Exempted</span><strong>{{ exemptedMembers }}</strong></div>
            </div>
          </div>
        </div>
      </div>

      <!-- ACTIVITY -->
      <div class="sec-lbl mb-3"><i class="bi bi-activity me-1" style="color:#B19470"></i> Activity</div>
      <div class="row g-4">
        <div class="col-lg-4">
          <div class="acrd h-100">
            <div class="acrd__hd">
              <div class="d-flex align-items-center gap-2">
                <span class="adot adot--red"></span><span class="acrd__ttl">Overdue Members</span>
                <span v-if="overdueCount" class="abadge abadge--red">{{ overdueCount }}</span>
              </div>
              <NuxtLink to="/fee-payments" class="alink">Track &rarr;</NuxtLink>
            </div>
            <div class="acrd__bd">
              <div v-if="!overdueMembers.length" class="eact"><i class="bi bi-check2-all text-success fs-3 d-block mb-2"></i><span>All active members are up to date!</span></div>
              <div v-else class="alist">
                <div v-for="m in overdueMembers" :key="m.id" class="aitem">
                  <div class="aav aav--red">{{ initials(m) }}</div>
                  <div class="ainf"><span class="aname">{{ m.first_name }} {{ m.last_name }}</span><span class="ameta">{{ getLocationName(m.location_id) }}</span></div>
                  <button class="arem" @click="sendReminder(m)" :disabled="sendingReminderId===m.id">
                    <i class="bi" :class="sendingReminderId===m.id?'bi-hourglass-split spin':'bi-bell-fill'"></i>
                    {{ sendingReminderId===m.id?'':'Remind' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="acrd h-100">
            <div class="acrd__hd">
              <div class="d-flex align-items-center gap-2"><span class="adot adot--teal"></span><span class="acrd__ttl">Recent Payments</span></div>
              <NuxtLink to="/fee-payments" class="alink">View All &rarr;</NuxtLink>
            </div>
            <div class="acrd__bd">
              <div v-if="!recentPayments.length" class="eact"><i class="bi bi-credit-card fs-3 d-block mb-2"></i><span>No payments recorded yet</span></div>
              <div v-else class="alist">
                <div v-for="p in recentPayments" :key="p.id" class="aitem">
                  <div class="aav aav--teal">{{ getMemberInitials(p) }}</div>
                  <div class="ainf"><span class="aname">{{ getMemberName(p) }}</span><span class="ameta">{{ formatDate(p.date||p.created_at) }}</span></div>
                  <div class="aamt"><span class="aamt__v">{{ formatCompact(Number(p.amount)) }}</span><span class="aamt__l">paid</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="col-lg-4">
          <div class="acrd h-100">
            <div class="acrd__hd">
              <div class="d-flex align-items-center gap-2"><span class="adot adot--gold"></span><span class="acrd__ttl">Recent Registrations</span></div>
              <NuxtLink to="/members" class="alink">View All &rarr;</NuxtLink>
            </div>
            <div class="acrd__bd">
              <div v-if="!recentMembers.length" class="eact"><i class="bi bi-person-plus fs-3 d-block mb-2"></i><span>No members registered yet</span></div>
              <div v-else class="alist">
                <div v-for="m in recentMembers" :key="m.id" class="aitem">
                  <div class="aav aav--gold">{{ initials(m) }}</div>
                  <div class="ainf"><span class="aname">{{ m.first_name }} {{ m.last_name }}</span><span class="ameta">{{ getLocationName(m.location_id) }}</span></div>
                  <span class="asbadge" :class="m.member_status==='active'?'asbadge--active':'asbadge--inactive'">{{ m.member_status }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash-root{--ct:#43766C;--cg:#B19470;--cb:#76453B;--tr:.18s ease}
.dash-title{font-size:1.55rem;font-weight:800;color:var(--ct);margin-bottom:.2rem;letter-spacing:-.02em}
.dash-subtitle{font-size:.85rem;color:#888;margin:0}
.dash-header{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:1rem}
.dash-header__actions{display:flex;align-items:center;gap:.6rem;flex-wrap:wrap}
.dash-date{font-size:.78rem;color:#999;white-space:nowrap}
.btn-primary-amms{background:var(--ct)!important;border-color:var(--ct)!important;color:#fff!important}
.btn-primary-amms:hover{background:#325e56!important}
.sec-lbl{font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#999}
.skel-card{background:#f7f7f7!important;animation:sp 1.4s ease-in-out infinite}
.skel{background:#e4e4e4;border-radius:6px;height:12px;display:block}
.skel-sm{height:10px}.skel-lg{height:32px}
@keyframes sp{0%,100%{opacity:1}50%{opacity:.55}}
.kpi{background:var(--bs-body-bg,#fff);border-radius:1rem;padding:1.2rem 1.1rem;display:flex;align-items:flex-start;justify-content:space-between;gap:.75rem;box-shadow:0 2px 10px rgba(0,0,0,.05);border:1px solid rgba(0,0,0,.05);border-top:3px solid transparent;transition:transform var(--tr),box-shadow var(--tr);height:100%}
.kpi:hover{transform:translateY(-3px);box-shadow:0 10px 28px rgba(0,0,0,.09)}
.kpi--teal{border-top-color:var(--ct)}.kpi--gold{border-top-color:var(--cg)}.kpi--brown{border-top-color:var(--cb)}.kpi--danger{border-top-color:#dc3545}.kpi--neutral{border-top-color:#aaa}
.kpi__body{flex:1;min-width:0}
.kpi__label{font-size:.71rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#999;margin-bottom:.35rem}
.kpi__val{font-size:2rem;font-weight:800;color:var(--ct);line-height:1;letter-spacing:-.03em}
.kpi__val--sm{font-size:1.35rem}
.kpi__unit{font-size:1.1rem;font-weight:600;margin-left:1px}
.kpi__icon{width:40px;height:40px;min-width:40px;border-radius:.7rem;background:rgba(67,118,108,.10);color:var(--ct);display:flex;align-items:center;justify-content:center;font-size:1.2rem}
.kpi__icon--gold{background:rgba(177,148,112,.12);color:var(--cg)}
.kpi__icon--brown{background:rgba(118,69,59,.10);color:var(--cb)}
.kpi__icon--red{background:rgba(220,53,69,.08);color:#dc3545}
.kpi__icon--neutral{background:rgba(0,0,0,.05);color:#888}
.kpib{display:inline-flex;align-items:center;gap:.3rem;font-size:.7rem;font-weight:600;padding:.18rem .5rem;border-radius:999px;background:rgba(0,0,0,.05);color:#777;white-space:nowrap}
.kpib--green{background:rgba(47,133,90,.10);color:#2F855A}.kpib--red{background:rgba(220,53,69,.10);color:#dc3545}
.cbar{height:5px;border-radius:999px;background:rgba(0,0,0,.08);overflow:hidden}
.cbar__fill{height:100%;border-radius:999px;background:var(--ct);transition:width .6s ease}
.qpanel{background:var(--bs-body-bg,#fff);border:1px solid rgba(0,0,0,.06);border-radius:1rem;padding:1rem 1.25rem;box-shadow:0 1px 4px rgba(0,0,0,.04);display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap}
.qgrid{display:flex;gap:.4rem;flex-wrap:wrap;align-items:center}
.qa-divider{width:1px;height:52px;background:rgba(0,0,0,.08);margin:0 .35rem;flex-shrink:0}
.qa{display:flex;flex-direction:column;align-items:center;gap:.45rem;width:84px;padding:.7rem .4rem;border-radius:.85rem;text-decoration:none;color:inherit;text-align:center;transition:transform var(--tr),background var(--tr)}
.qa:hover{transform:translateY(-2px);background:rgba(0,0,0,.03)}
.qa__icon{width:46px;height:46px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:1.2rem;transition:transform var(--tr),box-shadow var(--tr)}
.qa:hover .qa__icon{transform:scale(1.06);box-shadow:0 6px 16px rgba(0,0,0,.1)}
.qa__lbl{font-size:.7rem;font-weight:600;line-height:1.2;color:#666}
.ccrd{background:var(--bs-body-bg,#fff);border:1px solid rgba(0,0,0,.06);border-radius:1rem;padding:1.25rem 1.25rem 1rem;box-shadow:0 2px 10px rgba(0,0,0,.04);height:100%}
.ccrd__hd{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:1rem;gap:.75rem}
.ccrd__ttl{font-size:.9rem;font-weight:700;color:#333}
.ccrd__sub{font-size:.75rem;color:#999;margin-top:.1rem}
.cbadge{display:inline-flex;align-items:center;gap:.3rem;font-size:.72rem;font-weight:600;padding:.25rem .65rem;border-radius:999px;white-space:nowrap}
.echart{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#bbb;font-size:.8rem;gap:.5rem}
.echart i{font-size:2rem}
.ring-wrap{display:flex;justify-content:center}
.ring-svg{width:120px;height:120px}
.crows{display:flex;flex-direction:column;gap:.35rem}
.crow{display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,.03);border-radius:.5rem;padding:.35rem .75rem;font-size:.78rem;color:#666}
.crow strong{font-weight:700;color:#333}
.crow--paid{background:rgba(67,118,108,.08)}.crow--paid span{color:var(--ct);font-weight:600}
.crow--overdue{background:rgba(220,53,69,.06)}.crow--overdue span{color:#dc3545;font-weight:600}
.acrd{background:var(--bs-body-bg,#fff);border:1px solid rgba(0,0,0,.06);border-radius:1rem;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,.04);display:flex;flex-direction:column}
.acrd__hd{display:flex;align-items:center;justify-content:space-between;padding:.85rem 1.1rem;border-bottom:1px solid rgba(0,0,0,.06);background:rgba(0,0,0,.015)}
.acrd__ttl{font-size:.83rem;font-weight:700;color:#333}
.acrd__bd{padding:.6rem .75rem;flex:1;overflow:hidden}
.alist{display:flex;flex-direction:column;gap:.25rem}
.aitem{display:flex;align-items:center;gap:.65rem;padding:.5rem;border-radius:.65rem;transition:background var(--tr)}
.aitem:hover{background:rgba(0,0,0,.025)}
.adot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.adot--teal{background:var(--ct)}.adot--red{background:#dc3545}.adot--gold{background:var(--cg)}
.abadge{font-size:.68rem;font-weight:700;padding:.1rem .45rem;border-radius:999px}
.abadge--red{background:rgba(220,53,69,.1);color:#dc3545}
.alink{font-size:.75rem;font-weight:600;color:var(--ct);text-decoration:none}
.alink:hover{text-decoration:underline}
.aav{width:34px;height:34px;min-width:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;flex-shrink:0}
.aav--teal{background:rgba(67,118,108,.12);color:var(--ct)}
.aav--red{background:rgba(220,53,69,.10);color:#dc3545}
.aav--gold{background:rgba(177,148,112,.15);color:var(--cg)}
.ainf{flex:1;min-width:0}
.aname{font-size:.8rem;font-weight:600;color:#333;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ameta{font-size:.7rem;color:#999;display:block}
.arem{font-size:.7rem;font-weight:600;padding:.25rem .65rem;border-radius:999px;border:1px solid rgba(220,53,69,.3);background:rgba(220,53,69,.06);color:#dc3545;cursor:pointer;white-space:nowrap;transition:background var(--tr);display:flex;align-items:center;gap:.3rem}
.arem:hover:not(:disabled){background:rgba(220,53,69,.12)}
.arem:disabled{opacity:.6;cursor:not-allowed}
.aamt{text-align:right;flex-shrink:0}
.aamt__v{font-size:.78rem;font-weight:700;color:var(--ct);display:block}
.aamt__l{font-size:.65rem;color:#aaa}
.asbadge{font-size:.68rem;font-weight:600;padding:.18rem .55rem;border-radius:999px;white-space:nowrap}
.asbadge--active{background:rgba(67,118,108,.10);color:var(--ct)}
.asbadge--inactive{background:rgba(0,0,0,.06);color:#888}
.eact{padding:2rem 0;text-align:center;color:#bbb;font-size:.8rem}
.spin{animation:sp2 1s linear infinite}
@keyframes sp2{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
</style>
