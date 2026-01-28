import type { Variants, Transition } from 'framer-motion'

export const PREMIUM_EASE = [0.23, 1, 0.32, 1] as const

export const springTransition: Transition = {
  type: 'spring',
  stiffness: 300,
  damping: 30,
}

export const messageEntranceVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 8,
    scale: 0.98,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      duration: 0.25,
      ease: PREMIUM_EASE,
    },
  },
}

export const staggerContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
}

export const cardHoverEffect = {
  y: -4,
  transition: { duration: 0.2, ease: PREMIUM_EASE },
}

export const pulseLoaderVariants: Variants = {
  pulse: {
    scale: [1, 1.05, 1],
    opacity: [0.7, 1, 0.7],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
}

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3, ease: PREMIUM_EASE },
  },
}

export const fadeInUpVariants: Variants = {
  hidden: { 
    opacity: 0, 
    y: 12,
  },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4, 
      ease: PREMIUM_EASE,
    },
  },
}
