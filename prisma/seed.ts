import { PrismaClient } from "@prisma/client"
import {
    currentUser,
    opportunities,
    allOpportunities,
    allProjects,
    projectUpdates,
    events,
    applications,
    analyticsData,
    networkConnections,
    messages,
} from "../lib/mock-data"

const prisma = new PrismaClient()

async function main() {
    console.log("🌱 Starting database seed...")

    // Clean up existing data (in reverse order of dependencies)
    console.log("🧹 Cleaning up existing data...")
    await prisma.chatLog.deleteMany()
    await prisma.userActivity.deleteMany()
    await prisma.skillEndorsement.deleteMany()
    await prisma.eventRegistration.deleteMany()
    await prisma.userPreferences.deleteMany()
    await prisma.analyticsData.deleteMany()
    await prisma.extracurricular.deleteMany()
    await prisma.achievement.deleteMany()
    await prisma.event.deleteMany()
    await prisma.application.deleteMany()
    await prisma.message.deleteMany()
    await prisma.connection.deleteMany()
    await prisma.projectUpdate.deleteMany()
    await prisma.projectCollaborator.deleteMany()
    await prisma.project.deleteMany()
    await prisma.userGoal.deleteMany()
    await prisma.userOpportunity.deleteMany()
    await prisma.opportunity.deleteMany()
    await prisma.user.deleteMany()

    // ============================================================================
    // SEED USERS
    // ============================================================================
    console.log("👤 Creating users...")

    // Create the current user (Alex Chen)
    const alexUser = await prisma.user.create({
        data: {
            id: "1",
            clerkId: "user_alex_chen", // This will be replaced with real Clerk ID
            email: currentUser.email,
            name: currentUser.name,
            avatar: currentUser.avatar,
            headline: currentUser.headline,
            bio: currentUser.bio,
            location: currentUser.location,
            university: currentUser.university,
            graduationYear: currentUser.graduationYear,
            skills: currentUser.skills,
            interests: currentUser.interests,
            connections: currentUser.connections,
            profileViews: currentUser.profileViews,
            searchAppearances: currentUser.searchAppearances,
            completedProjects: currentUser.completedProjects,
        },
    })
    console.log(`  ✓ Created user: ${alexUser.name}`)

    // Create other users from network connections
    const otherUsers = await Promise.all(
        networkConnections
            .filter((conn) => conn.id !== "1")
            .map(async (conn, index) => {
                const user = await prisma.user.create({
                    data: {
                        id: conn.id,
                        clerkId: `user_${conn.id}`,
                        email: `${conn.name.toLowerCase().replace(" ", ".")}@example.com`,
                        name: conn.name,
                        avatar: conn.avatar,
                        headline: conn.headline,
                        skills: [],
                        interests: [],
                    },
                })
                console.log(`  ✓ Created user: ${user.name}`)
                return user
            })
    )

    // ============================================================================
    // SEED ACHIEVEMENTS
    // ============================================================================
    console.log("🏆 Creating achievements...")

    for (const achievement of currentUser.achievements) {
        await prisma.achievement.create({
            data: {
                id: achievement.id,
                title: achievement.title,
                date: achievement.date,
                icon: achievement.icon,
                userId: alexUser.id,
            },
        })
    }
    console.log(`  ✓ Created ${currentUser.achievements.length} achievements`)

    // ============================================================================
    // SEED EXTRACURRICULARS
    // ============================================================================
    console.log("📚 Creating extracurriculars...")

    for (const extra of currentUser.extracurriculars) {
        await prisma.extracurricular.create({
            data: {
                id: extra.id,
                title: extra.title,
                organization: extra.organization,
                type: extra.type,
                startDate: extra.startDate,
                endDate: extra.endDate,
                description: extra.description,
                logo: extra.logo,
                userId: alexUser.id,
            },
        })
    }
    console.log(`  ✓ Created ${currentUser.extracurriculars.length} extracurriculars`)

    // ============================================================================
    // SEED OPPORTUNITIES
    // ============================================================================
    console.log("💼 Creating opportunities...")

    for (const opp of allOpportunities) {
        await prisma.opportunity.create({
            data: {
                id: opp.id,
                url: `https://example.com/opportunity/${opp.id}`,
                title: opp.title,
                company: opp.company,
                location: opp.location,
                type: opp.type,
                category: "Other",
                deadline: new Date(opp.deadline),
                logo: opp.logo,
                skills: opp.skills,
                description: opp.description,
                salary: opp.salary,
                duration: opp.duration,
                remote: opp.remote,
                applicants: opp.applicants,
                extractionConfidence: 1.0,
                isActive: true,
            },
        })
    }
    console.log(`  ✓ Created ${allOpportunities.length} opportunities`)

    // Seed saved opportunities (using new UserOpportunity model)
    const savedOpps = allOpportunities.filter((opp) => opp.saved)
    for (const opp of savedOpps) {
        await prisma.userOpportunity.create({
            data: {
                userId: alexUser.id,
                opportunityId: opp.id,
                matchScore: opp.matchScore,
                matchReasons: ["Skill match", "Interest alignment"],
                status: "saved",
            },
        })
    }
    console.log(`  ✓ Created ${savedOpps.length} saved opportunities`)

    // ============================================================================
    // SEED PROJECTS
    // ============================================================================
    console.log("🚀 Creating projects...")

    for (const project of allProjects) {
        const createdProject = await prisma.project.create({
            data: {
                id: project.id,
                title: project.title,
                description: project.description,
                image: project.image,
                category: project.category,
                status: project.status,
                visibility: project.visibility,
                likes: project.likes,
                views: project.views,
                comments: project.comments,
                tags: project.tags,
                progress: project.progress,
                links: project.links,
                lookingFor: project.lookingFor,
                ownerId: alexUser.id,
            },
        })

        // Add collaborators (only for users that exist)
        for (const collab of project.collaborators) {
            const userExists = collab.id === "1" || otherUsers.some((u) => u.id === collab.id)
            if (userExists) {
                await prisma.projectCollaborator.create({
                    data: {
                        projectId: createdProject.id,
                        userId: collab.id,
                        role: collab.role,
                    },
                })
            }
        }
    }
    console.log(`  ✓ Created ${allProjects.length} projects with collaborators`)

    // ============================================================================
    // SEED PROJECT UPDATES
    // ============================================================================
    console.log("📝 Creating project updates...")

    for (const update of projectUpdates) {
        await prisma.projectUpdate.create({
            data: {
                id: update.id,
                projectId: update.projectId,
                type: update.type,
                content: update.content,
            },
        })
    }
    console.log(`  ✓ Created ${projectUpdates.length} project updates`)

    // ============================================================================
    // SEED CONNECTIONS
    // ============================================================================
    console.log("🤝 Creating connections...")

    for (const conn of networkConnections) {
        if (conn.id === "1") continue // Skip self

        await prisma.connection.create({
            data: {
                requesterId: alexUser.id,
                receiverId: conn.id,
                status: conn.status,
                mutualConnections: conn.mutualConnections,
                matchReason: conn.matchReason,
                connectedDate: conn.connectedDate ? new Date(conn.connectedDate) : null,
            },
        })
    }
    console.log(`  ✓ Created ${networkConnections.length - 1} connections`)

    // ============================================================================
    // SEED MESSAGES
    // ============================================================================
    console.log("💬 Creating messages...")

    for (const msg of messages) {
        await prisma.message.create({
            data: {
                id: msg.id,
                content: msg.preview, // Using preview as content
                senderId: msg.senderId,
                receiverId: alexUser.id,
                preview: msg.preview,
                unread: msg.unread,
            },
        })
    }
    console.log(`  ✓ Created ${messages.length} messages`)

    // ============================================================================
    // SEED APPLICATIONS
    // ============================================================================
    console.log("📋 Creating applications...")

    for (const app of applications) {
        await prisma.application.create({
            data: {
                id: app.id,
                company: app.company,
                position: app.position,
                status: app.status,
                appliedDate: new Date(app.appliedDate),
                nextStep: app.nextStep,
                userId: alexUser.id,
            },
        })
    }
    console.log(`  ✓ Created ${applications.length} applications`)

    // ============================================================================
    // SEED EVENTS
    // ============================================================================
    console.log("📅 Creating events...")

    for (const event of events) {
        await prisma.event.create({
            data: {
                id: event.id,
                title: event.title,
                date: event.date,
                location: event.location,
                type: event.type,
                attendees: event.attendees,
                image: event.image,
                description: "An exciting event for networking and learning.",
                matchScore: Math.floor(Math.random() * 30) + 70, // 70-100 match score
            },
        })
    }
    console.log(`  ✓ Created ${events.length} events`)

    // ============================================================================
    // SEED EVENT REGISTRATIONS
    // ============================================================================
    console.log("🎫 Creating event registrations...")

    // Register Alex for the first 2 events
    const registeredEvents = events.slice(0, 2)
    for (const event of registeredEvents) {
        await prisma.eventRegistration.create({
            data: {
                userId: alexUser.id,
                eventId: event.id,
                status: "registered",
            },
        })
    }
    console.log(`  ✓ Created ${registeredEvents.length} event registrations`)

    // ============================================================================
    // SEED USER ACTIVITIES
    // ============================================================================
    console.log("📈 Creating user activities...")

    const activityTypes = [
        "profile_view",
        "connection",
        "message",
        "application",
        "profile_update",
        "opportunity_save",
    ]

    // Create activities for the past 30 days
    const activityCount = 50
    for (let i = 0; i < activityCount; i++) {
        const daysAgo = Math.floor(Math.random() * 30)
        const activityDate = new Date()
        activityDate.setDate(activityDate.getDate() - daysAgo)

        await prisma.userActivity.create({
            data: {
                userId: alexUser.id,
                type: activityTypes[Math.floor(Math.random() * activityTypes.length)],
                date: activityDate,
                metadata: {
                    source: "seed",
                },
            },
        })
    }
    console.log(`  ✓ Created ${activityCount} user activities`)

    // ============================================================================
    // SEED SKILL ENDORSEMENTS
    // ============================================================================
    console.log("👍 Creating skill endorsements...")

    // Other users endorse Alex's skills
    const alexSkills = currentUser.skills.slice(0, 5) // Top 5 skills
    let endorsementCount = 0

    for (const skill of alexSkills) {
        // Have 2-4 random users endorse each skill
        const endorsersCount = Math.floor(Math.random() * 3) + 2
        const shuffledUsers = otherUsers.sort(() => 0.5 - Math.random())
        const endorsers = shuffledUsers.slice(0, endorsersCount)

        for (const endorser of endorsers) {
            await prisma.skillEndorsement.create({
                data: {
                    endorserId: endorser.id,
                    endorseeId: alexUser.id,
                    skill,
                },
            })
            endorsementCount++
        }
    }
    console.log(`  ✓ Created ${endorsementCount} skill endorsements`)

    // ============================================================================
    // SEED USER PREFERENCES
    // ============================================================================
    console.log("⚙️ Creating user preferences...")

    await prisma.userPreferences.create({
        data: {
            userId: alexUser.id,
            notifyOpportunities: true,
            notifyConnections: true,
            notifyMessages: true,
            weeklyDigest: false,
            publicProfile: true,
            showActivityStatus: false,
            showProfileViews: true,
            aiSuggestions: true,
            autoIcebreakers: true,
            careerNudges: true,
        },
    })
    console.log(`  ✓ Created user preferences for ${alexUser.name}`)

    // ============================================================================
    // SEED ANALYTICS DATA
    // ============================================================================
    console.log("📊 Creating analytics data...")

    await prisma.analyticsData.create({
        data: {
            userId: alexUser.id,
            profileViews: analyticsData.profileViews,
            networkGrowth: analyticsData.networkGrowth,
            skillEndorsements: analyticsData.skillEndorsements,
        },
    })
    console.log(`  ✓ Created analytics data for ${alexUser.name}`)

    console.log("\n✅ Database seeding completed successfully!")
}

main()
    .catch((e) => {
        console.error("❌ Error seeding database:", e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
