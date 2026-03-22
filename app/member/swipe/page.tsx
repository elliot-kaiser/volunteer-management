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
}

function categoryIcon(category: string | null | undefined) {
    const c = (category ?? '').trim().toLowerCase()
    if (!c) return '📌'
    if (c.includes('infrastructure')) return '🏗️'
    if (c.includes('race')) return '🏁'
    if (c.includes('operations') || c.includes('ops')) return '⚙️'
    if (c.includes('maintenance') || c.includes('maint')) return '🛠️'
    return '📌'
}

export default function MemberSwipePage() {
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [task, setTask] = useState<TaskRow | null>(null)
    const [dragX, setDragX] = useState(0)
    const dragXRef = useRef(0)
    const [isDragging, setIsDragging] = useState(false)
    const [flash, setFlash] = useState<'accepted' | 'rejected' | null>(null)
    const [progress, setProgress] = useState<{ current: number; total: number; remaining: number } | null>(null)

    const hint = useMemo(() => {
        return (
            'If you see no tasks, make sure your member profile + availability is set, ' +
            'and tasks fit your level and time window.'
        )
    }, [])

    async function getNext() {
        setLoading(true)
        setError('')
        try {
            const { data: userRes, error: userErr } = await supabase.auth.getUser()
            if (userErr) return setError(userErr.message)
            const user = userRes.user
            if (!user) return setError('Not logged in. Go back to / and log in as a member.')

            const { data: t, error: rpcErr } = await supabase.rpc('get_next_task', { p_user_id: user.id })
            if (rpcErr) return setError(rpcErr.message)

            // Supabase RPC can return null, an object, an empty object, or (rarely) an empty array.
            const normalized: unknown = Array.isArray(t) ? (t[0] ?? null) : (t ?? null)
            const candidate = (normalized && typeof normalized === 'object' ? (normalized as any) : null) as
                | (TaskRow & { id?: unknown })
                | null
            setTask(candidate && typeof candidate.id === 'string' && candidate.id.length > 0 ? (candidate as TaskRow) : null)

            // Fetch progress counts (best-effort; UI still works if RPC missing)
            const { data: p, error: pErr } = await supabase.rpc('get_task_progress', { p_user_id: user.id })
            if (!pErr) {
                const row = Array.isArray(p) ? p[0] : p
                if (row && typeof row.current === 'number' && typeof row.total === 'number' && typeof row.remaining === 'number') {
                    setProgress(row)
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        getNext()
    }, [])

    async function accept() {
        if (!task) return
        setLoading(true)
        setError('')
        try {
            const { data, error: rpcErr } = await supabase.rpc('accept_task', { p_task_id: task.id })
            if (rpcErr) return setError(rpcErr.message)

            const row = Array.isArray(data) ? data[0] : data
            if (row?.assigned === false) {
                setError(`Could not assign: ${row?.reason ?? 'unknown'}`)
            }
            setFlash('accepted')
            setTimeout(() => setFlash(null), 650)
            await getNext()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    async function reject() {
        if (!task) return
        setLoading(true)
        setError('')
        try {
            const { error: rpcErr } = await supabase.rpc('reject_task', { p_task_id: task.id })
            if (rpcErr) return setError(rpcErr.message)
            setFlash('rejected')
            setTimeout(() => setFlash(null), 650)
            await getNext()
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e))
        } finally {
            setLoading(false)
        }
    }

    async function signOut() {
        await supabase.auth.signOut()
    }

    const levelLabel =
        task && task.required_level != null
            ? LEVEL_LABEL[Math.max(0, Math.min(2, task.required_level)) as Level]
            : '—'

    const showGhost = !!task && (progress?.remaining ?? 0) > 1
    const progressText =
        progress && progress.total > 0 ? `${Math.min(progress.current, progress.total)} of ${progress.total} tasks` : null
    const progressPct =
        progress && progress.total > 0
            ? Math.max(0, Math.min(1, progress.current / progress.total))
            : 0

    return (
        <main style={{ fontFamily: 'system-ui', position: 'relative', minHeight: '60vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Swipe Tasks</h2>
                <button onClick={signOut}>Log out</button>
            </div>

            {flash && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        pointerEvents: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 40,
                    }}
                >
                    <div
                        style={{
                            padding: 18,
                            borderRadius: 999,
                            border: `2px solid ${flash === 'accepted' ? '#22c55e' : '#f97373'}`,
                            backgroundColor: flash === 'accepted' ? 'rgba(34,197,94,0.14)' : 'rgba(248,113,113,0.14)',
                            color: flash === 'accepted' ? '#bbf7d0' : '#fecaca',
                            fontSize: 42,
                            fontWeight: 800,
                            minWidth: 96,
                            textAlign: 'center',
                            boxShadow: '0 18px 40px rgba(0,0,0,0.6)',
                            transform: 'scale(1)',
                        }}
                    >
                        {flash === 'accepted' ? '✓' : '✕'}
                    </div>
                </div>
            )}

            {loading ? <p>Loading…</p> : null}
            {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}

            {!loading && !task ? (
                <div style={{ marginTop: 18, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
                    <p style={{ marginTop: 0, marginBottom: 8 }}><strong>No matching tasks right now.</strong></p>
                    <p style={{ margin: 0 }}>{hint}</p>
                    <div style={{ marginTop: 12 }}>
                        <button onClick={getNext}>Try again</button>
                    </div>
                </div>
            ) : null}

            {task ? (
                <div style={{ marginTop: 18 }}>
                    {progressText ? (
                        <div style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{progressText}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    {progress?.remaining != null ? `${progress.remaining} remaining` : null}
                                </div>
                            </div>
                            <div
                                style={{
                                    marginTop: 6,
                                    height: 6,
                                    borderRadius: 999,
                                    background: 'rgba(148, 163, 184, 0.22)',
                                    overflow: 'hidden',
                                    border: '1px solid rgba(148, 163, 184, 0.18)',
                                }}
                                aria-label="Task progress"
                            >
                                <div
                                    style={{
                                        height: '100%',
                                        width: `${Math.round(progressPct * 100)}%`,
                                        background: 'linear-gradient(90deg, rgba(34,197,94,0.9), rgba(125,211,252,0.65))',
                                    }}
                                />
                            </div>
                        </div>
                    ) : null}

                    <div style={{ position: 'relative' }}>
                        {showGhost ? (
                            <>
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        transform: 'translate(8px, 7px)',
                                        borderRadius: 16,
                                        border: '2px solid rgba(15, 23, 42, 0.65)',
                                        background: 'rgba(7, 23, 38, 0.55)',
                                        zIndex: 0,
                                    }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        inset: 0,
                                        transform: 'translate(4px, 3px)',
                                        borderRadius: 16,
                                        border: '2px solid rgba(15, 23, 42, 0.55)',
                                        background: 'rgba(11, 31, 51, 0.55)',
                                        zIndex: 0,
                                    }}
                                />
                            </>
                        ) : null}

                        <section
                            style={{
                                position: 'relative',
                                zIndex: 1,
                                padding: 18,
                                border: '1px solid #1f2937',
                                borderRadius: 16,
                                background: 'var(--card)',
                                touchAction: 'pan-y',
                                userSelect: 'none',
                                transform: `translateX(${dragX}px) rotate(${dragX / 25}deg)`,
                                transition: isDragging ? 'none' : 'transform 160ms ease-out',
                            }}
                            onPointerDown={e => {
                                if (loading) return
                                setIsDragging(true)
                                dragXRef.current = 0
                                setDragX(0)
                                    ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
                            }}
                            onPointerMove={e => {
                                if (!isDragging) return
                                setDragX(prev => {
                                    const next = Math.max(-160, Math.min(160, prev + e.movementX))
                                    dragXRef.current = next
                                    return next
                                })
                            }}
                            onPointerUp={async e => {
                                if (!isDragging) return
                                    ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
                                setIsDragging(false)
                                const threshold = 80
                                const finalX = dragXRef.current
                                dragXRef.current = 0
                                setDragX(0)
                                if (finalX > threshold) {
                                    await accept()
                                } else if (finalX < -threshold) {
                                    await reject()
                                }
                            }}
                            onPointerCancel={e => {
                                if (!isDragging) return
                                    ; (e.target as HTMLElement).releasePointerCapture(e.pointerId)
                                setIsDragging(false)
                                dragXRef.current = 0
                                setDragX(0)
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 14,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 26,
                                        background: 'rgba(13, 36, 56, 0.55)',
                                        border: '1px solid rgba(241, 245, 249, 0.25)',
                                    }}
                                    aria-label="Category icon"
                                    title={task.category ?? undefined}
                                >
                                    {categoryIcon(task.category)}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                                    {task.category ? `Category: ${task.category}` : 'Category: —'}
                                </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                                <h3 style={{ margin: 0 }}>{task.title}</h3>
                                <span style={{ color: '#444' }}>
                                    {new Date(task.window_start).toLocaleString()} → {new Date(task.window_end).toLocaleString()}
                                </span>
                            </div>

                            <div className="metaRow">
                                {task.category ? <span className="metaChip">Category: {task.category}</span> : null}
                                {task.location ? <span className="metaChip">Location: {task.location}</span> : null}
                                {task.duration_minutes ? (
                                    <span className="metaChip">Duration: {task.duration_minutes} min</span>
                                ) : null}
                                <span className="metaChip metaChipStrong">Level: {levelLabel}</span>
                                <span className="metaChip">Needed: {task.needed_volunteers}</span>
                            </div>

                            {task.description ? <p style={{ marginTop: 12 }}>{task.description}</p> : null}

                            <p style={{ marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
                                Swipe right to accept · Swipe left to reject
                            </p>
                        </section>
                    </div>
                </div>
            ) : null}
        </main>
    )
}