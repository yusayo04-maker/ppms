# Copilot Instructions: PPMS for Pregnant Women

## Project Overview

**Prenatal Patient Management System (PPMS)** for the Municipality of Valladolid. A dual-role React application enabling Barangay Health Workers (BHWs) to register and refer pregnant patients, and MHO Admins to manage admissions, track labs, and coordinate maternal care across pregnancy cycles.

- **Frontend**: React 19 (TypeScript) + Vite + Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Routing**: React Router 7 with role-based protection
- **Key Dependencies**: `@tanstack/react-table`, `lucide-react`, `@supabase/supabase-js`

---

## Critical Architecture Patterns

### Dual-Role Portal Structure

**Two completely separate user roles with distinct workflows:**

- **Admin (`/admin`)**: Receives referrals → Reviews & Admits → Manages patient records (data unlocked post-admission)
- **BHW (`/bhw`)**: Searches/registers patients → Starts pregnancy cycles → Creates referrals → Receives lab overdue notifications

Each role has its own layout (`AdminLayout.tsx`, `BHWLayout.tsx`) and page set. Always import from the correct role's pages folder.

### Role-Based Route Protection (`ProtectedRoute` in App.tsx)

All protected routes check:
1. Active Supabase auth session
2. User's `user_metadata.role` matches route's `allowedRole`
3. Skip auth changes during admin account creation via `skipAuthChange` flag

Non-matching roles redirect to login. When implementing new protected routes, wrap with `<ProtectedRoute allowedRole="mho_admin" | "bhw">`.

### Pregnancy Cycle Data Model

**Multi-cycle support per patient** — preserves historical data while tracking the active cycle.

```
patients (demographics)
  ├── pregnancy_cycles (status: 'Active' | 'Completed')
  │     ├── referrals (status: 'Pending' | 'Admitted', tracked by cycle)
  │     ├── laboratories (scheduled_date, results_path → Supabase Storage)
  │     └── notes (chronological author_id, content, created_at)
  │
  └── profiles (auth.users.id → role, barangay, other metadata)
```

**Critical**: Active cycle logic flows through referral status. Referral `status='Pending'` → record read-only. Once `status='Admitted'`, record unlocks for admin edits.

### Referral & Admission Flow

1. **BHW creates referral** → `referrals` record created with `status='Pending'`
2. **Real-time trigger** → Supabase emits notification to admin dashboard
3. **Admin reviews** → Disabled form inputs while `status='Pending'`
4. **Admin clicks "Admit"** → Updates referral `status='Admitted'`, sets `admitted_at` timestamp
5. **Database mutation succeeds** → Record auto-moves from Referrals tab → Patients tab, forms unlock

Form control pattern: `disabled={referral.status === 'Pending'}`

---

## Supabase Integration & RLS Policies

### RLS Policies: CRITICALLY DISABLED IN CURRENT SCHEMA

⚠️ **Row-Level Security (RLS) is explicitly disabled** (`20240333_disable_rls_and_add_dob.sql`). All Supabase queries execute as public role without policy checks.

**Implications**:
- No client-side RLS filtering — **app must enforce access control manually**
- BHWs see only **their barangay's patients** (filter queries: `.eq('barangay', userBarangay)`)
- Admins see **all patients**
- Notifications distinguish recipients via `barangay_target` and `type` columns

Use `supabase-js` client from [lib/supabase.ts](src/lib/supabase.ts) which exports `supabase` and utility `setSkipAuthChange()`.

### Environment Variables

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Vite resolves via `import.meta.env.VITE_*`.

---

## State Management & Contexts

### NotificationContext (src/contexts/NotificationContext.tsx)

Tracks unread notification count, auto-refreshed every 30 seconds. BHWs see only `lab_overdue` notifications for their barangay.

```tsx
const { unreadCount, refreshCount } = useNotification();
// Call refreshCount() after creating notifications to sync UI
```

### ThemeContext (src/lib/ThemeContext.tsx)

Light/dark theme toggle. CSS custom properties handle theme switching (see [index.css](src/index.css) for color scheme).

**No other global state managers** (Redux, Zustand) — component state + Supabase queries used throughout.

---

## Development Workflow & Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start Vite dev server (http://localhost:5173) |
| `npm run build` | TypeScript check + Vite production build |
| `npm run lint` | ESLint validation |
| `npm run preview` | Preview production build locally |

**Build process**: `tsc -b` (type check across all tsconfig files) → `vite build`

### TypeScript Configuration

