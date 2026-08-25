# Smart Attendance System — Master Stitch AI Prompt

> **Context**: Production-ready attendance management for educational institutions. 4 roles (Student, Faculty, Coordinator, Admin), ~20 pages, React/Vite frontend + Node/Express backend.

---

## 1. Design System Specification

### 1.1 Color Palette (Material Design 3 Tokens)

| Token | Light Value | Dark Value | Usage |
|-------|-------------|------------|-------|
| `primary` | `#004ac6` | `#b4c5ff` | Primary actions, links, active states |
| `primary-container` | `#2563eb` | `#2563eb` | Filled buttons, selected nav |
| `on-primary` | `#ffffff` | `#00174b` | Text on primary |
| `on-primary-container` | `#eeefff` | `#00174b` | Text on primary-container |
| `secondary` | `#505f76` | `#c3c6d7` | Secondary actions, outlines |
| `secondary-container` | `#d0e1fb` | `#38485d` | Chips, badges, hover backgrounds |
| `tertiary` | `#943700` | `#ffb596` | Warning states, "needs attention" |
| `tertiary-container` | `#bc4800` | `#ffb596` | Warning chips |
| `error` | `#ba1a1a` | `#ffb4ab` | Destructive actions, errors |
| `error-container` | `#ffdad6` | `#93000a` | Error chips |
| `success` | `#065F46` | `#10B981` | Approved, present, active |
| `success-container` | `#D1FAE5` | `#065F46` | Success chips |
| `surface` | `#f7f9fb` | `#2d3133` | Page background |
| `surface-bright` | `#f7f9fb` | `#2d3133` | Card backgrounds |
| `surface-container-lowest` | `#ffffff` | `#191c1e` | Elevated cards, modals |
| `surface-container-low` | `#f2f4f6` | `#232628` | Input backgrounds |
| `surface-container` | `#eceef0` | `#2d3133` | Table headers, subtle separators |
| `surface-container-high` | `#e6e8ea` | `#383c3e` | Hover states |
| `surface-container-highest` | `#e0e3e5` | `#434655` | Disabled, borders |
| `surface-variant` | `#e0e3e5` | `#434655` | Borders, dividers |
| `outline` | `#737686` | `#c3c6d7` | Input borders, secondary text |
| `outline-variant` | `#c3c6d7` | `#737686` | Subtle borders |
| `background` | `#f7f9fb` | `#191c1e` | Page root |
| `on-background` | `#191c1e` | `#eff1f3` | Primary text |
| `on-surface` | `#191c1e` | `#eff1f3` | Primary text on cards |
| `on-surface-variant` | `#434655` | `#c3c6d7` | Secondary text, labels |
| `on-tertiary-container` | `#ffede6` | `#360f00` | Text on warning |
| `on-error-container` | `#93000a` | `#ffede6` | Text on error |

### 1.2 Typography Scale

| Style | Font Size | Line Height | Weight | Letter Spacing |
|-------|-----------|-------------|--------|----------------|
| `display` | 36px | 44px | 700 | -0.02em |
| `headline-lg` | 28px | 36px | 600 | -0.01em |
| `headline-lg-mobile` | 24px | 32px | 600 | — |
| `title-md` | 20px | 28px | 600 | — |
| `body-lg` | 16px | 24px | 400 | — |
| `body-md` | 14px | 20px | 400 | — |
| `label-sm` | 12px | 16px | 500 | 0.02em |
| `caption` | 11px | 14px | 400 | — |

Font Family: **Inter** (400, 500, 600, 700, 900)

### 1.3 Spacing Scale (4px base unit)

| Token | Value |
|-------|-------|
| `xs` | 4px |
| `sm` | 8px |
| `md` | 16px |
| `lg` | 24px |
| `xl` | 32px |
| `gutter` | 16px |
| `margin-mobile` | 16px |
| `margin-desktop` | 32px |

### 1.4 Border Radius

| Token | Value |
|-------|-------|
| `DEFAULT` | 2px (0.125rem) |
| `lg` | 4px (0.25rem) |
| `xl` | 8px (0.5rem) |
| `full` | 12px (0.75rem) |
| `pill` | 9999px (for buttons, chips, avatars) |

### 1.5 Shadows

| Level | Value |
|-------|-------|
| `card` | `0px 1px 3px rgba(0,0,0,0.1)` |
| `modal` | `0px 10px 15px -3px rgba(0,0,0,0.1)` |
| `elevated` | `0px 4px 6px -1px rgba(0,0,0,0.1), 0px 2px 4px -1px rgba(0,0,0,0.06)` |

