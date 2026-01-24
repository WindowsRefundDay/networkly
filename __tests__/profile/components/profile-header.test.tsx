import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ProfileHeader } from "@/components/profile/profile-header"

// Mock next/navigation
const mockPush = vi.fn()
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ src, alt, priority, ...props }: any) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}))

describe("ProfileHeader", () => {
  const defaultUser = {
    name: "John Doe",
    avatar: "https://example.com/avatar.jpg",
    headline: "Software Engineer",
    location: "San Francisco, CA",
    university: "Stanford University",
    graduationYear: "2024",
    connections: 150,
    profileViews: 500,
    linkedinUrl: "https://linkedin.com/in/johndoe",
    githubUrl: "https://github.com/johndoe",
    portfolioUrl: "https://johndoe.dev",
  }

  it("renders user name and headline", () => {
    render(<ProfileHeader user={defaultUser} />)

    expect(screen.getByText("John Doe")).toBeInTheDocument()
    expect(screen.getByText("Software Engineer")).toBeInTheDocument()
  })

  it("renders location and university info", () => {
    render(<ProfileHeader user={defaultUser} />)

    expect(screen.getByText("San Francisco, CA")).toBeInTheDocument()
    expect(screen.getByText(/Stanford University/)).toBeInTheDocument()
  })

  it("renders connections and profile views count", () => {
    render(<ProfileHeader user={defaultUser} />)

    expect(screen.getByText("150 connections")).toBeInTheDocument()
    expect(screen.getByText("500 profile views")).toBeInTheDocument()
  })

  it("enters edit mode when Edit button is clicked", async () => {
    const user = userEvent.setup()
    render(<ProfileHeader user={defaultUser} />)

    const editButton = screen.getByRole("button", { name: /edit/i })
    await user.click(editButton)

    expect(screen.getByLabelText("Name")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument()
  })

  it("navigates to messages when Message button is clicked", async () => {
    const user = userEvent.setup()
    render(<ProfileHeader user={defaultUser} />)

    // Get all buttons and click the message button (3rd one - Edit, Share, Message)
    const allButtons = screen.getAllByRole("button")
    await user.click(allButtons[2]) // Message button is third

    expect(mockPush).toHaveBeenCalledWith("/network?tab=messages")
  })

  it("renders fallback initials when no avatar provided", () => {
    render(<ProfileHeader user={{ ...defaultUser, avatar: null }} />)

    expect(screen.getByText("JD")).toBeInTheDocument()
  })

  it("handles missing optional fields gracefully", () => {
    render(
      <ProfileHeader
        user={{
          name: "Jane Doe",
          connections: 0,
          profileViews: 0,
        }}
      />
    )

    expect(screen.getByText("Jane Doe")).toBeInTheDocument()
    expect(screen.getByText("High School Student")).toBeInTheDocument()
    expect(screen.getByText("0 connections")).toBeInTheDocument()
  })
})
