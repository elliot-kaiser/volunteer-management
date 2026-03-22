'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type Level = 0 | 1 | 2

function toLocalDateTimeInputValue(isoOrDate: string | Date) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16) // yyyy-mm-ddThh:mm
}

function localInputToIso(value: string) {
  // value is "YYYY-MM-DDTHH:mm" in local time
  return new Date(value).toISOString()
}

type ProfileRow = {
  id: string
  role: string
  sailing_level: number
  ability_notes: string | null
}

type SlotRow = {
  id: string
  start_ts: string
  end_ts: string
}

type RuleRow = {
  id: string
  days: number[] // 0=Sun..6=Sat
  start_time: string // HH:mm:ss
  end_time: string // HH:mm:ss
  timezone: string
}

export default function MemberProfilePage() {
  const [loading, setLoading] = useState(true)
  const [savingProfile, setSavingProfile] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [level, setLevel] = useState<Level>(0)
  const [abilityNotes, setAbilityNotes] = useState('')

  const [slots, setSlots] = useState<SlotRow[]>([])
  const [newStart, setNewStart] = useState('')
  const [newEnd, setNewEnd] = useState('')
  const [slotBusyId, setSlotBusyId] = useState<string | null>(null)

  const [rules, setRules] = useState<RuleRow[]>([])
  const [ruleDays, setRuleDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [ruleStart, setRuleStart] = useState('17:00')
  const [ruleEnd, setRuleEnd] = useState('21:00')
  const [ruleBusyId, setRuleBusyId] = useState<string | null>(null)

  const nowLocal = useMemo(() => {
    const d = new Date()
    return toLocalDateTimeInputValue(d)
  }, [])

  useEffect(() => {
    if (!newStart) setNewStart(nowLocal)
    if (!newEnd) {
      const d = new Date(nowLocal)
      d.setHours(d.getHours() + 2)
      setNewEnd(toLocalDateTimeInputValue(d))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowLocal])

  async function load() {
    setLoading(true)
    setError('')
    setNotice('')
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) return setError(userErr.message)
      const user = userRes.user
      if (!user) return setError('Not logged in. Go back to / and log in as a member.')

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('id,role,sailing_level,ability_notes')
        .eq('id', user.id)
        .maybeSingle()

      if (profErr) return setError(profErr.message)
      if (!prof) return setError('No profile row found for this user.')

      setProfile(prof as ProfileRow)
      setLevel(Math.max(0, Math.min(2, (prof as any).sailing_level ?? 0)) as Level)
      setAbilityNotes(((prof as any).ability_notes ?? '') as string)

      const { data: slotRows, error: slotErr } = await supabase
        .from('availability_slots')
        .select('id,start_ts,end_ts')
        .eq('user_id', user.id)
        .order('start_ts', { ascending: true })
        .limit(200)

      if (slotErr) return setError(slotErr.message)
      setSlots((slotRows ?? []) as SlotRow[])

      const { data: ruleRows, error: ruleErr } = await supabase
        .from('availability_rules')
        .select('id,days,start_time,end_time,timezone')
        .eq('user_id', user.id)
        .order('id', { ascending: false })
        .limit(200)

      // If the table isn't created yet, don't break the page.
      if (ruleErr && !ruleErr.message.toLowerCase().includes('does not exist')) return setError(ruleErr.message)
      setRules((ruleRows ?? []) as RuleRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  async function saveProfile() {
    if (!profile) return
    setSavingProfile(true)
    setError('')
    setNotice('')
    try {
      const { error: upErr } = await supabase
        .from('profiles')
        .update({
          sailing_level: level,
          ability_notes: abilityNotes.trim() ? abilityNotes.trim() : null,
        })
        .eq('id', profile.id)

      if (upErr) return setError(upErr.message)
      setNotice('Saved.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingProfile(false)
    }
  }

  async function addSlot() {
    setError('')
    setNotice('')
    if (!newStart || !newEnd) return setError('Start and end are required.')
    if (new Date(newEnd) <= new Date(newStart)) return setError('End must be after start.')

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr) return setError(userErr.message)
    const user = userRes.user
    if (!user) return setError('Not logged in.')

    setSlotBusyId('new')
    try {
      const { error: insErr } = await supabase.from('availability_slots').insert({
        user_id: user.id,
        start_ts: localInputToIso(newStart),
        end_ts: localInputToIso(newEnd),
      })
      if (insErr) return setError(insErr.message)
      setNotice('Availability added.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSlotBusyId(null)
    }
  }

  async function updateSlot(slotId: string, startLocal: string, endLocal: string) {
    setError('')
    setNotice('')
    if (!startLocal || !endLocal) return setError('Start and end are required.')
    if (new Date(endLocal) <= new Date(startLocal)) return setError('End must be after start.')

    setSlotBusyId(slotId)
    try {
      const { error: upErr } = await supabase
        .from('availability_slots')
        .update({
          start_ts: localInputToIso(startLocal),
          end_ts: localInputToIso(endLocal),
        })
        .eq('id', slotId)

      if (upErr) return setError(upErr.message)
      setNotice('Availability updated.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSlotBusyId(null)
    }
  }

  async function deleteSlot(slotId: string) {
    setError('')
    setNotice('')
    setSlotBusyId(slotId)
    try {
      const { error: delErr } = await supabase.from('availability_slots').delete().eq('id', slotId)
      if (delErr) return setError(delErr.message)
      setNotice('Availability deleted.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSlotBusyId(null)
    }
  }

  function toggleDay(d: number) {
    setRuleDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => a - b)))
  }

  async function addRule() {
    setError('')
    setNotice('')
    if (ruleDays.length === 0) return setError('Pick at least one day.')
    if (!ruleStart || !ruleEnd) return setError('Start and end times are required.')
    if (ruleEnd <= ruleStart) return setError('End time must be after start time.')

    const { data: userRes, error: userErr } = await supabase.auth.getUser()
    if (userErr) return setError(userErr.message)
    const user = userRes.user
    if (!user) return setError('Not logged in.')

    setRuleBusyId('new')
    try {
      const { error: insErr } = await supabase.from('availability_rules').insert({
        user_id: user.id,
        days: ruleDays,
        start_time: `${ruleStart}:00`,
        end_time: `${ruleEnd}:00`,
        timezone: 'America/Toronto',
      })
      if (insErr) return setError(insErr.message)
      setNotice('Recurring availability added.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRuleBusyId(null)
    }
  }

  async function deleteRule(ruleId: string) {
    setError('')
    setNotice('')
    setRuleBusyId(ruleId)
    try {
      const { error: delErr } = await supabase.from('availability_rules').delete().eq('id', ruleId)
      if (delErr) return setError(delErr.message)
      setNotice('Recurring availability deleted.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setRuleBusyId(null)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Profile</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load} disabled={loading}>
            Refresh
          </button>
          <button onClick={signOut}>Log out</button>
        </div>
      </div>

      {loading ? <p>Loading…</p> : null}
      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {notice ? <p style={{ color: '#166b2f' }}>{notice}</p> : null}

      {!loading && profile ? (
        <>
          <section style={{ marginTop: 18, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Member info</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, alignItems: 'start' }}>
              <div>
                <label>Sailing level</label>
                <select
                  style={{ width: '100%', padding: 8, marginTop: 6 }}
                  value={level}
                  onChange={e => setLevel(Number(e.target.value) as Level)}
                >
                  <option value={0}>Novice (Beginner)</option>
                  <option value={1}>Helm (Intermediate)</option>
                  <option value={2}>Skipper (Expert)</option>
                </select>
              </div>

              <div>
                <label>Ability notes</label>
                <textarea
                  style={{ width: '100%', padding: 8, marginTop: 6, minHeight: 90 }}
                  value={abilityNotes}
                  onChange={e => setAbilityNotes(e.target.value)}
                  placeholder="Anything directors should know (lifting limits, injuries, etc.)"
                />
              </div>
            </div>

            <div style={{ marginTop: 12 }}>
              <button onClick={saveProfile} disabled={savingProfile || loading}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </section>

          <section style={{ marginTop: 18, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Availability</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <label>Start</label>
                <input
                  style={{ width: '100%', padding: 8, marginTop: 6 }}
                  type="datetime-local"
                  value={newStart}
                  onChange={e => setNewStart(e.target.value)}
                />
              </div>
              <div>
                <label>End</label>
                <input
                  style={{ width: '100%', padding: 8, marginTop: 6 }}
                  type="datetime-local"
                  value={newEnd}
                  onChange={e => setNewEnd(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addSlot} disabled={slotBusyId === 'new' || loading}>
                  {slotBusyId === 'new' ? 'Adding…' : 'Add'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {slots.map(s => (
                <AvailabilityRow
                  key={s.id}
                  slot={s}
                  busy={slotBusyId === s.id || loading}
                  onSave={(startLocal, endLocal) => updateSlot(s.id, startLocal, endLocal)}
                  onDelete={() => deleteSlot(s.id)}
                />
              ))}
              {slots.length === 0 ? <p style={{ margin: 0, color: '#555' }}>No availability yet. Add a slot above.</p> : null}
            </div>
          </section>

          <section style={{ marginTop: 18, padding: 14, border: '1px solid #ddd', borderRadius: 12 }}>
            <h3 style={{ marginTop: 0 }}>Recurring availability</h3>
            <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: 13 }}>
              Use this for patterns like “Weekdays 5–9pm”. For prototype simplicity, tasks are matched based on the task’s start day/time.
            </p>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {[
                ['Sun', 0],
                ['Mon', 1],
                ['Tue', 2],
                ['Wed', 3],
                ['Thu', 4],
                ['Fri', 5],
                ['Sat', 6],
              ].map(([label, d]) => (
                <button
                  key={String(d)}
                  onClick={() => toggleDay(d as number)}
                  disabled={loading}
                  style={{
                    background: ruleDays.includes(d as number) ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.12)',
                    borderColor: ruleDays.includes(d as number) ? 'rgba(34,197,94,0.55)' : 'rgba(148,163,184,0.25)',
                    color: ruleDays.includes(d as number) ? '#bbf7d0' : 'rgba(241,245,249,0.92)',
                    padding: '6px 10px',
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
              <div>
                <label>Start time</label>
                <input type="time" value={ruleStart} onChange={e => setRuleStart(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
              </div>
              <div>
                <label>End time</label>
                <input type="time" value={ruleEnd} onChange={e => setRuleEnd(e.target.value)} style={{ width: '100%', marginTop: 6 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={addRule} disabled={ruleBusyId === 'new' || loading}>
                  {ruleBusyId === 'new' ? 'Adding…' : 'Add recurring'}
                </button>
              </div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 10 }}>
              {rules.map(r => (
                <div key={r.id} style={{ padding: 12, border: '1px solid #1f2937', borderRadius: 12 }}>
                  <div className="metaRow">
                    <span className="metaChip metaChipStrong">
                      {r.days
                        .map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d] ?? String(d))
                        .join(', ')}
                    </span>
                    <span className="metaChip">
                      {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)}
                    </span>
                    <span className="metaChip">{r.timezone}</span>
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => deleteRule(r.id)}
                      disabled={ruleBusyId === r.id || loading}
                      style={{
                        background: 'var(--danger-soft)',
                        color: 'var(--danger)',
                        borderColor: 'var(--danger)',
                        fontSize: 12,
                        padding: '6px 12px',
                        borderRadius: 999,
                      }}
                    >
                      {ruleBusyId === r.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
              {rules.length === 0 ? <p style={{ margin: 0, color: '#555' }}>No recurring availability yet.</p> : null}
            </div>
          </section>
        </>
      ) : null}
    </main>
  )
}

function AvailabilityRow({
  slot,
  busy,
  onSave,
  onDelete,
}: {
  slot: SlotRow
  busy: boolean
  onSave: (startLocal: string, endLocal: string) => void
  onDelete: () => void
}) {
  const [startLocal, setStartLocal] = useState(() => toLocalDateTimeInputValue(slot.start_ts))
  const [endLocal, setEndLocal] = useState(() => toLocalDateTimeInputValue(slot.end_ts))

  useEffect(() => {
    setStartLocal(toLocalDateTimeInputValue(slot.start_ts))
    setEndLocal(toLocalDateTimeInputValue(slot.end_ts))
  }, [slot.start_ts, slot.end_ts])

  return (
    <div style={{ padding: 12, border: '1px solid #1f2937', borderRadius: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label>Start</label>
          <input
            style={{ width: '100%', padding: 8, marginTop: 6 }}
            type="datetime-local"
            value={startLocal}
            onChange={e => setStartLocal(e.target.value)}
            disabled={busy}
          />
        </div>
        <div>
          <label>End</label>
          <input
            style={{ width: '100%', padding: 8, marginTop: 6 }}
            type="datetime-local"
            value={endLocal}
            onChange={e => setEndLocal(e.target.value)}
            disabled={busy}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
          <button onClick={() => onSave(startLocal, endLocal)} disabled={busy}>
            Save
          </button>
          <button
            onClick={onDelete}
            disabled={busy}
            style={{
              background: '#fbe2e2',
              color: '#7a0011',
              fontWeight: 600,
              border: '1px solid #f2b8b8',
              borderRadius: 10,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}