### 1.6 Component Inventory

| Component | Variants | Key Props |
|-----------|----------|-----------|
| **Button** | primary, secondary, ghost, danger, outlined | size (sm/md/lg), loading, disabled, icon |
| **IconButton** | — | aria-label, size |
| **Card** | elevated, outlined, filled | padding, hoverable |
| **StatCard** | — | icon, value, label, trend, color |
| **Table** | — | columns, data, pagination, sorting, rowSelection, emptyState |
| **Badge/Chip** | success, warning, danger, info, neutral, outline | size, icon, dismissible |
| **ProgressRing** | — | percentage, size, strokeWidth, color |
| **Input** | text, email, password, number, search | label, error, helperText, icon, required |
| **Select** | native, searchable | options, placeholder, error |
| **DatePicker** | single, range | min, max, format |
| **Textarea** | — | rows, maxLength, error |
| **FileUpload** | dropzone, button | accept, maxSize, multiple |
| **Avatar** | image, fallback(initials), size | src, alt, size |
| **Chip** | filter, status, action | icon, onDismiss, selected |
| **Modal** | default, fullscreen, bottom-sheet | size, forceClose, onClose |
| **Sidebar** | permanent, collapsible, drawer | items, activeItem, onNavigate |
| **TopAppBar** | centered, search, actions | title, actions, navigationIcon |
| **Tabs** | underline, enclosed | tabs, activeTab, onChange |
| **Toast** | success, error, warning, info | duration, action, onDismiss |
| **Skeleton** | card, table, text, circular | variant, height |
| **EmptyState** | — | icon, title, message, action |
| **Pagination** | — | page, totalPages, onPageChange, onLimitChange |
| **SearchInput** | — | value, onChange, loading, placeholder |
| **FAB** | primary, extended | icon, label, onClick |
| **DropdownMenu** | — | items, trigger, anchor |
| **Checkbox** | — | indeterminate, disabled |
| **RadioGroup** | — | options, value, onChange |
| **RatingStars** | — | value, max, onChange, size |
| **ConicProgress** | — | percentage, size, colorMap |

---

## 2. MD3 → CSS Variable Mapping Table

Use this table when implementing in your React app (`variables.css`, `dark-theme.css`):

| MD3 Token | CSS Variable (Light) | CSS Variable (Dark) |
|-----------|---------------------|---------------------|
| `primary` | `--primary: #004ac6` | `--primary: #b4c5ff` |
| `primary-container` | `--primary-container: #2563eb` | `--primary-container: #2563eb` |
| `on-primary` | `--on-primary: #ffffff` | `--on-primary: #00174b` |
| `on-primary-container` | `--on-primary-container: #eeefff` | `--on-primary-container: #00174b` |
| `secondary` | `--secondary: #505f76` | `--secondary: #c3c6d7` |
| `secondary-container` | `--secondary-container: #d0e1fb` | `--secondary-container: #38485d` |
| `tertiary` | `--tertiary: #943700` | `--tertiary: #ffb596` |
| `tertiary-container` | `--tertiary-container: #bc4800` | `--tertiary-container: #ffb596` |
| `error` | `--error: #ba1a1a` | `--error: #ffb4ab` |
| `error-container` | `--error-container: #ffdad6` | `--error-container: #93000a` |
| `success` | `--success: #065F46` | `--success: #10B981` |
| `success-container` | `--success-container: #D1FAE5` | `--success-container: #065F46` |
| `surface` | `--surface: #f7f9fb` | `--surface: #2d3133` |
| `surface-bright` | `--surface-bright: #f7f9fb` | `--surface-bright: #2d3133` |
| `surface-container-lowest` | `--surface-container-lowest: #ffffff` | `--surface-container-lowest: #191c1e` |
| `surface-container-low` | `--surface-container-low: #f2f4f6` | `--surface-container-low: #232628` |
| `surface-container` | `--surface-container: #eceef0` | `--surface-container: #2d3133` |
| `surface-container-high` | `--surface-container-high: #e6e8ea` | `--surface-container-high: #383c3e` |
| `surface-container-highest` | `--surface-container-highest: #e0e3e5` | `--surface-container-highest: #434655` |
| `surface-variant` | `--surface-variant: #e0e3e5` | `--surface-variant: #434655` |
| `outline` | `--outline: #737686` | `--outline: #c3c6d7` |
| `outline-variant` | `--outline-variant: #c3c6d7` | `--outline-variant: #737686` |
| `background` | `--background: #f7f9fb` | `--background: #191c1e` |
| `on-background` | `--on-background: #191c1e` | `--on-background: #eff1f3` |
| `on-surface` | `--on-surface: #191c1e` | `--on-surface: #eff1f3` |
| `on-surface-variant` | `--on-surface-variant: #434655` | `--on-surface-variant: #c3c6d7` |