- `tsconfig.json`: Base config
- `tsconfig.app.json`: App-specific (includes src/*, excludes src/main.tsx)
- `tsconfig.node.json`: Vite config files
- `eslint.config.js`: ESLint + React rules

---

## Styling Conventions & Tailwind CSS 4

**Utility-first Tailwind CSS 4** with `@tailwindcss/vite` and `@tailwindcss/postcss` plugins.

### CSS Custom Properties (Theme Tokens)

All colors defined in [index.css](src/index.css) as CSS variables:
- `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-input`, `--bg-card`
- `--text-primary`, `--text-secondary`, `--text-tertiary`, `--text-muted`
- `--accent-blue`, `--accent-green`, `--accent-amber`, `--accent-red` (with `-bg` and `-text` variants)
- `--shadow-sm`, `--shadow-md`, `--shadow-lg`

Switch themes by adding `.dark` class to root element. Use `var(--bg-primary)` in Tailwind arbitrary values: `bg-[var(--bg-primary)]`.

### Button/Input Patterns

Refer to existing components ([AdminLayout.tsx](src/layouts/admin/AdminLayout.tsx), pages) for consistent patterns:
- Primary action: Blue accent with hover state
- Secondary input: Light gray background with border
- Disabled form state: `disabled={condition}` + opacity styling

---

## File Organization & Naming

```
src/
├── pages/          # Page components (admin/, bhw/, common/)
├── layouts/        # Layout wrappers (AdminLayout, BHWLayout)
├── components/     # Reusable UI components (TimelineView, etc.)
├── contexts/       # React Context providers (NotificationContext, ThemeContext)
├── hooks/          # Custom React hooks (currently empty, extend as needed)
├── lib/            # Utilities: supabase.ts, constants.ts, mockData.ts, ThemeContext
│   └── constants.ts → VALLADOLID_BARANGAYS array
├── assets/         # Images, fonts
└── index.css       # Global styles + theme tokens
```

**Naming**:
- Components: PascalCase (`AdminLayout.tsx`, `Patients.tsx`)
- Hooks: `useNoun` (`useNotification`)
- Type files: Interfaces inside component files or `lib/` utilities
- Routes: Lowercase paths (`/admin/patients/:id`)

---

## Component & Data Patterns

### Page Component Structure

Pages are typically **data-fetching + UI containers**:
1. `useState` for local UI state
2. `useEffect` to fetch data from Supabase on mount
3. Conditional render loading/error/data states
4. Pass data to child components

Example pattern:
```tsx
const [patients, setPatients] = useState<Patient[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  const fetchPatients = async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('barangay', userBarangay); // Manual access control
    setPatients(data || []);
    setLoading(false);
  };
  fetchPatients();
}, []);
```

### TanStack Table Integration

[TanStack React Table v8](https://tanstack.com/table/v8) used for data tables. Implement via standard patterns: columnHelper, createColumnHelper, getCore/Pagination/Sorting/Filtering managers.

### TypeScript Usage

**Strong typing mandatory**. Define interfaces for all data models:
- `Referral`, `Patient`, `PregnancyCycle`, `Laboratory`, `Note` (see mockData.ts for structure)
- Always import from Supabase response types when available
- Use `unknown` → specific type casting sparingly; prefer explicit inference

---

## Notable Implementation Details

### Admission Workflow (Most Critical)

1. **Before Admission**: Referral view form fields → `disabled={status === 'Pending'}`
2. **Admit Button Click** → Triggers Supabase update: `update(referrals).set({ status: 'Admitted', admitted_at: now() }).eq('id', referralId)`
3. **Post-Update Success** → Component fetches updated referral → Re-renders with `status='Admitted'` → Form unlocks
4. **Tab Movement** → Referrals tab query filters `WHERE status='Pending'`, Patients tab filters `status='Admitted'`

Always verify referral status before enabling edits.

### Barangay Filtering (BHW Context)

BHWs are assigned to a single barangay. Always filter queries:
```tsx
.eq('barangay', userProfile.barangay) // via NotificationContext pattern
```

Fetch user profile once at app load; cache or pass via context if needed across many pages.

### Laboratory Results Storage

Lab results stored in Supabase Storage, referenced via `laboratories.results_path` (file path string). When displaying labs:
1. Fetch `laboratories` record with `results_path`
2. Call `supabase.storage.from('lab-results').getPublicUrl(results_path)` to generate signed/public URL
3. Link or embed in UI

### Timeline/Milestone Rendering

DOH milestones (1st/2nd/3rd Trimester Contacts, Postnatal) are UI presentations mapped from:
- `pregnancy_cycles.estimated_due_date` (calculate trimester dates)
- Associated `laboratories` and `notes` dates to mark completion

See [TimelineView.tsx](src/components/TimelineView.tsx) for implementation.

---

## Data Privacy & Compliance Notes

### SMS Notifications Compliance

- SMS templates kept **minimal** per Data Privacy Act 2012
- Template: "Reminder: You have a scheduled laboratory at Valladolid MHO on [Date]"
- Avoid PII in SMS body; send detailed info via app only

### Environment Secrets

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` required for Supabase auth
- Deploy secrets securely (Vercel env vars, GitHub secrets, etc.)
- **Never commit `.env`** to version control

---

## Common Debugging Scenarios

| Issue | Likely Cause |
|-------|--------------|
| "Access denied: User role does not match" | Session user's `user_metadata.role` ≠ route's `allowedRole`. Check Supabase auth profile setup. |
| BHW sees all patients, not just barangay | Query missing `.eq('barangay', userBarangay)` filter. RLS is disabled; filtering is manual. |
| Form fields remain disabled after admit | Referral state not refetched post-update. Add `refetch()` call after mutation success. |
| Notifications not updating | NotificationContext polling interval (30s) or `refreshCount()` not called. Verify auth state active. |
| CSS theme not switching | Ensure `.dark` class added to root `<html>` element. Check `ThemeContext` implementation. |

---

## Resources & Next Steps

- **Supabase Docs**: https://supabase.com/docs
- **React Router 7**: https://reactrouter.com/
- **Tailwind CSS 4**: https://tailwindcss.com/
- **TanStack Table**: https://tanstack.com/table
- **Lucide Icons**: https://lucide.dev/

For schema details, review [supabase/migrations/](supabase/migrations/) files, especially:
- `20240320000000_initial_schema.sql` (core tables)
- `20240333_disable_rls_and_add_dob.sql` (RLS disabled — critical!)
- `20240334_lab_notifications.sql` (notification triggers)
