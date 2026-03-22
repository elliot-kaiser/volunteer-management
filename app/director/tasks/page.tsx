'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Level = 0 | 1 | 2
const LEVEL_LABEL: Record<Level, string> = { 0: 'Novice', 1: 'Helm', 2: 'Skipper' }

type TaskRow = {
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
    created_at: string
}

export default function DirectorTasksPage() {
    const [loading, setLoading] = useState(true)
    const [isDirector, setIsDirector] = useState(false)
    const [error, setError] = useState<string>('')
    const loadInFlight = useRef(false)

    const [tasks, setTasks] = useState<TaskRow[]>([])
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const [title, setTitle] = useState('')
    const [description, setDescription] = useState('')
    const [location, setLocation] = useState('')
    const [category, setCategory] = useState('')
    const [durationMinutes, setDurationMinutes] = useState<string>('60')
    const [windowStart, setWindowStart] = useState<string>('')
    const [windowEnd, setWindowEnd] = useState<string>('')
    const [requiredLevel, setRequiredLevel] = useState<Level>(0)
    const [neededVolunteers, setNeededVolunteers] = useState<string>('1')

    const nowLocal = useMemo(() => {
        const d = new Date()
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
        return d.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
    }, [])

    useEffect(() => {
        if (!windowStart) setWindowStart(nowLocal)
        if (!windowEnd) {
            const d = new Date(nowLocal)
            d.setHours(d.getHours() + 2)
            setWindowEnd(d.toISOString().slice(0, 16))
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nowLocal])

    async function load() {
        if (loadInFlight.current) return
        loadInFlight.current = true
        setLoading(true)
        setError('')
        try {
            const { data: userRes, error: userErr } = await supabase.auth.getUser()
            if (userErr) {
                setError(userErr.message)
                return
            }
            if (!userRes.user) {
                setError('Not logged in. Go back to / and log in.')
                return
            }

            const { data: profile, error: profErr } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userRes.user.id)
                .maybeSingle()

            if (profErr) {
                setError(profErr.message)
                return
            }
            if (!profile) {
                setError('No profile row found for this user. (Your signup trigger may not have run.)')
                return
            }

            const ok = profile.role === 'director'
            setIsDirector(ok)
            if (!ok) {
                setError('This page is directors-only.')
                return
            }

            const { data: taskRows, error: taskErr } = await supabase
                .from('tasks')
                .select(
                    'id,title,description,location,category,duration_minutes,window_start,window_end,required_level,needed_volunteers,created_at'
                )
                .order('window_start', { ascending: true })
                .limit(200)

            if (taskErr) {
                setError(taskErr.message)
                setTasks([])
                return
            }
            setTasks((taskRows ?? []) as TaskRow[])
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            loadInFlight.current = false
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
        // Avoid re-calling load() on every auth token refresh; it can cause a "loading loop".
    }, [])

    async function createTask() {
        setError('')
        setLoading(true)
        try {
            if (!title.trim()) return setError('Title is required.')
            if (!windowStart || !windowEnd) return setError('Start and end times are required.')
            if (new Date(windowEnd) <= new Date(windowStart)) return setError('End must be after start.')

            const dur = durationMinutes.trim() ? Number(durationMinutes) : null
            if (dur !== null && (!Number.isFinite(dur) || dur <= 0)) return setError('Duration must be a positive number.')

            const needed = Number(neededVolunteers)
            if (!Number.isFinite(needed) || needed < 1) return setError('Needed volunteers must be >= 1.')

            const { data: userRes, error: userErr } = await supabase.auth.getUser()
            if (userErr) return setError(userErr.message)
            const userId = userRes.user?.id
            if (!userId) return setError('Not logged in.')

            const { error: insErr } = await supabase.from('tasks').insert({
                title: title.trim(),
                description: description.trim() ? description.trim() : null,
                location: location.trim() ? location.trim() : null,
                category: category.trim() ? category.trim() : null,
                duration_minutes: dur,
                window_start: new Date(windowStart).toISOString(),
                window_end: new Date(windowEnd).toISOString(),
                required_level: requiredLevel,
                needed_volunteers: needed,
                created_by: userId,
            })

            if (insErr) return setError(insErr.message)

            setTitle('')
            setDescription('')
            setLocation('')
            setCategory('')
            setDurationMinutes('60')
            setRequiredLevel(0)
            setNeededVolunteers('1')

            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    async function signOut() {
        await supabase.auth.signOut()
    }

    async function deleteTask(taskId: string) {
        setError('')
        setDeletingId(taskId)
        try {
            const { error: delErr } = await supabase.from('tasks').delete().eq('id', taskId)
            if (delErr) {
                setError(delErr.message)
                return
            }
            await load()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setDeletingId(null)
        }
    }

    return (
        <main style={{ fontFamily: 'system-ui' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Create tasks</h2>
                <button onClick={signOut}>Log out</button>
            </div>

            {loading ? <p>Loading…</p> : null}
            {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
            {!loading && !isDirector ? null : (
                <>
                    <section style={{ marginTop: 18, padding: 14, border: '1px solid #1f2937', borderRadius: 12 }}>
                        <h3 style={{ marginTop: 0 }}>Create a task</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div>
                                <label>Title</label>
                                <input style={{ width: '100%', padding: 8 }} value={title} onChange={e => setTitle(e.target.value)} />
                            </div>

                            <div>
                                <label>Category</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    placeholder="e.g. Maintenance, Race day, Safety"
                                    value={category}
                                    onChange={e => setCategory(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Location</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    placeholder="e.g. Dock A, Clubhouse"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Duration (minutes)</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    inputMode="numeric"
                                    value={durationMinutes}
                                    onChange={e => setDurationMinutes(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Window start</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    type="datetime-local"
                                    value={windowStart}
                                    onChange={e => setWindowStart(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Window end</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    type="datetime-local"
                                    value={windowEnd}
                                    onChange={e => setWindowEnd(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Required level</label>
                                <select
                                    style={{ width: '100%', padding: 8 }}
                                    value={requiredLevel}
                                    onChange={e => setRequiredLevel(Number(e.target.value) as Level)}
                                >
                                    <option value={0}>Novice (Beginner)</option>
                                    <option value={1}>Helm (Intermediate)</option>
                                    <option value={2}>Skipper (Expert)</option>
                                </select>
                            </div>

                            <div>
                                <label>Needed volunteers</label>
                                <input
                                    style={{ width: '100%', padding: 8 }}
                                    inputMode="numeric"
                                    value={neededVolunteers}
                                    onChange={e => setNeededVolunteers(e.target.value)}
                                />
                            </div>

                            <div>
                                <label>Description</label>
                                <textarea
                                    style={{ width: '100%', padding: 8, minHeight: 90 }}
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: 12 }}>
                            <button onClick={createTask}>Create task</button>
                        </div>
                    </section>

                    <section style={{ marginTop: 18 }}>
                        <h3>All tasks</h3>
                        <div style={{ display: 'grid', gap: 10 }}>
                            {tasks.map(t => (
                                <div key={t.id} style={{ padding: 12, border: '1px solid #eee', borderRadius: 12 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                        <div>
                                            <strong>{t.title}</strong>
                                            <div style={{ marginTop: 4, color: '#444', fontSize: 13 }}>
                                                {new Date(t.window_start).toLocaleString()} →{' '}
                                                {new Date(t.window_end).toLocaleString()}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => deleteTask(t.id)}
                                            disabled={deletingId === t.id}
                                            style={{
                                                background: 'var(--danger-soft)',
                                                color: 'var(--danger)',
                                                borderColor: 'var(--danger)',
                                                fontSize: 12,
                                                padding: '6px 12px',
                                                borderRadius: 999,
                                            }}
                                        >
                                            {deletingId === t.id ? 'Deleting…' : 'Delete'}
                                        </button>
                                    </div>

                                    <div className="metaRow">
                                        {t.category ? <span className="metaChip">Category: {t.category}</span> : null}
                                        {t.location ? <span className="metaChip">Location: {t.location}</span> : null}
                                        {t.duration_minutes ? (
                                            <span className="metaChip">Duration: {t.duration_minutes} min</span>
                                        ) : null}
                                        <span className="metaChip metaChipStrong">
                                            Level: {LEVEL_LABEL[Math.max(0, Math.min(2, t.required_level)) as Level]}
                                        </span>
                                        <span className="metaChip">Needed: {t.needed_volunteers}</span>
                                    </div>

                                    {t.description ? <p style={{ marginTop: 8, marginBottom: 0 }}>{t.description}</p> : null}
                                </div>
                            ))}
                            {tasks.length === 0 ? <p>No tasks yet.</p> : null}
                        </div>
                    </section>
                </>
            )}
        </main>
    )
}