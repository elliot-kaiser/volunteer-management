'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type TaskSummary = {
  id: string
  title: string
  window_start: string
  window_end: string
  location: string | null
  category: string | null
  needed_volunteers: number
  assigned_count: number
  completed_count: number
  assignments: {
    id: string
    state: 'assigned' | 'completed'
    member: {
      id: string
      email: string | null
    } | null
  }[]
}

export default function DirectorDashboardPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isDirector, setIsDirector] = useState(false)
  const [tasks, setTasks] = useState<TaskSummary[]>([])
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) return setError(userErr.message)
      const user = userRes.user
      if (!user) {
        setError('Not logged in. Go back to / and log in as a director.')
        return
      }

      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profErr) return setError(profErr.message)
      const director = profile?.role === 'director'
      setIsDirector(director)
      if (!director) {
        setError('This page is directors-only.')
        return
      }

      const { data, error: qErr } = await supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          window_start,
          window_end,
          location,
          category,
          needed_volunteers,
          assignments:assignments (
            id,
            state,
            member:profiles (
              id,
              email
            )
          )
        `
        )
        .order('window_start', { ascending: true })
        .limit(200)

      if (qErr) return setError(qErr.message)

      const transformed: TaskSummary[] = (data ?? []).map((t: any) => {
        const assigned = (t.assignments ?? []).filter((a: any) => a.state === 'assigned').length
        const completed = (t.assignments ?? []).filter((a: any) => a.state === 'completed').length
        return {
          id: t.id,
          title: t.title,
          window_start: t.window_start,
          window_end: t.window_end,
          location: t.location,
          category: t.category,
          needed_volunteers: t.needed_volunteers,
          assigned_count: assigned,
          completed_count: completed,
          assignments: t.assignments ?? [],
        }
      })

      setTasks(transformed)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function setAssignmentState(assignmentId: string, newState: 'assigned' | 'completed') {
    setUpdatingId(assignmentId)
    setError('')
    try {
      const { error: upErr } = await supabase
        .from('assignments')
        .update({ state: newState })
        .eq('id', assignmentId)

      if (upErr) return setError(upErr.message)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setUpdatingId(null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Dashboard</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading}>
            Refresh
          </button>
          <button onClick={signOut}>Log out</button>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {!loading && !isDirector ? null : null}

      <section style={{ marginTop: 18 }}>
        <h3 style={{ marginTop: 0 }}>Tasks overview</h3>
        <div style={{ display: 'grid', gap: 12 }}>
          {tasks.map(task => {
            const remaining = task.needed_volunteers - task.assigned_count
            const capacityText =
              remaining > 0
                ? `${task.assigned_count}/${task.needed_volunteers} assigned (${remaining} open)`
                : `${task.assigned_count}/${task.needed_volunteers} assigned (full)`

            return (
              <div
                key={task.id}
                style={{
                  padding: 14,
                  borderRadius: 14,
                  border: '1px solid var(--card-border)',
                  background: 'var(--card)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div>
                    <strong>{task.title}</strong>
                    <div style={{ marginTop: 4, color: 'var(--muted)', fontSize: 13 }}>
                      <div className="metaRow" style={{ marginTop: 6 }}>
                        {task.category ? <span className="metaChip">Category: {task.category}</span> : null}
                        {task.location ? <span className="metaChip">Location: {task.location}</span> : null}
                        <span className="metaChip metaChipStrong">
                          {new Date(task.window_start).toLocaleString()} → {new Date(task.window_end).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 160 }}>
                    <div style={{ fontSize: 13 }}>{capacityText}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                      Completed: {task.completed_count}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 13, marginBottom: 4 }}>Assigned members</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {task.assignments.length === 0 && (
                      <span style={{ fontSize: 13, color: 'var(--muted)' }}>No one assigned yet.</span>
                    )}
                    {task.assignments.map(a => (
                      <div
                        key={a.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: 8,
                          alignItems: 'center',
                          padding: '6px 8px',
                          borderRadius: 10,
                          background:
                            a.state === 'completed'
                              ? 'rgba(34,197,94,0.09)'
                              : 'rgba(148,163,184,0.12)',
                        }}
                      >
                        <span style={{ fontSize: 13 }}>
                          {a.member?.email ?? '(no email)'}
                          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                            {a.state === 'completed' ? 'Completed' : 'Assigned'}
                          </span>
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {a.state === 'assigned' && (
                            <button
                              onClick={() => setAssignmentState(a.id, 'completed')}
                              disabled={updatingId === a.id}
                              style={{
                                background: 'var(--accent-soft)',
                                color: 'var(--accent)',
                                borderColor: 'var(--accent)',
                                fontSize: 12,
                                padding: '4px 10px',
                                borderRadius: 999,
                              }}
                            >
                              {updatingId === a.id ? 'Saving…' : 'Mark done'}
                            </button>
                          )}
                          {a.state === 'completed' && (
                            <button
                              onClick={() => setAssignmentState(a.id, 'assigned')}
                              disabled={updatingId === a.id}
                              style={{
                                background: 'var(--danger-soft)',
                                color: 'var(--danger)',
                                borderColor: 'var(--danger)',
                                fontSize: 12,
                                padding: '4px 10px',
                                borderRadius: 999,
                              }}
                            >
                              {updatingId === a.id ? 'Saving…' : 'Undo'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
          {tasks.length === 0 && !loading && !error && (
            <p style={{ color: 'var(--muted)' }}>No tasks yet. Create some on the Tasks page.</p>
          )}
        </div>
      </section>
    </main>
  )
}

