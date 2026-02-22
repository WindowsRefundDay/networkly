import { describe, it, expect, vi } from "vitest"
import {
  render,
  // @ts-ignore
  screen
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { AboutSection } from "@/components/profile/about-section"
import { toast } from "sonner"

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("AboutSection", () => {
  it("renders bio content when provided", () => {
    const bio = "I am a passionate software engineer with expertise in React and TypeScript."
    render(<AboutSection bio={bio} />)

    expect(screen.getByText(bio)).toBeInTheDocument()
  })

  it("renders default message when bio is empty", () => {
    render(<AboutSection bio="" />)

    expect(screen.getByText("No bio provided yet.")).toBeInTheDocument()
  })

  it("renders default message when bio is null", () => {
    render(<AboutSection bio={null} />)

    expect(screen.getByText("No bio provided yet.")).toBeInTheDocument()
  })

  it("shows AI Improve coming soon toast when button clicked", async () => {
    const user = userEvent.setup()
    render(<AboutSection bio="Some bio" />)

    const aiButton = screen.getByRole("button", { name: /ai improve/i })
    await user.click(aiButton)

    expect(toast.info).toHaveBeenCalledWith("AI Improve coming soon!", {
      description: "This feature is currently in development.",
    })
  })

  it("opens edit dialog when edit button is clicked", async () => {
    const user = userEvent.setup()
    render(<AboutSection bio="Some bio" />)

    // Find the edit button (pencil icon)
    const buttons = screen.getAllByRole("button")
    const editButton = buttons[1] // Second button is the edit button

    await user.click(editButton)

    // Dialog should be visible
    expect(screen.getByRole("dialog")).toBeInTheDocument()
    expect(screen.getByText("Edit About")).toBeInTheDocument()
  })

  it("renders About title", () => {
    render(<AboutSection bio="Test bio" />)

    expect(screen.getByText("About")).toBeInTheDocument()
  })
})
