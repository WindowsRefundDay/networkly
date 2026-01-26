
import { render, screen } from '@testing-library/react'
import { MarkdownMessage } from '@/components/assistant/markdown-message'
import { describe, it, expect } from 'vitest'

// Mock the OpportunityCardInline component since it fetches data
vi.mock('@/components/assistant/opportunity-card-inline', () => ({
  OpportunityCardInline: ({ opportunity }: { opportunity: any }) => (
    <div data-testid="opportunity-card">{opportunity?.title || 'Card'}</div>
  )
}))

describe('MarkdownMessage', () => {
  it('renders simple text correctly', () => {
    const content = 'Hello world'
    render(<MarkdownMessage content={content} />)
    expect(screen.getByText('Hello world')).toBeDefined()
  })

  it('renders markdown bold correctly', () => {
    const content = 'Hello **world**'
    render(<MarkdownMessage content={content} />)
    // "world" should be in a strong tag
    const strongElement = screen.getByText('world')
    expect(strongElement.tagName).toBe('STRONG')
  })

  it('renders embedded cards correctly', () => {
    const content = 'Check out {{card:123}}'
    const opportunityCache = {
      '123': { id: '123', title: 'Test Job' } as any
    }

    render(<MarkdownMessage content={content} opportunityCache={opportunityCache} />)

    expect(screen.getByText('Check out')).toBeDefined()
    expect(screen.getByTestId('opportunity-card')).toHaveTextContent('Test Job')
  })
})
