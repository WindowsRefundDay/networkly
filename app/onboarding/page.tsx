"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronLeft, ChevronRight, Sparkles } from "lucide-react"

import { completeOnboarding } from "@/app/actions/onboarding"
import { useSupabaseUser } from "@/hooks/use-supabase-user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { GlassCard } from "@/components/ui/glass-card"
import { GlassContainer } from "@/components/ui/glass-container"

const INTEREST_OPTIONS = [
  "Technology",
  "Robotics",
  "Healthcare",
  "Business",
  "Design",
  "Public Speaking",
  "Entrepreneurship",
  "Engineering",
  "Environmental Science",
  "Arts",
  "Writing",
  "Sports",
]

const SKILL_OPTIONS = [
  "Leadership",
  "Teamwork",
  "Coding",
  "Public Speaking",
  "Design",
  "Research",
  "Data Analysis",
  "Marketing",
  "Project Management",
  "Creative Writing",
]

const ACADEMIC_STRENGTH_OPTIONS = [
  "Math",
  "Biology",
  "Chemistry",
  "Physics",
  "Computer Science",
  "English",
  "History",
  "Economics",
  "Art",
  "Foreign Languages",
]

const OPPORTUNITY_OPTIONS = [
  "Internships",
  "Shadowing",
  "Hackathons",
  "Research Programs",
  "Competitions",
  "Volunteering",
  "Leadership Programs",
  "Summer Camps",
]

const AVAILABILITY_OPTIONS = ["Weeknights", "Weekends", "Summer Only", "School Year", "Flexible"]

const GRADE_LEVELS = [
  { value: "9", label: "9th Grade (Freshman)" },
  { value: "10", label: "10th Grade (Sophomore)" },
  { value: "11", label: "11th Grade (Junior)" },
  { value: "12", label: "12th Grade (Senior)" },
]

const steps = [
  { title: "The Basics", description: "Tell us about your school and location." },
  { title: "Interests & Skills", description: "Pick what you love and what you are good at." },
  { title: "Future Goals", description: "Share your goals and strengths." },
  { title: "Preferences", description: "Choose the opportunities you want." },
]

type FormState = {
  name: string
  location: string
  school: string
  gradeLevel: string
  graduationYear: string
  interests: string[]
  skills: string[]
  careerGoals: string
  academicStrengths: string[]
  preferredOpportunityTypes: string[]
  availability: string
}

