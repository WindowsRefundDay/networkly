"use client"

import { useState, useEffect } from "react"
import { GlassCard } from "@/components/ui/glass-card"
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Loader2, RefreshCw, GitBranch, Terminal, Settings, Users, Activity, Database, Server, AlertCircle } from "lucide-react"

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
    <div className="space-y-6 container mx-auto px-4 sm:px-6 max-w-7xl py-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Admin Panel</h1>
        <p className="text-muted-foreground">System monitoring and management</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* System Status */}
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Button variant="ghost" size="icon" onClick={loadStats} disabled={loading.stats}>
              {loading.stats ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {stats ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Database</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{stats.database.latency}ms</span>
                    <Badge variant={stats.database.status === 'connected' ? 'default' : 'destructive'}>
                      {stats.database.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Server className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">APIs</span>
                  </div>
                  {stats.apis.map((api, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{api.name}</span>
                      <Badge variant={api.status === 'ok' ? 'outline' : 'destructive'} className={api.status === 'ok' ? 'text-green-500 border-green-500' : ''}>
                        {api.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </GlassCard>

        {/* GitHub Status */}
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GitHub</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={loadGitHub} disabled={loading.github}>
                {loading.github ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={pullLatest} disabled={loading.pull}>
                {loading.pull ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitBranch className="h-4 w-4" />}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {github ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Branch</span>
                  <span className="font-mono">{github.branch}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Commit</span>
                  <span className="font-mono">{github.commit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Behind</span>
                  <Badge variant={github.behind > 0 ? 'secondary' : 'outline'}>
                    {github.behind} commits
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </GlassCard>

        {/* Tests */}
        <GlassCard>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tests</CardTitle>
            <Button variant="ghost" size="icon" onClick={runTests} disabled={loading.tests}>
              {loading.tests ? <Loader2 className="h-4 w-4 animate-spin" /> : <Terminal className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {testResult ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant={testResult.status === 'pass' ? 'default' : 'destructive'}>
                    {testResult.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span>Passed</span>
                    <span className="font-bold text-green-600">{testResult.passed}</span>
                  </div>
                  <div className="flex justify-between p-2 bg-red-500/10 rounded">
                    <span>Failed</span>
                    <span className="font-bold text-red-600">{testResult.failed}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center p-4">
                Run tests to see results
              </div>
            )}
          </CardContent>
        </GlassCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Errors */}
        <GlassCard className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Recent Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.errors && stats.errors.length > 0 ? (
              <div className="space-y-4">
                {stats.errors.slice(0, 5).map((err, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 bg-muted/50 rounded-lg text-sm">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{new Date(err.timestamp).toLocaleString()}</span>
                      <span className="font-mono">{err.route}</span>
                    </div>
                    <p className="text-destructive font-medium line-clamp-2">{err.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">No recent errors</div>
            )}
          </CardContent>
        </GlassCard>

        {/* Configuration */}
        <GlassCard className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {Object.entries(config).map(([key, value]) => (
                <div key={key} className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">{key}</label>
                  <div className="flex gap-2">
                    <Input
                      value={value}
                      onChange={(e) => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      className="font-mono text-xs"
                    />
                    <Button size="sm" onClick={() => updateConfig(key, config[key])}>Save</Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </GlassCard>
      </div>

      {/* Users */}
      <GlassCard>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Users ({users?.total || 0})
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={loadUsers} disabled={loading.users}>
            {loading.users ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {users ? (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 font-medium text-muted-foreground">Name</th>
                    <th className="py-2 font-medium text-muted-foreground">Email</th>
                    <th className="py-2 font-medium text-muted-foreground">Joined</th>
                    <th className="py-2 font-medium text-muted-foreground">Last Login</th>
                    <th className="py-2 font-medium text-muted-foreground text-right">Views</th>
                    <th className="py-2 font-medium text-muted-foreground text-right">Connections</th>
                  </tr>
                </thead>
                <tbody>
                  {users.users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 font-medium">{user.name}</td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3 text-muted-foreground">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="py-3 text-muted-foreground">
                        {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-3 text-right">{user.profileViews}</td>
                      <td className="py-3 text-right">{user.connections}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </CardContent>
      </GlassCard>

      {/* AI Query Diagnostics */}
      <GlassCard>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            AI Query Diagnostics
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={loadAIQueries} disabled={loading.aiQueries}>
            {loading.aiQueries ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          {aiQueries ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <div className="text-sm text-muted-foreground">Total Queries</div>
                  <div className="text-2xl font-bold">{aiQueries.total}</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="text-sm text-green-600">Success</div>
                  <div className="text-2xl font-bold text-green-700">{aiQueries.success}</div>
                </div>
                <div className="p-4 bg-red-500/10 rounded-lg">
                  <div className="text-sm text-red-600">Failed</div>
                  <div className="text-2xl font-bold text-red-700">{aiQueries.failed}</div>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-lg">
                  <div className="text-sm text-blue-600">Avg Latency</div>
                  <div className="text-2xl font-bold text-blue-700">{aiQueries.avgLatency.toFixed(0)}ms</div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-medium mb-3">By Provider</h3>
                  <div className="space-y-2">
                    {Object.entries(aiQueries.byProvider).map(([provider, stats]) => (
                      <div key={provider} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium capitalize">{provider}</span>
                        <div className="flex gap-3 text-sm">
                          <span className="text-green-600">{stats.success}</span>
                          <span className="text-red-600">{stats.failed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium mb-3">By Use Case</h3>
                  <div className="space-y-2">
                    {Object.entries(aiQueries.byUseCase).map(([useCase, stats]) => (
                      <div key={useCase} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium capitalize">{useCase}</span>
                        <div className="flex gap-3 text-sm">
                          <span className="text-green-600">{stats.success}</span>
                          <span className="text-red-600">{stats.failed}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {aiQueries.recentErrors.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-3">Recent AI Errors</h3>
                  <div className="border rounded-md overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Time</th>
                          <th className="p-2 text-left">Provider</th>
                          <th className="p-2 text-left">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiQueries.recentErrors.slice(0, 5).map((err) => (
                          <tr key={err.id} className="border-t">
                            <td className="p-2">{new Date(err.timestamp).toLocaleTimeString()}</td>
                            <td className="p-2">{err.provider}</td>
                            <td className="p-2 text-red-600 truncate max-w-[200px]" title={err.error}>{err.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </GlassCard>
    </div>
  )
}
