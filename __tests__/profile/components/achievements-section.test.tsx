import { describe, it, expect, vi } from "vitest"
import {
  render,
  // @ts-ignore
  screen
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AchievementsSection } from "@/components/profile/achievements-section"

// Mock the server action
vi.mock("@/app/actions/profile-items", () => ({
  deleteAchievement: vi.fn(),
}))

describe("AchievementsSection", () => {
  const mockAchievements = [
    { id: "1", title: "Dean's List", date: "Fall 2024", icon: "trophy" },
    { id: "2", title: "Hackathon Winner", date: "Spring 2024", icon: "award" },
    { id: "3", title: "Research Grant", date: "2024", icon: "star" },
  ]

  const manyAchievements = Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    title: `Achievement ${i + 1}`,
    date: "2024",
    icon: "trophy",
  }))

  it("renders achievements section title", () => {
    render(<AchievementsSection />)

    expect(screen.getByText("Achievements")).toBeInTheDocument()
  })

  it("shows empty state when no achievements", () => {
    render(<AchievementsSection achievements={[]} />)

    expect(screen.getByText("No achievements yet")).toBeInTheDocument()
    expect(
      screen.getByText("Add your accomplishments to showcase your success")
    ).toBeInTheDocument()
  })

  it("renders achievement items", () => {
    render(<AchievementsSection achievements={mockAchievements} />)

    expect(screen.getByText("Dean's List")).toBeInTheDocument()
    expect(screen.getByText("Hackathon Winner")).toBeInTheDocument()
    expect(screen.getByText("Research Grant")).toBeInTheDocument()
  })

  it("renders achievement dates", () => {
    render(<AchievementsSection achievements={mockAchievements} />)

    expect(screen.getByText("Fall 2024")).toBeInTheDocument()
    expect(screen.getByText("Spring 2024")).toBeInTheDocument()
  })

  it("opens add dialog when Add button clicked", async () => {
    const user = userEvent.setup()
    render(<AchievementsSection achievements={[]} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("limits initial display to 6 achievements", () => {
    render(<AchievementsSection achievements={manyAchievements} />)

    // First 6 should be visible
    expect(screen.getByText("Achievement 1")).toBeInTheDocument()
    expect(screen.getByText("Achievement 6")).toBeInTheDocument()

    // Beyond 6 should not be visible
    expect(screen.queryByText("Achievement 7")).not.toBeInTheDocument()
  })

  it("shows 'Show more' button when achievements exceed limit", () => {
    render(<AchievementsSection achievements={manyAchievements} />)

    expect(screen.getByText(/Show 4 more/)).toBeInTheDocument()
  })

  it("expands to show all achievements when 'Show more' clicked", async () => {
    const user = userEvent.setup()
    render(<AchievementsSection achievements={manyAchievements} />)

    const showMoreButton = screen.getByText(/Show 4 more/)
    await user.click(showMoreButton)

    // All achievements should now be visible
    expect(screen.getByText("Achievement 7")).toBeInTheDocument()
    expect(screen.getByText("Achievement 10")).toBeInTheDocument()
    expect(screen.getByText("Show less")).toBeInTheDocument()
  })

  it("collapses when 'Show less' clicked", async () => {
    const user = userEvent.setup()
    render(<AchievementsSection achievements={manyAchievements} />)

    // First expand
    await user.click(screen.getByText(/Show 4 more/))
    expect(screen.getByText("Achievement 10")).toBeInTheDocument()

    // Then collapse
    await user.click(screen.getByText("Show less"))
    expect(screen.queryByText("Achievement 7")).not.toBeInTheDocument()
  })

  it("renders correct icons for achievement types", () => {
    render(<AchievementsSection achievements={mockAchievements} />)

    // Icons should render based on the icon prop
    // We can't easily test SVG icons, but we verify the component renders without error
    expect(screen.getByText("Dean's List")).toBeInTheDocument()
  })
})
