'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Globe,
  Filter,
  Download,
  Brain,
  Database,
  ChevronDown,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DiscoveryState, LayerId, LayerState } from '@/types/discovery'

interface LayerAccordionProps {
  state: DiscoveryState
  onToggleLayer: (layerId: LayerId) => void
  className?: string
}

const LAYER_ORDER: LayerId[] = [
  'query_generation',
  'web_search',
  'semantic_filter',
  'parallel_crawl',
  'ai_extraction',
  'db_sync',
]

const LAYER_ICONS: Record<LayerId, React.ComponentType<{ className?: string }>> = {
  query_generation: Sparkles,
  web_search: Globe,
  semantic_filter: Filter,
  parallel_crawl: Download,
  ai_extraction: Brain,
  db_sync: Database,
}

function getLayerStats(layer: LayerState): string {
  const { stats } = layer
  
  switch (layer.id) {
    case 'query_generation':
      if (stats.count) return `${stats.count} queries`
      return ''
    case 'web_search':
      if (stats.total) return `${stats.total} URLs`
      return ''
    case 'semantic_filter':
      if (stats.output !== undefined) return `${stats.output}/${stats.input || '?'}`
      return ''
    case 'parallel_crawl':
      if (stats.completed !== undefined) return `${stats.completed}/${stats.total || '?'}`
      return ''
    case 'ai_extraction':
      if (stats.completed !== undefined) return `${stats.completed} extracted`
      return ''
    case 'db_sync':
      if (stats.inserted !== undefined) return `${stats.inserted} saved`
      return ''
    default:
      return ''
  }
}

function getDuration(layer: LayerState): string {
  if (!layer.duration) return ''
  const seconds = layer.duration / 1000
  if (seconds < 1) return '<1s'
  return `${seconds.toFixed(1)}s`
}

export function LayerAccordion({ state, onToggleLayer, className }: LayerAccordionProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {LAYER_ORDER.map((layerId, index) => {
        const layer = state.layers[layerId]
        const Icon = LAYER_ICONS[layerId]
        const stats = getLayerStats(layer)
        const duration = getDuration(layer)
        
        return (
          <LayerRow
            key={layerId}
            layer={layer}
            index={index + 1}
            icon={Icon}
            stats={stats}
            duration={duration}
            onToggle={() => onToggleLayer(layerId)}
          />
        )
      })}
    </div>
  )
}

interface LayerRowProps {
  layer: LayerState
  index: number
  icon: React.ComponentType<{ className?: string }>
  stats: string
  duration: string
  onToggle: () => void
}

