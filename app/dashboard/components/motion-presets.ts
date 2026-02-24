import type { Transition, Variants } from "framer-motion"

export const DASHBOARD_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export const DASHBOARD_SPRING: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 20,
  mass: 0.9,
}

export const DASHBOARD_FAST_SPRING: Transition = {
  type: "spring",
  stiffness: 140,
  damping: 24,
  mass: 0.75,
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
