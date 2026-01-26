import type { Database } from './lib/database.types';

// Simple inline definition of GenericSchema to test compatibility
type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}

type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, any>
  Functions: Record<string, any>
}

// Test if Database['public'] extends GenericSchema
type Test = Database['public'] extends GenericSchema ? 'yes' : 'no';
const test: Test = 'yes';  // This will error if it's 'no'

export {};