const emptyFormState: FormState = {
  name: "",
  location: "",
  school: "",
  gradeLevel: "",
  graduationYear: "",
  interests: [],
  skills: [],
  careerGoals: "",
  academicStrengths: [],
  preferredOpportunityTypes: [],
  availability: "",
}

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading } = useSupabaseUser()
  const [stepIndex, setStepIndex] = useState(0)
  const [formState, setFormState] = useState<FormState>(emptyFormState)
  const [customInterest, setCustomInterest] = useState("")
  const [customSkill, setCustomSkill] = useState("")
  const [customStrength, setCustomStrength] = useState("")
  const [customOpportunity, setCustomOpportunity] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!loading && user?.user_metadata?.full_name) {
      setFormState((prev) => ({
        ...prev,
        name: prev.name || user.user_metadata.full_name,
      }))
    }
  }, [loading, user])

  useEffect(() => {
    if (!formState.gradeLevel) return
    if (formState.graduationYear) return
    const currentYear = new Date().getFullYear()
    const grade = Number(formState.gradeLevel)
    const yearsUntilGraduation = 12 - grade
    const estimatedGradYear = currentYear + yearsUntilGraduation
    setFormState((prev) => ({
      ...prev,
      graduationYear: estimatedGradYear.toString(),
    }))
  }, [formState.gradeLevel, formState.graduationYear])

  const progressValue = useMemo(() => ((stepIndex + 1) / steps.length) * 100, [stepIndex])

  const toggleSelection = (list: string[], value: string) => {
    if (list.includes(value)) {
      return list.filter((item) => item !== value)
    }
    return [...list, value]
  }

  const addCustomItem = (
    value: string,
    listKey: keyof Pick<
      FormState,
      "interests" | "skills" | "academicStrengths" | "preferredOpportunityTypes"
    >
  ) => {
    const trimmed = value.trim()
    if (!trimmed) return
    setFormState((prev) => {
      const list = prev[listKey]
      if (list.includes(trimmed)) return prev
      return { ...prev, [listKey]: [...list, trimmed] }
    })
  }

  const isStepValid = () => {
    if (stepIndex === 0) {
      return (
        formState.name.trim() &&
        formState.location.trim() &&
        formState.school.trim() &&
        formState.gradeLevel &&
        formState.graduationYear
      )
    }
    if (stepIndex === 1) {
      return formState.interests.length > 0 && formState.skills.length > 0
    }
    if (stepIndex === 2) {
      return formState.careerGoals.trim() && formState.academicStrengths.length > 0
    }
    return formState.preferredOpportunityTypes.length > 0 && formState.availability
  }

  const handleNext = () => {
    if (!isStepValid()) {
      setError("Please fill out all required fields to continue.")
      return
    }
    setError(null)
    setStepIndex((prev) => Math.min(prev + 1, steps.length - 1))
  }

  const handleBack = () => {
    setError(null)
    setStepIndex((prev) => Math.max(prev - 1, 0))
  }

  const handleSubmit = () => {
    if (!isStepValid()) {
      setError("Please complete this step before finishing.")
      return
    }
    setError(null)
    startTransition(async () => {
      const response = await completeOnboarding({
        name: formState.name.trim(),
        location: formState.location.trim(),
        school: formState.school.trim(),
        gradeLevel: Number(formState.gradeLevel),
        graduationYear: Number(formState.graduationYear),
        interests: formState.interests,
        skills: formState.skills,
        careerGoals: formState.careerGoals.trim(),
        academicStrengths: formState.academicStrengths,
        preferredOpportunityTypes: formState.preferredOpportunityTypes,
        availability: formState.availability,
      })

      if (!response.success) {
        setError(response.error || "Something went wrong. Please try again.")
        return
      }

      setIsComplete(true)
    })
  }

  if (isComplete) {
    return (
      <div className="flex min-h-svh items-center justify-center px-4 py-10">
        <GlassContainer>
          <GlassCard className="max-w-lg text-center space-y-6 p-10">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold">You are all set!</h1>
              <p className="text-muted-foreground">
                Your profile is ready. We will use it to personalize opportunities for you.
              </p>
            </div>
            <Button onClick={() => router.push("/dashboard")} size="lg" className="w-full">
              Go to your dashboard
            </Button>
          </GlassCard>
        </GlassContainer>
      </div>
    )
  }

  return (
    <div className="min-h-svh px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-semibold">Build your student profile</h1>
          <p className="text-muted-foreground">
            Step {stepIndex + 1} of {steps.length} · {steps[stepIndex].description}
          </p>
        </div>

        <Progress value={progressValue} className="h-2" />

        <GlassContainer>
          <GlassCard className="p-8 space-y-8">
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">{steps[stepIndex].title}</h2>
              <p className="text-muted-foreground">{steps[stepIndex].description}</p>
            </div>

            {stepIndex === 0 && (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={formState.name}
                    onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Jordan Lee"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">City, State</Label>
                  <Input
                    id="location"
                    value={formState.location}
                    onChange={(event) => setFormState((prev) => ({ ...prev, location: event.target.value }))}
                    placeholder="San Jose, CA"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="school">School name</Label>
                  <Input
                    id="school"
                    value={formState.school}
                    onChange={(event) => setFormState((prev) => ({ ...prev, school: event.target.value }))}
                    placeholder="Lincoln High School"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade level</Label>
                  <Select
                    value={formState.gradeLevel}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, gradeLevel: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_LEVELS.map((grade) => (
                        <SelectItem key={grade.value} value={grade.value}>
                          {grade.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gradYear">Graduation year</Label>
                  <Input
                    id="gradYear"
                    type="number"
                    value={formState.graduationYear}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, graduationYear: event.target.value }))
                    }
                    placeholder="2027"
                  />
                </div>
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Interests</Label>
                    <Badge variant="secondary">{formState.interests.length} selected</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((interest) => {
                      const selected = formState.interests.includes(interest)
                      return (
                        <Button
                          key={interest}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              interests: toggleSelection(prev.interests, interest),
                            }))
                          }
                        >
                          {interest}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customInterest}
                      onChange={(event) => setCustomInterest(event.target.value)}
                      placeholder="Add another interest"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addCustomItem(customInterest, "interests")
                        setCustomInterest("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Skills</Label>
                    <Badge variant="secondary">{formState.skills.length} selected</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((skill) => {
                      const selected = formState.skills.includes(skill)
                      return (
                        <Button
                          key={skill}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              skills: toggleSelection(prev.skills, skill),
                            }))
                          }
                        >
                          {skill}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customSkill}
                      onChange={(event) => setCustomSkill(event.target.value)}
                      placeholder="Add another skill"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addCustomItem(customSkill, "skills")
                        setCustomSkill("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 2 && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="careerGoals">Career goals</Label>
                  <Textarea
                    id="careerGoals"
                    value={formState.careerGoals}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, careerGoals: event.target.value }))
                    }
                    placeholder="Tell us what careers or majors excite you."
                    rows={4}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Academic strengths</Label>
                    <Badge variant="secondary">{formState.academicStrengths.length} selected</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ACADEMIC_STRENGTH_OPTIONS.map((strength) => {
                      const selected = formState.academicStrengths.includes(strength)
                      return (
                        <Button
                          key={strength}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              academicStrengths: toggleSelection(prev.academicStrengths, strength),
                            }))
                          }
                        >
                          {strength}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customStrength}
                      onChange={(event) => setCustomStrength(event.target.value)}
                      placeholder="Add another strength"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addCustomItem(customStrength, "academicStrengths")
                        setCustomStrength("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Preferred opportunity types</Label>
                    <Badge variant="secondary">
                      {formState.preferredOpportunityTypes.length} selected
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {OPPORTUNITY_OPTIONS.map((type) => {
                      const selected = formState.preferredOpportunityTypes.includes(type)
                      return (
                        <Button
                          key={type}
                          type="button"
                          variant={selected ? "default" : "outline"}
                          size="sm"
                          onClick={() =>
                            setFormState((prev) => ({
                              ...prev,
                              preferredOpportunityTypes: toggleSelection(prev.preferredOpportunityTypes, type),
                            }))
                          }
                        >
                          {type}
                        </Button>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={customOpportunity}
                      onChange={(event) => setCustomOpportunity(event.target.value)}
                      placeholder="Add another opportunity type"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        addCustomItem(customOpportunity, "preferredOpportunityTypes")
                        setCustomOpportunity("")
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Availability</Label>
                  <Select
                    value={formState.availability}
                    onValueChange={(value) => setFormState((prev) => ({ ...prev, availability: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose when you are free" />
                    </SelectTrigger>
                    <SelectContent>
                      {AVAILABILITY_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={handleBack} disabled={stepIndex === 0 || isPending}>
                <ChevronLeft className="h-4 w-4" />
                Back
              </Button>
              {stepIndex < steps.length - 1 ? (
                <Button type="button" onClick={handleNext} disabled={isPending}>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={handleSubmit} disabled={isPending}>
                  {isPending ? "Saving..." : "Finish onboarding"}
                </Button>
              )}
            </div>
          </GlassCard>
        </GlassContainer>
      </div>
    </div>
  )
}