**Typography CSS Variables:**
```css
--font-family: 'Inter', sans-serif;
--font-size-display: 36px; --line-height-display: 44px; --font-weight-display: 700;
--font-size-headline-lg: 28px; --line-height-headline-lg: 36px; --font-weight-headline-lg: 600;
--font-size-title-md: 20px; --line-height-title-md: 28px; --font-weight-title-md: 600;
--font-size-body-lg: 16px; --line-height-body-lg: 24px; --font-weight-body-lg: 400;
--font-size-body-md: 14px; --line-height-body-md: 20px; --font-weight-body-md: 400;
--font-size-label-sm: 12px; --line-height-label-sm: 16px; --font-weight-label-sm: 500;
--font-size-caption: 11px; --line-height-caption: 14px; --font-weight-caption: 400;
```

**Spacing CSS Variables:**
```css
--space-xs: 4px; --space-sm: 8px; --space-md: 16px; --space-lg: 24px; --space-xl: 32px;
--space-gutter: 16px; --margin-mobile: 16px; --margin-desktop: 32px;
```

**Radius CSS Variables:**
```css
--radius-sm: 2px; --radius-md: 4px; --radius-lg: 8px; --radius-xl: 12px; --radius-pill: 9999px;
```

---

## 3. Page Specifications

### 3.1 Public Pages

#### **Landing Page** (`/`)
- **Hero**: Headline "Institutional Attendance, Automated", subtext, 3 CTAs (Faculty/Student/Admin)
- **Floating stat card**: Live preview of QR session (subject, percentage)
- **Footer**: Copyright
- **Responsive**: Stack on mobile, side-by-side on desktop

#### **Login Page** (`/login`)
- **Layout**: Centered card (max-width 400px)
- **Form**: Email, Password, Remember me, Forgot password link
- **Actions**: Submit (primary), Register links (Faculty/Student)
- **States**: Loading, error toast, validation inline

#### **Faculty Register** (`/register/faculty`)
- **Cascading Selects**: Branch → Class → Subject (multi-select)
- **Fields**: Name, Email, Password, Confirm Password, Branch, Class, Section, Subjects[]
- **Validation**: Real-time, password strength, email format

#### **Student Register** (`/register/student`)
- Same cascading selects, single subject enrollment

#### **Forgot Password** (`/forgot-password`)
- Email input → Send reset link → Success state with timer

#### **Reset Password** (`/reset-password/:token`)
- New password, confirm password → Submit → Redirect to login

---

### 3.2 Student Pages (Protected, `role: student`)

#### **Student Dashboard** (`/student/dashboard`)
- **Header**: Welcome name, branch/class/section
- **Stats Grid (4 cards)**: Total Classes, Present, Absent, Overall % (color-coded: ≥75% green, ≥60% yellow, <60% red)
- **Quick Actions (4 buttons)**: Scan QR (camera), Upload Screenshot, My Attendance, Check Eligibility
- **Subject Mini Table**: Subject, Present, Total, % with badge
- **QR Upload Modal**: Hidden canvas reader, drag-drop image, shows result toast

#### **Scan Attendance Page** (`/student/scan`)
- **Full-screen camera view**: Simulated feed background, scanner reticle (animated line), corner brackets
- **Bottom FAB**: "Upload Screenshot" (image upload fallback)
- **Validation Overlay**: Verifying → Success/Error → Auto-dismiss → Redirect to dashboard
- **Instructions**: Permission, lighting, steady hold, single scan per session

#### **My Attendance** (`/student/my-attendance`)
- **Filters**: Subject (text), Start Date, End Date, Export CSV button
- **Table**: Date, Subject (badge), Status (Present=green, Absent=red, Excused=amber)
- **Pagination**: 10/20/50, page navigation
- **Empty State**: "No attendance records yet"

