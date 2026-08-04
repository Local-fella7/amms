<script setup lang="ts">
import { useAuthStore } from '~/stores/useAuthStore'

const authStore = useAuthStore()

if (!authStore.isAuthenticated) {
  await navigateTo('/login')
}

// Sample recent member data for presentation
const recentMembers = [
  { id: 1, name: 'Alice Smith', location: 'Dar es Salaam', phone: '255755555555', status: 'active', registered: '2026-08-03' },
  { id: 2, name: 'Bob Johnson', location: 'Moshi', phone: '255766666666', status: 'active', registered: '2026-08-02' },
  { id: 3, name: 'Carol Davis', location: 'Arusha', phone: '255777777777', status: 'pending', registered: '2026-08-01' },
  { id: 4, name: 'David Wilson', location: 'Dodoma', phone: '255788888888', status: 'overdue', registered: '2026-07-28' },
]
</script>

<template>
  <div>
    <!-- Top Greeting Banner -->
    <div class="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 gap-3">
      <div>
        <h2 class="fw-bold text-primary mb-1">Executive Overview</h2>
        <p class="text-secondary-amms mb-0">Welcome back, {{ authStore.user?.first_name || 'System Admin' }}! Here is what's happening today.</p>
      </div>
      <div class="d-flex align-items-center gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-medium">
          <i class="bi bi-download me-1"></i> Export Report
        </button>
        <NuxtLink to="/members" class="btn btn-primary btn-sm rounded-pill px-3 fw-semibold shadow-sm">
          <i class="bi bi-plus-lg me-1"></i> Register Member
        </NuxtLink>
      </div>
    </div>

    <!-- Quick Stats Cards Grid -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-xl-3">
        <div class="card amms-surface border-0 shadow-sm p-3.5 rounded-4 h-100">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Total Members</span>
              <h3 class="fw-bold text-primary mb-0 mt-1">1,248</h3>
              <small class="text-success text-xs fw-semibold"><i class="bi bi-arrow-up-short"></i> +12% this month</small>
            </div>
            <div class="p-3 bg-primary bg-opacity-10 rounded-3 text-primary">
              <i class="bi bi-people-fill fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card amms-surface border-0 shadow-sm p-3.5 rounded-4 h-100">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Active Subscriptions</span>
              <h3 class="fw-bold text-success mb-0 mt-1">980</h3>
              <small class="text-muted text-xs">78.5% compliance rate</small>
            </div>
            <div class="p-3 bg-success bg-opacity-10 rounded-3 text-success">
              <i class="bi bi-check-circle-fill fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card amms-surface border-0 shadow-sm p-3.5 rounded-4 h-100">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Revenue Collected (YTD)</span>
              <h3 class="fw-bold text-warning mb-0 mt-1">TZS 58.4M</h3>
              <small class="text-success text-xs fw-semibold"><i class="bi bi-arrow-up-short"></i> +8.2% vs last year</small>
            </div>
            <div class="p-3 bg-warning bg-opacity-10 rounded-3 text-warning">
              <i class="bi bi-wallet2 fs-3"></i>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-xl-3">
        <div class="card amms-surface border-0 shadow-sm p-3.5 rounded-4 h-100">
          <div class="d-flex align-items-center justify-content-between">
            <div>
              <span class="text-secondary-amms text-uppercase text-xs fw-semibold tracking-wider">Pending / Overdue</span>
              <h3 class="fw-bold text-danger mb-0 mt-1">42</h3>
              <small class="text-danger text-xs fw-semibold">Requires SMS Reminder</small>
            </div>
            <div class="p-3 bg-danger bg-opacity-10 rounded-3 text-danger">
              <i class="bi bi-exclamation-triangle-fill fs-3"></i>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Members & Quick Navigation -->
    <div class="row g-4 mb-4">
      
      <!-- Recent Registrations Table -->
      <div class="col-lg-8">
        <div class="card amms-surface border-0 shadow-sm rounded-4 overflow-hidden">
          <div class="card-header bg-transparent border-bottom p-3.5 d-flex align-items-center justify-content-between">
            <h6 class="fw-bold mb-0 text-primary">Recent Member Registrations</h6>
            <NuxtLink to="/members" class="text-xs fw-semibold text-decoration-none">View All Members &rarr;</NuxtLink>
          </div>
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0 text-sm">
              <thead class="table-light text-uppercase text-xs text-muted">
                <tr>
                  <th class="ps-4">Member Name</th>
                  <th>Location</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th class="pe-4 text-end">Registered</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="member in recentMembers" :key="member.id">
                  <td class="ps-4 fw-semibold text-primary">{{ member.name }}</td>
                  <td><span class="badge bg-body-tertiary text-body border fw-normal">{{ member.location }}</span></td>
                  <td class="font-monospace text-muted">{{ member.phone }}</td>
                  <td>
                    <span 
                      class="badge rounded-pill px-2.5 py-1 text-capitalize fw-semibold"
                      :class="{
                        'amms-status-active': member.status === 'active',
                        'amms-status-pending': member.status === 'pending',
                        'amms-status-overdue': member.status === 'overdue'
                      }"
                    >
                      {{ member.status }}
                    </span>
                  </td>
                  <td class="pe-4 text-end text-muted">{{ member.registered }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Quick Action Modules Card -->
      <div class="col-lg-4">
        <div class="card amms-surface border-0 shadow-sm rounded-4 p-4 h-100">
          <h6 class="fw-bold mb-3 text-primary">Quick Shortcuts</h6>
          
          <div class="d-flex flex-column gap-2.5">
            <NuxtLink to="/members" class="btn btn-outline-light text-body border p-3 rounded-3 d-flex align-items-center justify-content-between text-decoration-none hover-shadow">
              <div class="d-flex align-items-center gap-3">
                <div class="p-2 bg-primary bg-opacity-10 rounded-circle text-primary">
                  <i class="bi bi-person-plus-fill fs-5"></i>
                </div>
                <div class="text-start">
                  <span class="fw-semibold d-block text-sm">Register New Member</span>
                  <small class="text-muted text-xs">Add demographic & contact info</small>
                </div>
              </div>
              <i class="bi bi-chevron-right text-muted"></i>
            </NuxtLink>

            <NuxtLink to="/fee-payments" class="btn btn-outline-light text-body border p-3 rounded-3 d-flex align-items-center justify-content-between text-decoration-none hover-shadow">
              <div class="d-flex align-items-center gap-3">
                <div class="p-2 bg-success bg-opacity-10 rounded-circle text-success">
                  <i class="bi bi-credit-card-2-front-fill fs-5"></i>
                </div>
                <div class="text-start">
                  <span class="fw-semibold d-block text-sm">Record Fee Payment</span>
                  <small class="text-muted text-xs">Issue receipt for annual fee</small>
                </div>
              </div>
              <i class="bi bi-chevron-right text-muted"></i>
            </NuxtLink>

            <NuxtLink to="/notifications" class="btn btn-outline-light text-body border p-3 rounded-3 d-flex align-items-center justify-content-between text-decoration-none hover-shadow">
              <div class="d-flex align-items-center gap-3">
                <div class="p-2 bg-warning bg-opacity-10 rounded-circle text-warning">
                  <i class="bi bi-chat-dots-fill fs-5"></i>
                </div>
                <div class="text-start">
                  <span class="fw-semibold d-block text-sm">Send SMS Broadcast</span>
                  <small class="text-muted text-xs">Notify targeted member groups</small>
                </div>
              </div>
              <i class="bi bi-chevron-right text-muted"></i>
            </NuxtLink>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.text-xs {
  font-size: 0.775rem;
}
.text-sm {
  font-size: 0.875rem;
}
.hover-shadow {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.hover-shadow:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
</style>



