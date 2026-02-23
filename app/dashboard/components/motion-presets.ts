import type { Transition, Variants } from "framer-motion"

export const DASHBOARD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const DASHBOARD_SPRING: Transition = {
  duration: 0.42,
  ease: DASHBOARD_EASE,
}

export const DASHBOARD_FAST_SPRING: Transition = {
  duration: 0.28,
  ease: DASHBOARD_EASE,
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
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: DASHBOARD_SPRING,
  },
}
