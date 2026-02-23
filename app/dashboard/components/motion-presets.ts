import type { Transition, Variants } from "framer-motion"

export const DASHBOARD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const DASHBOARD_SPRING: Transition = {
  type: "spring",
  visualDuration: 0.5,
  bounce: 0.2,
}

export const DASHBOARD_FAST_SPRING: Transition = {
  type: "spring",
  visualDuration: 0.35,
  bounce: 0.16,
}

export const dashboardGridVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      delayChildren: 0.08,
      staggerChildren: 0.1,
    },
  },
}

export const dashboardItemVariants: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: DASHBOARD_SPRING,
  },
}
