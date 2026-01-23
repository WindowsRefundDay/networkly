"use client"

import { useEffect, useState } from "react"

interface SystemStats {
  database: { status: string; latency: number }
  apis: { name: string; status: string; lastChecked: string }[]
  errors: { timestamp: string; message: string; route: string }[]
}

interface GitHubStatus {
  branch: string
  commit: string
  behind: number
}

interface TestResult {
  status: string
  passed: number
  failed: number
  output: string
}

interface UserData {
  id: string
  email: string
  name: string
  clerkId: string
  createdAt: string
  lastLoginAt: string | null
  profileViews: number
  connections: number
}

interface AIQueryStats {
  total: number
  success: number
  failed: number
  errorRate: number
  avgLatency: number
  byProvider: Record<string, { total: number; success: number; failed: number }>
  byUseCase: Record<string, { total: number; success: number; failed: number }>
  recentErrors: Array<{
    id: string
    timestamp: string
    useCase: string
    provider: string
    model: string
    prompt: string
    error?: string
    latencyMs: number
  }>
}

export default function AdminPanel() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [github, setGithub] = useState<GitHubStatus | null>(null)
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [loading, setLoading] = useState({ stats: false, github: false, tests: false, pull: false, users: false, aiQueries: false })
  const [config, setConfig] = useState<Record<string, string>>({})
  const [users, setUsers] = useState<{ users: UserData[]; total: number } | null>(null)
  const [aiQueries, setAiQueries] = useState<AIQueryStats | null>(null)

  useEffect(() => {
    loadStats()
    loadGitHub()
    loadConfig()
    loadUsers()
    loadAIQueries()
  }, [])

  const loadStats = async () => {
    setLoading(prev => ({ ...prev, stats: true }))
    try {
      const res = await fetch("/api/admin/stats")
      const data = await res.json()
      setStats(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, stats: false }))
  }

  const loadGitHub = async () => {
    setLoading(prev => ({ ...prev, github: true }))
    try {
      const res = await fetch("/api/admin/github")
      const data = await res.json()
      setGithub(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, github: false }))
  }

  const loadConfig = async () => {
    try {
      const res = await fetch("/api/admin/config")
      const data = await res.json()
      setConfig(data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadUsers = async () => {
    setLoading(prev => ({ ...prev, users: true }))
    try {
      const res = await fetch("/api/admin/users")
      const data = await res.json()
      setUsers(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, users: false }))
  }

  const loadAIQueries = async () => {
    setLoading(prev => ({ ...prev, aiQueries: true }))
    try {
      const res = await fetch("/api/admin/ai-queries")
      const data = await res.json()
      setAiQueries(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, aiQueries: false }))
  }

  const runTests = async () => {
    setLoading(prev => ({ ...prev, tests: true }))
    try {
      const res = await fetch("/api/admin/test")
      const data = await res.json()
      setTestResult(data)
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, tests: false }))
  }

  const pullLatest = async () => {
    setLoading(prev => ({ ...prev, pull: true }))
    try {
      await fetch("/api/admin/github/pull", { method: "POST" })
      await loadGitHub()
    } catch (e) {
      console.error(e)
    }
    setLoading(prev => ({ ...prev, pull: false }))
  }

  const updateConfig = async (key: string, value: string) => {
    try {
      await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value })
      })
      setConfig(prev => ({ ...prev, [key]: value }))
    } catch (e) {
      console.error(e)
    }
  }

  return (
    <div style={{ padding: "20px", fontFamily: "monospace", maxWidth: "1400px" }}>
      <h1>Admin Panel</h1>
      
      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>System Status</h2>
        <button onClick={loadStats} disabled={loading.stats}>
          {loading.stats ? "Loading..." : "Refresh"}
        </button>
        {stats && (
          <>
            <h3>Database</h3>
            <p>Status: {stats.database.status}</p>
            <p>Latency: {stats.database.latency}ms</p>
            
            <h3>APIs</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {stats.apis.map((api, i) => (
                  <tr key={i}>
                    <td>{api.name}</td>
                    <td style={{ color: api.status === "ok" ? "green" : "red" }}>{api.status}</td>
                    <td>{api.lastChecked}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <h3>Recent Errors ({stats.errors.length})</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Route</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {stats.errors.slice(0, 10).map((err, i) => (
                  <tr key={i}>
                    <td>{new Date(err.timestamp).toLocaleString()}</td>
                    <td>{err.route}</td>
                    <td>{err.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>GitHub</h2>
        <button onClick={loadGitHub} disabled={loading.github}>
          {loading.github ? "Loading..." : "Refresh"}
        </button>
        <button onClick={pullLatest} disabled={loading.pull} style={{ marginLeft: "10px" }}>
          {loading.pull ? "Pulling..." : "Pull Latest"}
        </button>
        {github && (
          <>
            <p>Branch: {github.branch}</p>
            <p>Commit: {github.commit}</p>
            <p>Behind: {github.behind} commits</p>
          </>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>Tests</h2>
        <button onClick={runTests} disabled={loading.tests}>
          {loading.tests ? "Running..." : "Run Tests"}
        </button>
        {testResult && (
          <>
            <p>Status: <span style={{ color: testResult.status === "pass" ? "green" : "red" }}>{testResult.status}</span></p>
            <p>Passed: {testResult.passed}</p>
            <p>Failed: {testResult.failed}</p>
            <pre style={{ background: "#f4f4f4", padding: "10px", overflow: "auto", maxHeight: "300px" }}>
              {testResult.output}
            </pre>
          </>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>Configuration</h2>
        <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(config).map(([key, value]) => (
              <tr key={key}>
                <td>{key}</td>
                <td>
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ width: "100%", padding: "5px" }}
                  />
                </td>
                <td>
                  <button onClick={() => updateConfig(key, config[key])}>Update</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>Users ({users?.total || 0})</h2>
        <button onClick={loadUsers} disabled={loading.users}>
          {loading.users ? "Loading..." : "Refresh"}
        </button>
        {users && (
          <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px", fontSize: "12px" }}>
            <thead>
              <tr>
                <th>Email</th>
                <th>Name</th>
                <th>Created</th>
                <th>Last Login</th>
                <th>Views</th>
                <th>Connections</th>
              </tr>
            </thead>
            <tbody>
              {users.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.email}</td>
                  <td>{user.name}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                  <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                  <td>{user.profileViews}</td>
                  <td>{user.connections}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ border: "1px solid #ccc", padding: "15px", marginBottom: "20px" }}>
        <h2>AI Query Diagnostics</h2>
        <button onClick={loadAIQueries} disabled={loading.aiQueries}>
          {loading.aiQueries ? "Loading..." : "Refresh"}
        </button>
        {aiQueries && (
          <>
            <h3>Overview</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
              <tbody>
                <tr>
                  <td><strong>Total Queries</strong></td>
                  <td>{aiQueries.total}</td>
                  <td><strong>Success</strong></td>
                  <td style={{ color: "green" }}>{aiQueries.success}</td>
                  <td><strong>Failed</strong></td>
                  <td style={{ color: "red" }}>{aiQueries.failed}</td>
                </tr>
                <tr>
                  <td><strong>Error Rate</strong></td>
                  <td style={{ color: aiQueries.errorRate > 20 ? "red" : "green" }}>{aiQueries.errorRate.toFixed(2)}%</td>
                  <td><strong>Avg Latency</strong></td>
                  <td>{aiQueries.avgLatency.toFixed(0)}ms</td>
                  <td></td>
                  <td></td>
                </tr>
              </tbody>
            </table>

            <h3>By Provider</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Total</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(aiQueries.byProvider).map(([provider, stats]) => (
                  <tr key={provider}>
                    <td>{provider}</td>
                    <td>{stats.total}</td>
                    <td style={{ color: "green" }}>{stats.success}</td>
                    <td style={{ color: "red" }}>{stats.failed}</td>
                    <td>{stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>By Use Case</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th>Use Case</th>
                  <th>Total</th>
                  <th>Success</th>
                  <th>Failed</th>
                  <th>Error Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(aiQueries.byUseCase).map(([useCase, stats]) => (
                  <tr key={useCase}>
                    <td>{useCase}</td>
                    <td>{stats.total}</td>
                    <td style={{ color: "green" }}>{stats.success}</td>
                    <td style={{ color: "red" }}>{stats.failed}</td>
                    <td>{stats.total > 0 ? ((stats.failed / stats.total) * 100).toFixed(1) : 0}%</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Recent Errors ({aiQueries.recentErrors.length})</h3>
            <table border={1} cellPadding={5} style={{ width: "100%", marginTop: "10px", fontSize: "11px" }}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Provider</th>
                  <th>Model</th>
                  <th>Use Case</th>
                  <th>Prompt</th>
                  <th>Error</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {aiQueries.recentErrors.slice(0, 10).map((err) => (
                  <tr key={err.id}>
                    <td>{new Date(err.timestamp).toLocaleTimeString()}</td>
                    <td>{err.provider}</td>
                    <td>{err.model}</td>
                    <td>{err.useCase}</td>
                    <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" }}>{err.prompt}</td>
                    <td style={{ color: "red", maxWidth: "250px" }}>{err.error}</td>
                    <td>{err.latencyMs}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  )
}
