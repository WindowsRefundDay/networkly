import { vi, describe, it, expect, beforeEach } from "vitest"
import { updateStatus, getStatuses } from "../../app/actions/opportunity-status"

// Create mocks inside the test file to avoid hoisting issues
const mockEq = vi.fn()
const mockUpdate = vi.fn()
const mockDelete = vi.fn()
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockContains = vi.fn()
const mockSingle = vi.fn()
const mockFrom = vi.fn()

const mockSupabase = {
  from: mockFrom
}

// Chain objects
const queryChain = {
  select: mockSelect,
  eq: mockEq,
  contains: mockContains,
  single: mockSingle,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete
}

const updateChain = {
  eq: mockEq
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabase),
  getCurrentUser: () => Promise.resolve({ id: "user_123" })
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn()
}))

describe("opportunity-status actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup chain returns
    mockFrom.mockReturnValue(queryChain)
    mockSelect.mockReturnValue(queryChain)
    mockEq.mockReturnValue(queryChain)
    mockContains.mockReturnValue(queryChain)
    
    // Update/Delete chains
    mockUpdate.mockReturnValue(updateChain)
    mockDelete.mockReturnValue(updateChain)
  })

  describe("updateStatus", () => {
    it("should insert new status if none exists", async () => {
      mockSingle.mockResolvedValueOnce({ data: null }) // No existing activity
      mockInsert.mockResolvedValueOnce({ error: null })

      await updateStatus("opp_1", "applied")

      expect(mockFrom).toHaveBeenCalledWith("user_activities")
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: "user_123",
        type: "opportunity_status",
        metadata: expect.objectContaining({
          opportunity_id: "opp_1",
          status: "applied"
        })
      }))
    })

    it("should update existing status", async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: "act_1" } }) // Existing
      
      // Setup mockEq for the update sequence
      // Note: eq is called twice in the SELECT phase (user_id, type) which are handled by default return (queryChain)
      // Then eq is called in UPDATE phase (id) which needs to return the promise result
      // But mockEq is the SAME function.
      // So we need to chain: chain -> chain -> promise
      
      // Reset default behavior to sequence
      mockEq
        .mockReturnValueOnce(queryChain) // select eq(user_id)
        .mockReturnValueOnce(queryChain) // select eq(type)
        .mockResolvedValueOnce({ error: null }) // update eq(id)

      mockUpdate.mockReturnValue(updateChain) // update() returns chain with eq

      await updateStatus("opp_1", "rejected")

      expect(mockUpdate).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith("id", "act_1")
    })

    it("should delete status if value is null", async () => {
      mockSingle.mockResolvedValueOnce({ data: { id: "act_1" } })
      
      // Same logic for delete: select eqs -> delete eq
      mockEq
        .mockReturnValueOnce(queryChain) // select eq(user_id)
        .mockReturnValueOnce(queryChain) // select eq(type)
        .mockResolvedValueOnce({ error: null }) // delete eq(id)

      await updateStatus("opp_1", null)

      expect(mockDelete).toHaveBeenCalled()
      expect(mockEq).toHaveBeenCalledWith("id", "act_1")
    })
  })

  describe("getStatuses", () => {
    it("should return map of opportunity statuses", async () => {
      // Mock the specific call sequence for getStatuses
      // from -> select -> eq -> eq -> data
      
      mockEq
        .mockReturnValueOnce(queryChain) // .eq('user_id', ...)
        .mockResolvedValueOnce({         // .eq('type', ...) returns data
          data: [
            { metadata: { opportunity_id: "opp_1", status: "applied" } },
            { metadata: { opportunity_id: "opp_2", status: "interested" } }
          ]
        })

      const result = await getStatuses()

      expect(result).toEqual({
        "opp_1": "applied",
        "opp_2": "interested"
      })
    })
  })
})