#### **Stats View** (`/student/stats`)
- **Summary Cards (4)**: Total, Present, Absent, Overall %
- **Subject Cards Grid**: Each = Subject name + Conic Progress Ring (percentage) + P/A/T counts
- **Progress Ring**: Conic gradient, color by threshold (green/yellow/red), accessible aria

#### **Eligibility View** (`/student/eligibility`)
- **Banner**: Warning (red) if any subject <75%, Success (green) if all eligible
- **Overall Card**: Percentage, Present/Total, Classes needed for 75%
- **Subject List**: Each = Subject, Current %, Present/Total, Needed for 75%, status badge

#### **Apply Leave** (`/student/apply-leave`)
- **Form**: Start Date, End Date (validation: start ≤ end), Reason Category (select), Explanation (textarea), Document Upload (optional)
- **Submit**: Primary button, loading state, redirect to My Leaves

#### **My Leaves** (`/student/my-leaves`)
- **Header**: "My Leaves" + "Apply Leave" button
- **Table**: Start Date, End Date, Reason, Status (Pending=amber, Approved=green, Rejected=red), Reviewed By
- **Pagination**

---

### 3.3 Faculty Pages (Protected, `roles: faculty, coordinator, admin`)

#### **Faculty Dashboard** (`/faculty/dashboard`)
- **Header**: Welcome, branch/class/section
- **Stats Grid (3 cards)**: Total Students, Classes Taken, Defaulters Count (red badge)
- **Quick Actions (3)**: QR Attendance, Manual Attendance, View Defaulters
- **Active QR Sessions Table**: Subject, Date/Time, Scan Count (live), Status (Active=green pulse, Ended=gray), View Action
- **Side Widget**: QR Generator preview + Today's Schedule (2 items with colored dots)

#### **QR Generator** (`/faculty/qr-generator`)
- **Form**: Subject (select from user.subjects), Date (date picker, max today), Generate button
- **Generated QR Card**: Large QR code (sessionToken + subject + date), Session Token (copyable), Session Info (subject, date, branch, class, section), "View Live Session" button
- **Active Sessions Table**: Subject, Date, Class, Scans, Status, View Action

#### **QR Session View** (`/faculty/qr-session/:token`) — **Real-time (10s poll)**
- **Header**: Subject, date/class/section, Copy Token, End Session (if active)
- **QR Display**: Large live QR code, session info panel
- **Scanned Students Table**: #, Name, Email, Scanned At (time), Current Status (Present-QR=green), Actions (Mark Absent, Mark Excused) — idempotent updates
- **Empty State**: "No scans yet"
- **Live Indicator**: "Live updating every 10s" badge

#### **Mark Attendance** (`/faculty/mark-attendance`)
- **Filters**: Subject, Date
- **Bulk Table**: Student list with radio buttons (Present/Absent/Excused), Select All, Submit
- **Idempotency**: Header `Idempotency-Key` per submission

#### **Defaulters** (`/faculty/defaulters`)
- **Filters**: Subject (select), Search (name/email), Threshold (75%/60%)
- **Table**: Checkbox, Name, Email, Subject (multi-row per student), Present, Total, % (conic ring + badge), Classes Needed
- **Bulk Actions**: Select rows → "Send Alert (N)" → Confirm modal → Toast with sent/failed counts
- **Pagination**

#### **Feedback History** (`/faculty/feedback-history`)
- **Filters**: Subject, Start Date, End Date
- **Table**: Date, Subject, Topic, Rating (★★★★☆), Students Present, Remarks
- **Pagination**

#### **Feedback Modal** (triggered after attendance marking)
- **Fields**: Topic Covered (required, max 200), Remarks (optional, max 500), Rating (5 stars, required), Students Present (number)
- **Actions**: Submit, Skip (with reason input)
- **Forced**: Non-dismissible until submit/skip

#### **Leave Requests** (`/faculty/leave-requests`)
- **Tabs**: Pending / All
- **Table**: Student, Email, Start, End, Reason, Status, Actions (Approve/Reject for pending)
- **Pagination**

---

### 3.4 Coordinator Pages (Protected, `roles: coordinator, admin`)

#### **Coordinator Dashboard** (`/coordinator/dashboard`)
- **Shared Faculty Dashboard** (same stats, actions)
- **Additional Nav**: Teachers, Students, Class Feedback, Leave Approvals

#### **Teachers View** (`/coordinator/teachers`)
- **Searchable Table**: Name, Email, Subject, Classes This Week, Last Active, Status

