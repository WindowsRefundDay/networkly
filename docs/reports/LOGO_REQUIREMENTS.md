# Logo & Asset Requirements for Networkly

## Overview
This document lists all logo variants, icons, and placeholder images needed to replace current placeholders throughout the application. All assets should support both light and dark modes.

---

## 1. BRAND LOGO VARIANTS

### 1.1 Primary Brand Mark (Symbol/Icon Only)
**Used in:**
- Sidebar logo (collapsed & expanded states)
- Favicon
- App icons
- Small badges/watermarks

**Sizes needed:**
- `16x16` (favicon)
- `32x32` (favicon, small UI)
- `48x48` (favicon)
- `64x64` (sidebar collapsed)
- `128x128` (sidebar expanded, high-res)

**Variants:**
- `logo-mark-light.svg` - For light backgrounds
- `logo-mark-dark.svg` - For dark backgrounds
- `logo-mark-monochrome.svg` - Single color (for favicons)

**Current usage:** `components/sidebar.tsx:56-58` (currently using Sparkles icon)

---

### 1.2 Wordmark (Text Only)
**Used in:**
- Sidebar expanded state
- Marketing pages
- Email headers
- Documentation

**Sizes needed:**
- `logo-wordmark-light.svg` - For light backgrounds
- `logo-wordmark-dark.svg` - For dark backgrounds
- `logo-wordmark-horizontal.svg` - Default horizontal layout
- `logo-wordmark-stacked.svg` - Vertical/stacked layout

**Current usage:** `components/sidebar.tsx:59` (currently text "Networkly")

---

### 1.3 Logo Lockup (Symbol + Wordmark)
**Used in:**
- Header/navigation bars
- Login/signup pages
- Email footers
- Marketing materials

**Variants:**
- `logo-lockup-horizontal-light.svg` - Symbol left, wordmark right
- `logo-lockup-horizontal-dark.svg` - Dark mode version
- `logo-lockup-stacked-light.svg` - Symbol above wordmark
- `logo-lockup-stacked-dark.svg` - Dark mode version

**Sizes:**
- Small: `120x40` (header)
- Medium: `200x60` (login pages)
- Large: `300x90` (marketing)

---

## 2. FAVICON & APP ICONS

### 2.1 Favicon Set
**Current files:** `icon-light-32x32.png`, `icon-dark-32x32.png`, `icon.svg`

**Needed:**
- `favicon.ico` - Multi-size ICO (16x16, 32x32, 48x48)
- `favicon-16.png` - 16x16 PNG
- `favicon-32.png` - 32x32 PNG
- `favicon-48.png` - 48x48 PNG
- `favicon.svg` - SVG favicon (modern browsers)
- `icon-light-32x32.png` - Light mode (already exists)
- `icon-dark-32x32.png` - Dark mode (already exists)

**Current usage:** `app/layout.tsx:17-30`

---

### 2.2 Apple Touch Icon
**Current file:** `apple-icon.png`

**Needed:**
- `apple-touch-icon.png` - 180x180 PNG (iOS)
- `apple-touch-icon-152.png` - 152x152 PNG (iPad)
- `apple-touch-icon-167.png` - 167x167 PNG (iPad Pro)

**Current usage:** `app/layout.tsx:31`

---

### 2.3 Android/Chrome PWA Icons
**Needed:**
- `icon-192.png` - 192x192 PNG (Android)
- `icon-512.png` - 512x512 PNG (Android, Chrome)
- `icon-maskable-192.png` - 192x192 maskable (Android adaptive)
- `icon-maskable-512.png` - 512x512 maskable

---

### 2.4 Safari Pinned Tab
**Needed:**
- `safari-pinned-tab.svg` - Monochrome SVG (single color)

---

## 3. USER AVATAR PLACEHOLDER

**Current file:** `placeholder.svg`, `placeholder-user.jpg`

