'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../../lib/supabase'

type ProfileLite = { id: string; email: string | null; role: string | null }
type MessageRow = {
  id: string
  sender_id: string
  receiver_id: string
  body: string
  created_at: string
}

export default function DirectorMessagesPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [meId, setMeId] = useState<string | null>(null)
  const [isDirector, setIsDirector] = useState(false)

  const [members, setMembers] = useState<ProfileLite[]>([])
  const [partnerId, setPartnerId] = useState<string>('')
  const [messages, setMessages] = useState<MessageRow[]>([])
  const [text, setText] = useState('')

  const canSend = useMemo(() => !!partnerId && text.trim().length > 0, [partnerId, text])

  async function load(partnerOverride?: string) {
    setLoading(true)
    setError('')
    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser()
      if (userErr) return setError(userErr.message)
      const user = userRes.user
      if (!user) return setError('Not logged in.')
      setMeId(user.id)

      const { data: prof, error: profErr } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
      if (profErr) return setError(profErr.message)
      const ok = prof?.role === 'director'
      setIsDirector(ok)
      if (!ok) return setError('This page is directors-only.')

      const { data: mems, error: mErr } = await supabase
        .from('profiles')
        .select('id,email,role')
        .eq('role', 'member')
        .order('email', { ascending: true })
        .limit(200)
      if (mErr) return setError(mErr.message)
      const list = (mems ?? []) as ProfileLite[]
      setMembers(list)
      const resolved = (partnerOverride ?? partnerId) || list[0]?.id || ''
      setPartnerId(resolved)

      if (!resolved) {
        setMessages([])
        return
      }

      const { data: msgs, error: qErr } = await supabase
        .from('messages')
        .select('id,sender_id,receiver_id,body,created_at')
        .or(
          `and(sender_id.eq.${user.id},receiver_id.eq.${resolved}),and(sender_id.eq.${resolved},receiver_id.eq.${user.id})`
        )
        .order('created_at', { ascending: true })
        .limit(300)
      if (qErr) return setError(qErr.message)
      setMessages((msgs ?? []) as MessageRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!meId) return
    const channel = supabase
      .channel('messages-director')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => load())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meId, partnerId])

  async function send() {
    if (!canSend || !meId) return
    setError('')
    try {
      const { error: insErr } = await supabase.from('messages').insert({
        sender_id: meId,
        receiver_id: partnerId,
        body: text.trim(),
      })
      if (insErr) return setError(insErr.message)
      setText('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <main style={{ fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Messages</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button onClick={signOut}>Log out</button>
        </div>
      </div>

      {error ? <p style={{ color: 'crimson' }}>{error}</p> : null}
      {loading ? <p>Loading…</p> : null}
      {!loading && !isDirector ? null : null}

      <div style={{ marginTop: 12 }}>
        <label>Member</label>
        <select
          style={{ width: '100%', marginTop: 6 }}
          value={partnerId}
          onChange={e => {
            const id = e.target.value
            setPartnerId(id)
            void load(id)
          }}
        >
          {members.length === 0 ? <option value="">No members</option> : null}
          {members.map(m => (
            <option key={m.id} value={m.id}>
              {m.email ?? m.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
        {messages.map(m => {
          const mine = m.sender_id === meId
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div
                style={{
                  maxWidth: '85%',
                  padding: '10px 12px',
                  borderRadius: 14,
                  background: mine ? 'rgba(56,189,248,0.14)' : 'rgba(148,163,184,0.14)',
                  border: `1px solid ${mine ? 'rgba(56,189,248,0.35)' : 'rgba(148,163,184,0.22)'}`,
                }}
              >
                <div style={{ fontSize: 14 }}>{m.body}</div>
                <div style={{ marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(m.created_at).toLocaleString()}
                </div>
              </div>
            </div>
          )
        })}
        {!loading && messages.length === 0 ? (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No messages yet. Send one below.</p>
        ) : null}
      </div>

      <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
        <input
          type="text"
          placeholder={members.length === 0 ? 'No members found' : 'Message this member…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send()
          }}
          disabled={members.length === 0}
        />
        <button onClick={send} disabled={!canSend}>
          Send
        </button>
      </div>
    </main>
  )
}

