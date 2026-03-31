# AGENTS.md

## Project Overview

**Crunchy Times** - A Next.js web application for managing a fried chicken shop, including sales tracking, expense management, and cash reconciliation.

## Tech Stack

- **Framework:** Next.js 15.1.11
- **Language:** TypeScript 5
- **UI:** React 18, Tailwind CSS 3, Framer Motion, Lucide React
- **Database:** Supabase (with SSR support)
- **Mobile:** Capacitor 8 (Android)
- **Other:** ExcelJS, jsPDF, Google APIs

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run backup       # Run backup script
```

## Project Structure

- `app/` - Next.js app router pages and layouts
- `components/` - Reusable React components
- `hooks/` - Custom React hooks
- `lib/` - Utility libraries and shared code
- `utils/` - Utility functions
- `types/` - TypeScript type definitions
- `scripts/` - Node.js scripts (backups, etc.)
- `sql/` - Database SQL files
- `public/` - Static assets
- `android/` - Capacitor Android project

## Conventions

- Follow existing code style and patterns
- No comments unless explicitly requested
- Run `npm run lint` before completing tasks
- Never commit changes unless explicitly asked
