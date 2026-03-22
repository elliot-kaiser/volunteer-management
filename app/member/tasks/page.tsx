'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Level = 0 | 1 | 2
const LEVEL_LABEL: Record<Level, string> = { 0: 'Novice', 1: 'Helm', 2: 'Skipper' }

type TaskEmbed = {
  id: string
  title: string
  description: string | null
  location: string | null
  category: string | null
  duration_minutes: number | null
  window_start: string
  window_end: string
  required_level: number
  needed_volunteers: number
}

type AssignmentRow = {
  id: string
  state: 'assigned' | 'completed'
  created_at: string
  task: TaskEmbed | null
}

function normalizeTaskEmbed(task: TaskEmbed | TaskEmbed[] | null): TaskEmbed | null {
  if (task == null) return null
  return Array.isArray(task) ? task[0] ?? null : task
}

export default function MemberTasksPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<AssignmentRow[]>([])
  const [unassigningId, setUnassigningId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) return setError(userErr.message)
      const user = userRes.user
      if (!user) return setError('Not logged in. Go back to / and log in as a member.')

      const { data, error: qErr } = await supabase
        .from('assignments')
        .select(
          `
          id,
          state,
          created_at,
          task:tasks (
            id,
            title,
            description,
            location,
            category,
            duration_minutes,
            window_start,
            window_end,
            required_level,
            needed_volunteers
          )
        `
        )
        .eq('member_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200)

      if (qErr) return setError(qErr.message)
      const raw = (data ?? []) as Array<{
        id: string
        state: 'assigned' | 'completed'
        created_at: string
        task: TaskEmbed | TaskEmbed[] | null
      }>
      setRows(
        raw.map(r => ({
          ...r,
          task: normalizeTaskEmbed(r.task),
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function unassign(taskId: string) {
    setError('')
    setUnassigningId(taskId)
    try {
      const { error: rpcErr } = await supabase.rpc('unassign_task', { p_task_id: taskId })
      if (rpcErr) return setError(rpcErr.message)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUnassigningId(null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>My Tasks</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading}>
            Refresh
          </button>
          <button onClick={signOut}>Log out</button>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

      {!loading && !error && rows.length === 0 ? (
        <div style={{ marginTop: 18, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
          <p style={{ margin: 0 }}>
            <strong>No accepted tasks yet.</strong> Go to <a href="/member/swipe">Swipe</a> and accept one.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {rows.map(r => {
          const t = r.task
          const level =
            t && t.required_level != null
              ? LEVEL_LABEL[Math.max(0, Math.min(2, t.required_level)) as Level]
              : '—'
          return (
            <div key={r.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{t?.title ?? '(Task missing)'}</strong>
                <span style={{ color: '#444' }}>
                  Status: <strong>{r.state}</strong>
                </span>
              </div>

              {t ? (
                <>
                  <div className="metaRow">
                    {t.category ? <span className="metaChip">Category: {t.category}</span> : null}
                    {t.location ? <span className="metaChip">Location: {t.location}</span> : null}
                    {t.duration_minutes ? <span className="metaChip">Duration: {t.duration_minutes} min</span> : null}
                    <span className="metaChip metaChipStrong">Level: {level}</span>
                    <span className="metaChip">Needed: {t.needed_volunteers}</span>
                  </div>

                  <div className="metaLine">
                    {new Date(t.window_start).toLocaleString()} → {new Date(t.window_end).toLocaleString()}
                  </div>

                  {t.description ? <p style={{ marginTop: 10, marginBottom: 0 }}>{t.description}</p> : null}

                  {r.state === 'assigned' ? (
                    <div style={{ marginTop: 12 }}>
                      <button
                        onClick={() => unassign(t.id)}
                        disabled={!!unassigningId || loading}
                        style={{
                          background: '#fbe2e2',
                          color: '#7a0011',
                          fontWeight: 600,
                          padding: '8px 12px',
                          borderRadius: 10,
                          border: '1px solid #f2b8b8',
                        }}
                      >
                        {unassigningId === t.id ? 'Unassigning…' : 'Unassign myself'}
                      </button>
                    </div>
                  ) : null}
                </>
              ) : (
                <p style={{ marginTop: 10, marginBottom: 0, color: '#666' }}>
                  This task record is not available (it may have been deleted).
                </p>
              )}
            </div>
          )
        })}
      </div>
    </main>
  )
}

