# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sinoman SuperApp - A multi-tenant cooperative management system built with Next.js 15, TypeScript, Supabase, and Tailwind CSS. The application supports multiple cooperatives (koperasi) with features including member management, savings accounts, e-commerce, waste bank, financial services, and fitness challenges.

## Development Commands

```bash
# Start development server with Turbopack
npm run dev

# Build for production with Turbopack
npm run build

# Start production server
npm run start

# Run ESLint
npm run lint

# TypeScript type checking (no dedicated script, use directly)
npx tsc --noEmit
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.5.2 with App Router and Turbopack
- **Language**: TypeScript with strict mode enabled
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth with middleware protection
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI Components**: Radix UI primitives with custom components
- **Forms**: React Hook Form with Zod validation

### Directory Structure

- `/app` - Next.js App Router pages and layouts
  - `/(auth)` - Authentication pages (login, register) with dedicated layout
  - Protected routes handled via middleware
- `/components` - Reusable React components
  - `/auth` - Authentication-specific components
- `/lib` - Core utilities and configurations
  - `/supabase` - Supabase client configurations (client, server, admin)
  - `/auth` - Server actions for authentication
- `/database` - SQL migrations and seeds
- `/types` - TypeScript type definitions
  - `database.types.ts` - Complete database schema types
- `/middleware.ts` - Auth middleware for route protection

### Key Architectural Patterns

1. **Multi-tenancy**: System supports multiple cooperatives (tenants) with isolated data
2. **Server Components by Default**: Use client components only when necessary ('use client')
3. **Server Actions**: Authentication and data mutations use Next.js server actions
4. **Type Safety**: Strict TypeScript with database types generated from schema
5. **Row Level Security**: All database operations protected by Supabase RLS policies

### Authentication Flow

- Middleware intercepts all requests and checks auth status
- Protected routes: `/dashboard`, `/profile`, `/savings`, `/waste`, `/orders`, etc.
- Admin routes: `/admin/*` require admin role
- Auth routes redirect to dashboard if already logged in
- Uses Supabase Auth with email/password authentication

### Database Schema

The application uses a comprehensive PostgreSQL schema with the following core modules:

1. **Tenant Management**: Multi-tenant support for different cooperatives
2. **Member Management**: Member profiles, roles, and status tracking
3. **Savings Module**: Multiple savings types (pokok, wajib, sukarela) with transaction history
4. **E-Commerce Module**: Products, orders, shopping cart functionality
5. **Waste Bank Module**: Waste collection and recycling point system
6. **Financial Services**: Loans, installments, and financial products
7. **Fitness Challenge**: Activity tracking and rewards system
8. **Notification System**: Real-time notifications for members

### Supabase Configuration

- Client-side: `lib/supabase/client.ts` - Browser operations with auth
- Server-side: `lib/supabase/server.ts` - Server component operations
- Admin: `lib/supabase/admin.ts` - Administrative operations with service role

### Form Handling

- Use React Hook Form for all forms
- Zod schemas for validation (see `lib/auth/actions.ts` for examples)
- Server actions for form submissions
- useFormState and useFormStatus for optimistic UI updates

### Real-time Features

The app supports real-time subscriptions for:
- Notifications
- Savings balance updates
- Use Supabase channels for real-time data synchronization

## Important Conventions

1. **Import Aliases**: Use `@/*` for absolute imports from project root
2. **Component Naming**: PascalCase for components, kebab-case for files
3. **Server vs Client**: Minimize client components, prefer server components
4. **Error Handling**: All Supabase operations include proper error handling
5. **Type Safety**: Always use typed Supabase client with Database types
6. **Responsive Design**: Mobile-first approach with Tailwind breakpoints
7. **Loading States**: Use React Suspense boundaries and loading UI
8. **Indonesian Language**: UI text primarily in Indonesian (Bahasa Indonesia)

## Testing & Quality

Currently no test framework is configured. When adding tests:
- Consider Jest + React Testing Library for unit/integration tests
- Use Playwright for E2E testing
- Ensure all new features include appropriate test coverage

For code quality:
- Run `npm run lint` before committing
- Run `npx tsc --noEmit` for type checking
- Follow existing code patterns and conventions