#### **Students View** (`/coordinator/students`)
- **Searchable Table**: Name, Email, Branch, Class, Section
- **Pagination**

#### **Class Feedback** (`/coordinator/feedback`)
- **Filters**: Subject, Date Range
- **Table**: Date, Faculty, Subject, Topic, Rating, Students Present, Remarks
- **Pagination**

#### **Leave Approvals** (`/coordinator/leave-requests`)
- Same as Faculty Leave Requests but for coordinator's assigned students

---

### 3.5 Admin Pages (Protected, `role: admin`)

#### **Admin Dashboard** (`/admin/dashboard`)
- **Stats Grid (7 cards)**: Total Users, Students, Faculty, Branches, Attendance Records, Feedbacks, Pending Leaves (red if >0)
- **No tables** — pure overview

#### **User Management** (`/admin/users`)
- **Header**: "User Management" + "Add User" button
- **Stats Row (3 cards)**: Total Users (with trend), Active Now, Pending Approvals
- **Controls**: Search (name/email/ID), Role Filter, Status Filter, Filter Button
- **Table**: User (avatar + name + email), Role, Branch/Dept, Status (Active=green, Inactive=gray), Actions (Edit, Block/Activate)
- **Pagination**: Simple prev/next

#### **Branch Management** (via API, UI in registration cascading selects)
- **Endpoints**: GET `/api/v1/branches`, `/:name/classes`, `/:name/classes/:className/subjects`

---

## 4. Interaction & State Specifications

### 4.1 Real-time Patterns
| Feature | Polling Interval | Implementation |
|---------|------------------|----------------|
| QR Session Live Scans | 10 seconds | `usePolling(fetchSession, 10000)` |
| Student Dashboard Stats | 30 seconds | `usePolling(fetchStats, 30000)` |
| Eligibility | 30 seconds | `usePolling(fetchEligibility, 30000)` |
| My Attendance | 30 seconds (silent) | `usePolling(() => fetchAttendance(true), 30000)` |

### 4.2 Modal Flows
| Modal | Trigger | Forced? | Key Interactions |
|-------|---------|---------|------------------|
| Feedback | After attendance submit | Yes | Star rating, skip with reason |
| QR Upload | Dashboard "Upload Screenshot" | No | File input → canvas scan → API → toast |
| End Session | QR Session View "End Session" | No | Confirm → API → redirect |
| Send Alerts | Defaulters "Send Email Alerts" | No | Checkbox selection → Confirm → Toast |
| Leave Review | Leave Requests Approve/Reject | No | PATCH → refetch |

### 4.3 Form Validation Patterns
- **Inline errors**: Below field, red text, `aria-invalid`, `aria-describedby`
- **Submit blocking**: Disabled until valid
- **Toast on submit**: Success/error/warning
- **Redirect on success**: To list/view page

### 4.4 Table Conventions
- **Hover**: `bg-surface-container-low`
- **Row selection**: Checkbox column, "Select All" in header
- **Empty state**: Centered icon + title + message + optional action
- **Loading**: Skeleton rows (3-5)
- **Pagination**: Bottom, page size selector (10/20/50)

### 4.5 Status Badge Color Map
| Status | BG Color | Text Color | Icon |
|--------|----------|------------|------|
| Present / Active / Approved / Safe | `success-container` | `success` | `check_circle` |
| Absent / Rejected / Critical / Ended | `error-container` | `error` | `cancel` |
| Excused / Pending / Warning / On Track | `tertiary-container` / `secondary-container` | `tertiary` / `secondary` | `event_busy` / `pending` / `schedule` |
| Inactive | `surface-variant` | `on-surface-variant` | — |

---

## 5. Layout Architecture

### 5.1 App Shell (All Protected Pages)
```
<ThemeProvider>
  <AuthProvider>
    <ToastProvider>
      <Router>
        <OfflineBanner />
        <Sidebar />          {/* Permanent desktop, drawer mobile */}
        <main>
          <TopAppBar />      {/* Sticky, search, actions, profile */}
          <PageContent />    {/* Max-width 1200px, padded */}
        </main>
      </Router>
    </ToastProvider>
  </AuthProvider>
</ThemeProvider>
```

### 5.2 Sidebar Navigation by Role
| Role | Links |
|------|-------|
| Student | Dashboard, My Attendance, Stats, Eligibility, Apply Leave, My Leaves |
| Faculty | Dashboard, Mark Attendance, Defaulters, Feedback, Leave Requests, QR Generator |
| Coordinator | Dashboard, Mark Attendance, Defaulters, Feedback, Leave Requests, Teachers, Students, Class Feedback, QR Generator |
| Admin | Dashboard, Users |