**Used in:**
- `components/header.tsx:28` - User dropdown
- `components/sidebar.tsx:45` - Sidebar user section
- `components/profile/profile-header.tsx:36` - Profile header
- `components/network/connection-card.tsx:42` - Connection cards
- `components/dashboard/suggested-connections.tsx:22` - Suggested connections
- `components/network/messages-panel.tsx:71` - Message avatars
- `app/network/page.tsx:37` - Network page
- `app/settings/page.tsx:176` - Settings page
- `components/assistant/chat-interface.tsx:77` - Chat interface
- `components/projects/project-card.tsx:189` - Project collaborators
- `components/projects/project-detail-modal.tsx:142` - Project detail collaborators

**Needed:**
- `avatar-placeholder-light.svg` - Light mode (neutral gray person icon)
- `avatar-placeholder-dark.svg` - Dark mode
- `avatar-placeholder-round.png` - 256x256 PNG (fallback)
- `avatar-placeholder-square.png` - 256x256 PNG (for cards)

**Design notes:**
- Should be clearly distinct from company logo placeholder
- Generic person silhouette or initials circle
- Works at sizes from 24px to 128px

---

## 4. COMPANY/ORGANIZATION LOGO PLACEHOLDER

**Current file:** `placeholder-logo.png`, `placeholder-logo.svg`

**Used in:**
- `components/opportunities/opportunity-card.tsx:98` - Opportunity cards (64x64)
- `components/opportunities/opportunity-detail-panel.tsx:91` - Opportunity detail (80x80)
- `components/dashboard/opportunity-card.tsx:30` - Dashboard widget (48x48)
- `components/dashboard/curated-opportunities-widget.tsx:90` - Curated opportunities

**Needed:**
- `company-logo-placeholder-light.svg` - Light mode (building/office icon)
- `company-logo-placeholder-dark.svg` - Dark mode
- `company-logo-placeholder-square.png` - 256x256 PNG (fallback)
- `company-logo-placeholder-rectangle.png` - 512x256 PNG (wide format)

**Design notes:**
- Should be clearly distinct from user avatar
- Building, briefcase, or company icon
- Works at sizes from 48px to 128px
- Square format preferred (works in Avatar components)

---

## 5. PROJECT THUMBNAIL PLACEHOLDER

**Current file:** `placeholder.svg`, `project-thumbnail.png`

**Used in:**
- `components/projects/project-card.tsx:66` - Project cards (aspect-video, 16:9)
- `components/projects/project-detail-modal.tsx:49` - Project detail modal (96x96 square)

**Needed:**
- `project-thumbnail-placeholder-light.svg` - Light mode
- `project-thumbnail-placeholder-dark.svg` - Dark mode
- `project-thumbnail-placeholder-16x9.png` - 1920x1080 PNG (16:9 aspect)
- `project-thumbnail-placeholder-square.png` - 1024x1024 PNG (square)

**Design notes:**
- Should suggest "project" or "work"
- Folder, document, or project board icon
- Works in both 16:9 (cards) and square (modals) formats

---

## 6. EVENT IMAGE PLACEHOLDER

**Current file:** `placeholder.svg`

**Used in:**
- `app/events/page.tsx:110` - Event cards (aspect-video, 16:9)

**Needed:**
- `event-image-placeholder-light.svg` - Light mode
- `event-image-placeholder-dark.svg` - Dark mode
- `event-image-placeholder-16x9.png` - 1920x1080 PNG (16:9 aspect)

**Design notes:**
- Should suggest "event" or "gathering"
- Calendar, event, or conference icon
- 16:9 aspect ratio for cards

---

## 7. EXTRACURRICULAR/ACHIEVEMENT LOGO PLACEHOLDER

**Used in:**
- `components/profile/extracurriculars-section.tsx` - Activity cards
- `components/profile/achievements-section.tsx` - Achievement badges

**Needed:**
- `activity-logo-placeholder-light.svg` - Light mode
- `activity-logo-placeholder-dark.svg` - Dark mode
- `activity-logo-placeholder-square.png` - 256x256 PNG

**Design notes:**
- Trophy, medal, or achievement icon
- Works at 48px to 64px sizes

---

## 8. DARK MODE CONSIDERATIONS

All logo variants should have both light and dark mode versions:

### Color Strategy:
- **Light mode:** Dark logo on light background
- **Dark mode:** Light logo on dark background
- **Monochrome:** Single color version for favicons and simple contexts

