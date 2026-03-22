'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Level = 0 | 1 | 2
const LEVEL_LABEL: Record<Level, string> = { 0: 'Novice', 1: 'Helm', 2: 'Skipper' }

type RejectedRow = {
  id: string
  created_at: string
  task_id: string
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

export default function MemberRejectedPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<RejectedRow[]>([])
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null)

  const hint = useMemo(() => {
    return 'If accepting fails, the task may be full or no longer matches your availability/level.'
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) return setError(userErr.message)
      const user = userRes.user
      if (!user) return setError('Not logged in. Go back to / and log in as a member.')

      const { data, error: rpcErr } = await supabase.rpc('get_rejected_available_tasks')
      if (rpcErr) return setError(rpcErr.message)
      setRows((data ?? []) as RejectedRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function accept(taskId: string) {
    setError('')
    setAcceptingTaskId(taskId)
    try {
      const { data, error: rpcErr } = await supabase.rpc('accept_task', { p_task_id: taskId })
      if (rpcErr) return setError(rpcErr.message)

      const row = Array.isArray(data) ? data[0] : data
      if (row?.assigned === false) {
        setError(`Could not assign: ${row?.reason ?? 'unknown'}. ${hint}`)
        return
      }

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAcceptingTaskId(null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Rejected</h2>
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
            <strong>No rejected tasks.</strong> Reject some tasks on <a href="/member/swipe">Swipe</a> to see them here.
          </p>
        </div>
      ) : null}

      <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
        {rows.map(r => {
          const level =
            r.required_level != null
              ? LEVEL_LABEL[Math.max(0, Math.min(2, r.required_level)) as Level]
              : '—'

          return (
            <div key={r.id} style={{ padding: 14, border: '1px solid #eee', borderRadius: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <strong>{r.title}</strong>
                <span style={{ color: '#444' }}>
                  {new Date(r.window_start).toLocaleString()} → {new Date(r.window_end).toLocaleString()}
                </span>
              </div>

              <div className="metaRow">
                {r.category ? <span className="metaChip">Category: {r.category}</span> : null}
                {r.location ? <span className="metaChip">Location: {r.location}</span> : null}
                {r.duration_minutes ? <span className="metaChip">Duration: {r.duration_minutes} min</span> : null}
                <span className="metaChip metaChipStrong">Level: {level}</span>
                <span className="metaChip">Needed: {r.needed_volunteers}</span>
              </div>

              {r.description ? <p style={{ marginTop: 10, marginBottom: 0 }}>{r.description}</p> : null}

              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => accept(r.task_id)}
                  disabled={!!acceptingTaskId || loading}
                  style={{
                    background: '#1a7f37',
                    color: 'white',
                    fontWeight: 600,
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid #166b2f',
                  }}
                >
                  {acceptingTaskId === r.task_id ? 'Accepting…' : 'Accept'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}