function LayerRow({ layer, index, icon: Icon, stats, duration, onToggle }: LayerRowProps) {
  const { status, expanded, name, message, reasoning, items } = layer
  
  const statusIcon = {
    pending: <Clock className="h-3.5 w-3.5 text-muted-foreground" />,
    running: <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />,
    complete: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
    error: <AlertCircle className="h-3.5 w-3.5 text-red-500" />,
  }
  
  const rowStyles = {
    pending: 'opacity-50',
    running: 'border-primary/50 bg-primary/5',
    complete: 'border-green-500/30 bg-green-500/5',
    error: 'border-red-500/30 bg-red-500/5',
  }
  
  return (
    <div className={cn('rounded-lg border transition-all', rowStyles[status])}>
      {/* Header Row */}
      <button
        onClick={onToggle}
        disabled={status === 'pending'}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left',
          'hover:bg-muted/50 transition-colors',
          'disabled:cursor-not-allowed disabled:hover:bg-transparent'
        )}
      >
        {/* Index */}
        <span className="text-xs font-mono text-muted-foreground w-4">{index}.</span>
        
        {/* Icon */}
        <div className={cn(
          'p-1.5 rounded-md',
          status === 'running' && 'bg-primary/10',
          status === 'complete' && 'bg-green-500/10',
          status === 'pending' && 'bg-muted',
          status === 'error' && 'bg-red-500/10'
        )}>
          <Icon className={cn(
            'h-4 w-4',
            status === 'running' && 'text-primary',
            status === 'complete' && 'text-green-500',
            status === 'pending' && 'text-muted-foreground',
            status === 'error' && 'text-red-500'
          )} />
        </div>
        
        {/* Name */}
        <span className="flex-1 text-sm font-medium truncate">{name}</span>
        
        {/* Status indicator */}
        {statusIcon[status]}
        
        {/* Stats badge */}
        {stats && (
          <span className={cn(
            'text-xs px-2 py-0.5 rounded-full',
            status === 'complete' && 'bg-green-500/10 text-green-600',
            status === 'running' && 'bg-primary/10 text-primary',
            status === 'error' && 'bg-red-500/10 text-red-600'
          )}>
            {stats}
          </span>
        )}
        
        {/* Duration */}
        {duration && (
          <span className="text-xs text-muted-foreground font-mono">{duration}</span>
        )}
        
        {/* Expand indicator */}
        {status !== 'pending' && (
          <ChevronDown className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            expanded && 'rotate-180'
          )} />
        )}
      </button>
      
      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/50">
              {/* Message */}
              {message && (
                <p className="text-xs text-muted-foreground mb-2">{message}</p>
              )}
              
              {/* Reasoning (AI thinking) */}
              {reasoning && (
                <div className="flex items-start gap-2 mb-2 p-2 rounded bg-muted/50">
                  <Brain className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground italic">{reasoning}</p>
                </div>
              )}
              
              {/* Items */}
              {items.length > 0 && (
                <LayerItems items={items} layerId={layer.id} />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface LayerItemsProps {
  items: LayerState['items']
  layerId: LayerId
}

function LayerItems({ items, layerId }: LayerItemsProps) {
  // Show different layouts based on layer type
  if (layerId === 'query_generation') {
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.slice(0, 8).map((item, index) => (
          <span
            key={`${item.id}-${index}`}
            className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground truncate max-w-[200px]"
          >
            {item.label}
          </span>
        ))}
        {items.length > 8 && (
          <span className="text-xs px-2 py-1 text-muted-foreground">
            +{items.length - 8} more
          </span>
        )}
      </div>
    )
  }
  
  if (layerId === 'ai_extraction') {
    return (
      <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
        {items.slice(0, 10).map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={cn(
              'flex items-center gap-2 p-2 rounded text-xs',
              item.status === 'success' && 'bg-green-500/5 border border-green-500/20',
              item.status === 'running' && 'bg-primary/5 border border-primary/20',
              item.status === 'failed' && 'bg-red-500/5 border border-red-500/20'
            )}
          >
            {item.status === 'success' && <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />}
            {item.status === 'running' && <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />}
            {item.status === 'failed' && <AlertCircle className="h-3 w-3 text-red-500 shrink-0" />}
            <span className="flex-1 truncate font-medium">{item.label}</span>
            {item.confidence !== undefined && (
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded',
                item.confidence >= 0.8 && 'bg-green-500/10 text-green-600',
                item.confidence >= 0.6 && item.confidence < 0.8 && 'bg-yellow-500/10 text-yellow-600',
                item.confidence < 0.6 && 'bg-red-500/10 text-red-600'
              )}>
                {Math.round(item.confidence * 100)}%
              </span>
            )}
          </div>
        ))}
        {items.length > 10 && (
          <p className="text-xs text-muted-foreground text-center py-1">
            +{items.length - 10} more items
          </p>
        )}
      </div>
    )
  }
  
  // Default: show as pills (for web_search, parallel_crawl)
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.slice(0, 12).map((item, index) => (
        <motion.span
          key={`${item.id}-${index}`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            'relative text-xs px-2 py-1 rounded-full border overflow-hidden',
            item.status === 'success' && 'border-green-500/30 bg-green-500/5 text-green-600',
            item.status === 'running' && 'border-primary/30 bg-primary/5 text-primary',
            item.status === 'failed' && 'border-red-500/30 bg-red-500/5 text-red-600',
            item.status === 'pending' && 'border-border bg-muted text-muted-foreground'
          )}
        >
          {/* Scanning shimmer */}
          {item.status === 'running' && (
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent"
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
          )}
          <span className="relative z-10 truncate max-w-[120px] block">{item.label}</span>
        </motion.span>
      ))}
      {items.length > 12 && (
        <span className="text-xs px-2 py-1 text-muted-foreground">
          +{items.length - 12} more
        </span>
      )}
    </div>
  )
}