### Implementation:
- Use CSS `prefers-color-scheme` media queries in SVG
- Or provide separate light/dark PNG files
- Test in both themes

---

## 9. FILE NAMING CONVENTION

```
/public/
  ├── logos/
  │   ├── logo-mark-light.svg
  │   ├── logo-mark-dark.svg
  │   ├── logo-mark-monochrome.svg
  │   ├── logo-wordmark-light.svg
  │   ├── logo-wordmark-dark.svg
  │   ├── logo-lockup-horizontal-light.svg
  │   ├── logo-lockup-horizontal-dark.svg
  │   ├── logo-lockup-stacked-light.svg
  │   └── logo-lockup-stacked-dark.svg
  ├── icons/
  │   ├── favicon.ico
  │   ├── favicon-16.png
  │   ├── favicon-32.png
  │   ├── favicon-48.png
  │   ├── favicon.svg
  │   ├── icon-light-32x32.png
  │   ├── icon-dark-32x32.png
  │   ├── apple-touch-icon.png
  │   ├── icon-192.png
  │   ├── icon-512.png
  │   └── safari-pinned-tab.svg
  └── placeholders/
      ├── avatar-placeholder-light.svg
      ├── avatar-placeholder-dark.svg
      ├── company-logo-placeholder-light.svg
      ├── company-logo-placeholder-dark.svg
      ├── project-thumbnail-placeholder-light.svg
      ├── project-thumbnail-placeholder-dark.svg
      ├── event-image-placeholder-light.svg
      ├── event-image-placeholder-dark.svg
      └── activity-logo-placeholder-light.svg
```

---

## 10. PRIORITY ORDER

### Phase 1 (Critical - Replace Immediately):
1. ✅ Brand mark (sidebar logo)
2. ✅ Favicon set
3. ✅ User avatar placeholder
4. ✅ Company logo placeholder

### Phase 2 (High Priority):
5. ✅ Wordmark
6. ✅ Logo lockup (horizontal)
7. ✅ Project thumbnail placeholder
8. ✅ Event image placeholder

### Phase 3 (Nice to Have):
9. ✅ Apple touch icons
10. ✅ Android PWA icons
11. ✅ Activity/achievement placeholders
12. ✅ Logo lockup (stacked)

---

## 11. DESIGN SPECIFICATIONS

### Brand Mark:
- **Min size:** 16x16px (must be readable)
- **Max size:** 256x256px
- **Format:** SVG (scalable) + PNG (fallback)
- **Aspect ratio:** Square (1:1)

### Wordmark:
- **Min height:** 20px
- **Max height:** 60px
- **Format:** SVG (scalable)
- **Aspect ratio:** Flexible (horizontal)

### Placeholders:
- **Format:** SVG (preferred) + PNG (fallback)
- **Colors:** Use theme-aware colors (CSS variables)
- **Style:** Simple, clean, recognizable icon

---

## 12. TESTING CHECKLIST

After creating assets, test:
- [ ] Sidebar logo (collapsed & expanded)
- [ ] Favicon in browser tab
- [ ] Apple touch icon on iOS
- [ ] Dark mode switching
- [ ] All placeholder fallbacks
- [ ] High DPI displays (2x, 3x)
- [ ] Small sizes (16px, 24px)
- [ ] Large sizes (128px, 256px)

---

## 13. CURRENT PLACEHOLDER USAGE MAP

| Component | Current Placeholder | Size | Type Needed |
|-----------|-------------------|------|-------------|
| `sidebar.tsx` | Sparkles icon | 32x32 | Brand mark |
| `header.tsx` | `/placeholder.svg` | 36x36 | User avatar |
| `opportunity-card.tsx` | `/placeholder.svg` | 64x64 | Company logo |
| `project-card.tsx` | `/placeholder.svg` | 16:9 | Project thumbnail |
| `event/page.tsx` | `/placeholder.svg` | 16:9 | Event image |
| `profile-header.tsx` | `/placeholder.svg` | 128x128 | User avatar |
| `connection-card.tsx` | `/placeholder.svg` | 48x48 | User avatar |

---

**Last Updated:** 2025-01-14
**Status:** Ready for Design Team
