// Project categories for all types of projects
export const PROJECT_CATEGORIES = [
    { value: "software", label: "Software & Technology", icon: "Code" },
    { value: "research", label: "Research & Academic", icon: "BookOpen" },
    { value: "business", label: "Business & Startup", icon: "Briefcase" },
    { value: "creative", label: "Creative & Arts", icon: "Palette" },
    { value: "community", label: "Community & Social Impact", icon: "Users" },
    { value: "event", label: "Event & Planning", icon: "Calendar" },
    { value: "design", label: "Design & UX", icon: "PenTool" },
    { value: "content", label: "Content & Media", icon: "FileText" },
    { value: "hardware", label: "Hardware & Engineering", icon: "Cpu" },
    { value: "education", label: "Education & Learning", icon: "GraduationCap" },
    { value: "health", label: "Health & Wellness", icon: "Heart" },
    { value: "environment", label: "Environment & Sustainability", icon: "Leaf" },
    { value: "other", label: "Other", icon: "Folder" },
] as const

export type ProjectCategory = (typeof PROJECT_CATEGORIES)[number]["value"]

// Link types for different project categories
export interface ProjectLink {
    type: string
    label: string
    url: string
}

// Common link types by category
export const LINK_TYPES_BY_CATEGORY: Record<string, { type: string; label: string; placeholder: string }[]> = {
    software: [
        { type: "github", label: "GitHub Repository", placeholder: "https://github.com/..." },
        { type: "demo", label: "Live Demo", placeholder: "https://..." },
        { type: "docs", label: "Documentation", placeholder: "https://..." },
    ],
    research: [
        { type: "paper", label: "Research Paper", placeholder: "https://..." },
        { type: "presentation", label: "Presentation", placeholder: "https://..." },
        { type: "data", label: "Dataset", placeholder: "https://..." },
    ],
    business: [
        { type: "website", label: "Website", placeholder: "https://..." },
        { type: "pitch", label: "Pitch Deck", placeholder: "https://..." },
        { type: "linkedin", label: "LinkedIn Page", placeholder: "https://linkedin.com/..." },
    ],
    creative: [
        { type: "portfolio", label: "Portfolio", placeholder: "https://..." },
        { type: "behance", label: "Behance", placeholder: "https://behance.net/..." },
        { type: "instagram", label: "Instagram", placeholder: "https://instagram.com/..." },
    ],
    community: [
        { type: "website", label: "Website", placeholder: "https://..." },
        { type: "social", label: "Social Media", placeholder: "https://..." },
        { type: "donation", label: "Donation Page", placeholder: "https://..." },
    ],
    event: [
        { type: "registration", label: "Registration", placeholder: "https://..." },
        { type: "website", label: "Event Website", placeholder: "https://..." },
        { type: "calendar", label: "Calendar Link", placeholder: "https://..." },
    ],
    design: [
        { type: "figma", label: "Figma", placeholder: "https://figma.com/..." },
        { type: "dribbble", label: "Dribbble", placeholder: "https://dribbble.com/..." },
        { type: "prototype", label: "Prototype", placeholder: "https://..." },
    ],
    content: [
        { type: "youtube", label: "YouTube", placeholder: "https://youtube.com/..." },
        { type: "podcast", label: "Podcast", placeholder: "https://..." },
        { type: "blog", label: "Blog", placeholder: "https://..." },
    ],
    hardware: [
        { type: "github", label: "GitHub/GitLab", placeholder: "https://..." },
        { type: "schematic", label: "Schematics", placeholder: "https://..." },
        { type: "shop", label: "Shop/Buy", placeholder: "https://..." },
    ],
    education: [
        { type: "course", label: "Course Link", placeholder: "https://..." },
        { type: "materials", label: "Materials", placeholder: "https://..." },
        { type: "platform", label: "Platform", placeholder: "https://..." },
    ],
    health: [
        { type: "website", label: "Website", placeholder: "https://..." },
        { type: "app", label: "App Store", placeholder: "https://..." },
        { type: "research", label: "Research", placeholder: "https://..." },
    ],
    environment: [
        { type: "website", label: "Website", placeholder: "https://..." },
        { type: "impact", label: "Impact Report", placeholder: "https://..." },
        { type: "donate", label: "Donate", placeholder: "https://..." },
    ],
    other: [
        { type: "website", label: "Website", placeholder: "https://..." },
        { type: "link", label: "Link", placeholder: "https://..." },
    ],
}

// Collaborator interface
export interface Collaborator {
    id: string
    name: string
    avatar: string | null
    role: string
}

// Full project interface
export interface Project {
    id: string
    title: string
    description: string
    image: string | null
    category: string
    status: string
    visibility: string
    collaborators: Collaborator[]
    likes: number
    views: number
    comments: number
    tags: string[]
    progress: number
    links: ProjectLink[]
    lookingFor: string[]
    ownerId: string
    ownerName?: string
    ownerAvatar?: string | null
    createdAt: string
    updatedAt: string
}
