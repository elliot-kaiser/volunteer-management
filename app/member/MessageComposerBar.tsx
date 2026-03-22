'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'

type ProfileLite = { id: string; email: string | null; role: string | null }

export default function MessageComposerBar() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [directors, setDirectors] = useState<ProfileLite[]>([])
  const [toId, setToId] = useState<string>('')
  const [text, setText] = useState('')
  const [enabled, setEnabled] = useState(false)

  const canSend = useMemo(() => {
    return !!toId && text.trim().length > 0
  }, [toId, text])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const { data: userRes } = await supabase.auth.getUser()
        if (!userRes.user) {
          setLoading(false)
          return
        }

        // Only show this bar for members (not directors).
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userRes.user.id)
          .maybeSingle()
        if (profErr) {
          setError(profErr.message)
          setLoading(false)
          return
        }
        if (prof?.role !== 'member') {
          setEnabled(false)
          setLoading(false)
          return
        }
        setEnabled(true)

        const { data, error: qErr } = await supabase
          .from('profiles')
          .select('id,email,role')
          .eq('role', 'director')
          .order('email', { ascending: true })
          .limit(100)

        if (qErr) {
          setError(qErr.message)
          setLoading(false)
          return
        }

        const list = (data ?? []) as ProfileLite[]
        setDirectors(list)
        if (!toId && list.length > 0) setToId(list[0].id)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send() {
    if (!canSend) return
    setError('')
    setNotice('')
    try {
      const { data: userRes } = await supabase.auth.getUser()
      const me = userRes.user
      if (!me) {
        setError('Not logged in.')
        return
      }

      const { error: insErr } = await supabase.from('messages').insert({
        sender_id: me.id,
        receiver_id: toId,
        body: text.trim(),
      })

      if (insErr) {
        setError(insErr.message)
        return
      }
      setText('')
      setNotice('Sent.')
      setTimeout(() => setNotice(''), 900)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  // If not logged in / not a member, don't render anything.
  if (loading || !enabled) return null

  return (
    <div className="messageComposerBar" role="region" aria-label="Quick message composer">
      <div className="messageComposerRow">
        <select value={toId} onChange={e => setToId(e.target.value)} aria-label="Message recipient">
          {directors.length === 0 ? <option value="">No directors</option> : null}
          {directors.map(d => (
            <option key={d.id} value={d.id}>
              {d.email ?? d.id.slice(0, 8)}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder={directors.length === 0 ? 'No directors found' : 'Message a director…'}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send()
          }}
          aria-label="Message text"
          disabled={directors.length === 0}
        />
        <button onClick={send} disabled={!canSend} className="messageComposerSend">
          Send
        </button>
      </div>
      {error ? <div className="messageComposerError">{error}</div> : null}
      {notice ? <div className="messageComposerNotice">{notice}</div> : null}
    </div>
  )
}

