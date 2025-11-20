# CRM Layout System Documentation

## Overview

The Layout system provides a Linear.app-inspired dark theme CRM interface with a fixed sidebar, topbar, and responsive main content area.

## Components

### Layout
The main wrapper component that includes Sidebar and Topbar.

\`\`\`tsx
import { Layout } from "@/components/crm/layout"

export default function Page() {
  return (
    <Layout>
      <div className="col-span-12">
        {/* Your content uses grid column spans */}
        {/* col-span-12 = full width */}
        {/* col-span-6 = half width on desktop */}
      </div>
    </Layout>
  )
}
\`\`\`

### Sidebar
Fixed left navigation with menu items.

**Navigation items:**
- Dashboard
- Deals
- Tasks
- Analytics
- Logs
- Import/Export
- Users
- Settings

### Topbar
Fixed top bar with search, notifications, and user menu.

**Features:**
- Global search with ⌘K shortcut indicator
- Notifications dropdown with badge
- User avatar dropdown menu

## Grid System

The Layout component provides a 12-column grid with 24px gutters:

\`\`\`tsx
<Layout>
  {/* Full width */}
  <div className="col-span-12">...</div>
  
  {/* Two columns */}
  <div className="col-span-6">Left column</div>
  <div className="col-span-6">Right column</div>
  
  {/* Responsive: full on mobile, half on desktop */}
  <div className="col-span-12 lg:col-span-6">...</div>
</Layout>
\`\`\`

## Dark Theme Configuration

### Tailwind CSS Variables

The dark theme uses Linear-inspired color tokens defined in `app/globals.css`:

\`\`\`css
:root {
  /* Background colors - deep slate */
  --background: oklch(0.12 0.01 264);        /* Main background */
  --card: oklch(0.15 0.01 264);              /* Card surfaces */
  --sidebar: oklch(0.10 0.01 264);           /* Sidebar background */
  
  /* Text colors */
  --foreground: oklch(0.94 0.01 264);        /* Primary text */
  --muted-foreground: oklch(0.56 0.01 264);  /* Secondary text */
  
  /* Border colors - subtle */
  --border: oklch(0.24 0.01 264);            /* Dividers, borders */
  
  /* Accent color - blue */
  --primary: oklch(0.60 0.18 264);           /* Primary actions */
  --accent: oklch(0.60 0.18 264);            /* Highlights */
}
\`\`\`

### Color Palette

**Neutrals (3 colors):**
- Background: `oklch(0.12 0.01 264)` - Deep slate base
- Card: `oklch(0.15 0.01 264)` - Elevated surfaces
- Sidebar: `oklch(0.10 0.01 264)` - Navigation panel

**Accent (1 color):**
- Primary/Accent: `oklch(0.60 0.18 264)` - Subtle blue for actions and highlights

**Text (2 levels):**
- Foreground: `oklch(0.94 0.01 264)` - High contrast text
- Muted: `oklch(0.56 0.01 264)` - Lower contrast text

### Spacing Scale

Following Linear's precise spacing (8/12/16px scale):

\`\`\`tsx
// Use Tailwind spacing utilities
gap-2    // 8px
gap-3    // 12px
gap-4    // 16px
gap-6    // 24px

p-2      // 8px padding
p-3      // 12px padding
p-4      // 16px padding
p-6      // 24px padding
\`\`\`

### Typography

Using Geist font family for mono-size aesthetic:

\`\`\`tsx
// Body text
className="text-sm"           // 14px - standard body
className="text-xs"           // 12px - captions

// Headings
className="text-2xl"          // 24px - page titles
className="text-sm font-semibold"  // 14px - section titles
\`\`\`

### Borders & Shadows

Following Linear's minimal approach:

\`\`\`tsx
// Use thin borders instead of shadows
className="border border-border/50"

// No box shadows - rely on subtle background differences
// Surface elevation through background color, not shadow
\`\`\`

### ARIA & Semantic HTML

All components include proper accessibility:

\`\`\`tsx
// Semantic landmarks
<aside role="navigation" aria-label="Main navigation">
<header role="banner">
<main role="main">

// ARIA labels
aria-label="Search"
aria-current="page"
aria-label="Notifications (3 unread)"

// Proper heading hierarchy
<h1> for page titles
<h2> for major sections
\`\`\`

## Usage Examples

### Basic Page

\`\`\`tsx
import { Layout } from "@/components/crm/layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MyPage() {
  return (
    <Layout>
      <div className="col-span-12 space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Page Title</h1>
        
        <Card className="border-border/50 bg-card">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Section</CardTitle>
          </CardHeader>
          <CardContent>
            Content here
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
\`\`\`

### Two-Column Layout

\`\`\`tsx
<Layout>
  <div className="col-span-12 lg:col-span-8 space-y-6">
    {/* Main content */}
  </div>
  <div className="col-span-12 lg:col-span-4">
    {/* Sidebar content */}
  </div>
</Layout>
\`\`\`

## Design Principles

1. **Minimal shadows** - Use thin borders (`border-border/50`) for separation
2. **Consistent spacing** - Stick to 8/12/16/24px scale
3. **Mono-size typography** - Limited font sizes for clean hierarchy
4. **High contrast text** - Ensure readability on dark backgrounds
5. **Single accent color** - Blue for all interactive elements
6. **Semantic HTML** - Proper landmarks and ARIA attributes
