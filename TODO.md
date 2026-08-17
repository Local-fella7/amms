# Executive Dashboard Rebuild — TODO

## Task
Rebuild `app/pages/index.vue` as a live, data-driven executive dashboard for AMMS.

## Steps
- [x] Analyze current dashboard and data sources
- [x] Confirm plan with user
- [x] Rebuild `app/pages/index.vue`:
  - [x] Fetch live data (members, fee-payments, notifications, locations, age-groups, fees)
  - [x] Live KPI cards (Total, Active, Revenue YTD, Overdue, Broadcasts, Compliance)
  - [x] Charts row (Revenue trend, Membership growth, Age-group donut, Members by location)
  - [x] Overdue members widget with Send Reminder action
  - [x] Recent broadcasts widget
  - [x] Real recent-registrations table
  - [x] Quick actions (Register Member, Record Fee Payment, Send Broadcast)
- [x] Verify chart.js / vue-chartjs imports & exports (Line, Bar, Doughnut confirmed)
- [x] Resolve chart options TypeScript typing (chart-specific options for line/bar/doughnut)
- [x] Fix vue/compiler-sfc syntax error (missing closing brace on doughnutOptions)
