import { describe, it, expect, vi } from "vitest"
import {
  render,
  // @ts-ignore
  screen
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SkillsSection } from "@/components/profile/skills-section"

describe("SkillsSection", () => {
  const defaultSkills = [
    "React",
    "TypeScript",
    "Node.js",
    "Python",
    "SQL",
    "GraphQL",
    "Docker",
    "AWS",
    "Kubernetes",
    "MongoDB",
  ]

  const defaultInterests = [
    "AI/ML",
    "Web Development",
    "Cloud Computing",
    "Open Source",
    "DevOps",
    "Blockchain",
    "Cybersecurity",
    "IoT",
  ]

  const skillEndorsements = [
    { skill: "React", count: 15 },
    { skill: "TypeScript", count: 12 },
  ]

  it("renders skills section title", () => {
    render(<SkillsSection />)

    expect(screen.getByText("Skills & Endorsements")).toBeInTheDocument()
  })

  it("renders skills badges", () => {
    render(<SkillsSection skills={["React", "TypeScript"]} />)

    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.getByText("TypeScript")).toBeInTheDocument()
  })

  it("shows empty state when no skills", () => {
    render(<SkillsSection skills={[]} />)

    expect(screen.getByText("No skills added yet")).toBeInTheDocument()
  })

  it("renders interests section", () => {
    render(<SkillsSection interests={["AI/ML", "Web Development"]} />)

    expect(screen.getByText("Interests")).toBeInTheDocument()
    expect(screen.getByText("AI/ML")).toBeInTheDocument()
    expect(screen.getByText("Web Development")).toBeInTheDocument()
  })

  it("shows empty state when no interests", () => {
    render(<SkillsSection interests={[]} />)

    expect(screen.getByText("No interests added yet")).toBeInTheDocument()
  })

  it("limits initial skills display to 8", () => {
    render(<SkillsSection skills={defaultSkills} />)

    // First 8 skills should be visible
    expect(screen.getByText("React")).toBeInTheDocument()
    expect(screen.getByText("AWS")).toBeInTheDocument()

    // Skills beyond 8 should not be visible initially
    expect(screen.queryByText("Kubernetes")).not.toBeInTheDocument()
    expect(screen.queryByText("MongoDB")).not.toBeInTheDocument()
  })

  it("shows 'Show more' button when skills exceed limit", () => {
    render(<SkillsSection skills={defaultSkills} />)

    expect(screen.getByText("Show 2 more")).toBeInTheDocument()
  })

  it("expands to show all skills when 'Show more' clicked", async () => {
    const user = userEvent.setup()
    render(<SkillsSection skills={defaultSkills} />)

    const showMoreButton = screen.getByText("Show 2 more")
    await user.click(showMoreButton)

    // Now all skills should be visible
    expect(screen.getByText("Kubernetes")).toBeInTheDocument()
    expect(screen.getByText("MongoDB")).toBeInTheDocument()
    expect(screen.getByText("Show less")).toBeInTheDocument()
  })

  it("limits initial interests display to 6", () => {
    render(<SkillsSection interests={defaultInterests} />)

    // First 6 interests should be visible
    expect(screen.getByText("AI/ML")).toBeInTheDocument()
    expect(screen.getByText("DevOps")).toBeInTheDocument()

    // 7th and 8th interests should not be visible initially (index 6 and 7)
    expect(screen.queryByText("Cybersecurity")).not.toBeInTheDocument()
    expect(screen.queryByText("IoT")).not.toBeInTheDocument()
  })

  it("opens edit dialog when Add button clicked", async () => {
    const user = userEvent.setup()
    render(<SkillsSection skills={["React"]} interests={["AI"]} />)

    const addButton = screen.getByRole("button", { name: /add/i })
    await user.click(addButton)

    // Dialog should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("displays endorsement counts for skills", () => {
    render(
      <SkillsSection skills={["React", "TypeScript"]} skillEndorsements={skillEndorsements} />
    )

    // Endorsement counts should be visible
    expect(screen.getByText("15")).toBeInTheDocument()
    expect(screen.getByText("12")).toBeInTheDocument()
  })
})