### 5.3 TopAppBar Elements
- **Mobile**: Menu button, Title
- **Desktop**: Search (Admin/Coordinator), Nav tabs (Overview/History/Analytics), Actions (Create Session, Export), Notifications, Dark Mode, Profile Avatar

### 5.4 Responsive Breakpoints
- **Mobile** (< 768px): Sidebar drawer, stacked cards, horizontal table scroll, FAB for primary action
- **Tablet** (768px–1024px): Collapsible sidebar, 2-col grids
- **Desktop** (> 1024px): Permanent sidebar, 3-4 col grids, full tables

---

## 6. Accessibility Requirements
- Semantic HTML (`header`, `nav`, `main`, `table`, `form`, `button`)
- ARIA labels on icon buttons, live regions for toasts/polls
- Focus visible outlines (2px primary, offset 2px)
- Color contrast ≥ 4.5:1 (WCAG AA)
- Keyboard navigation: Tab order, Escape closes modals, Arrow keys in menus
- Screen reader announcements for dynamic updates (scan count, toast)

---

## 7. API Contract Reference (for Stitch Context)

All routes prefixed `/api/v1`:

```
Auth:       POST /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/me, /auth/forgot-password, /auth/reset-password/:token
Student:    GET /student/my-attendance, /student/stats, /student/eligibility, POST /student/scan
Faculty:    GET /faculty/dashboard-stats, /faculty/students, /faculty/attendance/:date/:subject, /faculty/defaulters, /faculty/feedback-history, /faculty/qr/active, /faculty/qr/:token
            POST /faculty/attendance, /faculty/notify-defaulters, /faculty/feedback, /faculty/qr/generate, /faculty/qr/:token/end
QR (Student): POST /qr/scan
Leave:      POST /leave/apply, GET /leave/my-leaves, /leave/pending, /leave/all, PATCH /leave/:id/review
Coordinator: GET /coordinator/students, /coordinator/teachers, /coordinator/feedback
Admin:      GET /admin/dashboard-stats, /admin/users, /admin/branches, PATCH /admin/users/:id/status
Branch:     GET /branch/, /:name/classes, /:name/classes/:className/subjects
```

---

## 8. Stitch Generation Instructions

**Generate a complete design system + all 20 pages as static HTML/CSS (Tailwind CDN + MD3 tokens) with:**
1. Design system page showing all tokens, components, states
2. Each page as separate HTML file with realistic mock data
3. Consistent layout shell (Sidebar + TopAppBar) across protected pages
4. All interactive states visible: loading, empty, error, success, hover, focus, disabled
5. Realistic data matching the specifications above
6. Mobile + desktop views for each page
7. Light mode only (dark mode implemented in React phase)

**Output format**: Organized folder structure with `index.html` (landing), `auth/`, `student/`, `faculty/`, `coordinator/`, `admin/`, `components/` (shared), `design-system.html`

---

## 9. Appendix: Key UI Patterns from Prototypes

### Conic Progress Ring (CSS-only)
```css
.conic-gradient-present  { background: conic-gradient(var(--primary) 0% 75%, var(--surface-variant) 75% 100%); }
.conic-gradient-warning  { background: conic-gradient(var(--tertiary) 0% 68%, var(--surface-variant) 68% 100%); }
.conic-gradient-danger   { background: conic-gradient(var(--error) 0% 55%, var(--surface-variant) 55% 100%); }
.conic-gradient-excellent { background: conic-gradient(var(--success) 0% 92%, var(--surface-variant) 92% 100%); }

.mask-inner {
  mask: radial-gradient(transparent 55%, black 56%);
  -webkit-mask: radial-gradient(transparent 55%, black 56%);
}
```

### Scanner Reticle (CSS Animation)
```css
.scanner-frame::before, .scanner-frame::after { /* corner brackets */ }
.scanning-line {
  height: 2px; background: var(--primary);
  box-shadow: 0 0 8px rgba(0, 74, 198, 0.8);
  animation: scan 2s infinite ease-in-out;
}
@keyframes scan { 0% { top: 10%; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { top: 90%; opacity: 0; } }
```

### Glass Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.3);
}
```

---

**End of Master Prompt** — Use this as the single source of truth for Stitch AI generation.