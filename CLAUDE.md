# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a modern bookmark management platform called "Sinan Website" built with Vue 3 + TypeScript. The application helps users organize and manage bookmarks through spaces, tags, and team collaboration features.

## Development Commands

- **Install dependencies**: `pnpm install`
- **Development server**: `pnpm dev` (runs on port 80, accessible at http://localhost:80)
- **Build for production**: `pnpm build` (runs TypeScript compilation then Vite build)
- **Preview production build**: `pnpm preview`

## Architecture

### Tech Stack
- **Frontend**: Vue 3 with Composition API, TypeScript
- **Build Tool**: Vite with Vue plugin
- **Styling**: Tailwind CSS 4.x with Vite plugin
- **UI Components**: Reka UI component library
- **State Management**: VueUse composables
- **Routing**: Vue Router 4
- **Data Tables**: TanStack Vue Table
- **HTTP Client**: Axios with custom wrapper
- **Icons**: Lucide Vue Next
- **Drag & Drop**: VueDraggable

### Project Structure

```
src/
├── components/
│   ├── Authentication/    # Login, register, password reset forms
│   ├── Base/             # Base components like Icon, IconPicker
│   ├── Bookmark/         # Bookmark management components (Add, Edit, Space/Tag selectors)
│   ├── Sidebar/          # Navigation sidebar components
│   └── ui/               # Reka UI component library components
├── pages/
│   ├── dashboard/        # Main dashboard pages (Home, Bookmarks, Space, Tag views)
│   ├── login/            # Authentication pages
│   ├── github-callback/  # OAuth callback handler
│   └── reset-password/   # Password reset flow
├── services/             # API service classes (BookmarkAPI, SpaceAPI, TagAPI, etc.)
├── types/               # TypeScript type definitions for API responses
├── lib/                 # Core utilities (HTTP client, crypto, utils)
├── utils/               # Helper functions (favicon, eventBus)
├── composables/         # Vue composables (useDarkMode, useDynamicIcon, etc.)
└── router.ts            # Vue Router configuration
```

### Key Architectural Patterns

1. **API Layer**: All API calls are organized into service classes in `src/services/api.ts`:
   - `BookmarkAPI`: Bookmark CRUD operations, search, imports
   - `SpaceAPI`: Space management and sorting
   - `TagAPI`: Tag management and statistics
   - `UserAPI`: Authentication, user management, password operations
   - `ShareAPI`: Space sharing and collection features
   - `WebsiteAnalysisAPI`: AI-powered website analysis with streaming responses

2. **HTTP Client**: Custom HTTP wrapper in `src/lib/http.ts` handles authentication, file uploads/downloads, and error handling.

3. **Routing**: Main dashboard layout with nested routes for different views (home, bookmarks, spaces, tags).

4. **Component Architecture**:
   - Feature-based organization (Authentication, Bookmark, Sidebar)
   - Reka UI components in `src/components/ui/` for consistent design system
   - Composables for reusable logic (dark mode, dynamic icons, favicon fetching)

### API Integration

- Backend API runs on `http://127.0.0.1:8080` with `/api` proxy in Vite config
- Authentication via JWT tokens stored in HTTP client
- Supports file uploads for bookmark icons and user avatars
- Real-time streaming responses for AI website analysis using Server-Sent Events

### Development Notes

- Server runs on port 80 with host `0.0.0.0` for container deployment
- TypeScript compilation is part of build process (`vue-tsc -b && vite build`)
- Dark mode is implemented with CSS classes and persisted in localStorage
- The application supports both password and Passkey authentication
- Bookmark management includes advanced features like Chrome import, duplicate detection, and AI-powered categorization