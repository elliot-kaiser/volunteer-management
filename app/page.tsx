'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

type Mode = 'login' | 'member-signup' | 'director-signup'

const TAB: { key: Mode; label: string }[] = [
  { key: 'login', label: 'Log in' },
  { key: 'member-signup', label: 'Join as member' },
  { key: 'director-signup', label: 'Join as director' },
]

export default function Page() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const signingUpAsDirector = useRef(false)
  const [role, setRole] = useState<'member' | 'director' | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user
      setUserEmail(user?.email ?? null)
      if (user) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle()
        if (prof?.role === 'director' || prof?.role === 'member') {
          setRole(prof.role)
          if (prof.role === 'member') {
            const [{ count: slotCount }, { count: ruleCount }] = await Promise.all([
              supabase.from('availability_slots').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
              supabase.from('availability_rules').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
            ])
            if (((slotCount ?? 0) + (ruleCount ?? 0)) === 0 && !signingUpAsDirector.current) router.push('/member/profile')
          }
        } else {
          setRole(null)
        }
      } else {
        setRole(null)
      }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null
      setUserEmail(user?.email ?? null)
      if (!user) {
        setRole(null)
        return
      }
      if (signingUpAsDirector.current) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()
        .then(async ({ data: prof }) => {
          if (prof?.role === 'director' || prof?.role === 'member') {
            setRole(prof.role)
            if (prof.role === 'member') {
              const [{ count: slotCount }, { count: ruleCount }] = await Promise.all([
                supabase.from('availability_slots').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('availability_rules').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
              ])
              if (((slotCount ?? 0) + (ruleCount ?? 0)) === 0) router.push('/member/profile')
            }
          } else {
            setRole(null)
          }
        })
    })
    return () => sub.subscription.unsubscribe()
  }, [router])

  async function signUpMember() {
    setMsg('')
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setMsg('Signed up. Redirecting to profile…')
    router.push('/member/profile')
  }

  async function signUpDirector() {
    setMsg('')
    if (!inviteCode.trim()) { setMsg('Enter an invite code.'); return }
    setLoading(true)
    signingUpAsDirector.current = true
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      signingUpAsDirector.current = false
      setLoading(false)
      setMsg(error.message)
      return
    }
    if (!data.session) {
      signingUpAsDirector.current = false
      setLoading(false)
      setMsg('Check your email to confirm your account, then log in.')
      return
    }
    const { error: rpcError } = await supabase.rpc('claim_director_role', { p_code: inviteCode.trim() })
    signingUpAsDirector.current = false
    setLoading(false)
    if (rpcError) {
      setMsg('Invalid invite code. Your account was created as a member — contact an admin to be upgraded.')
      router.push('/member/profile')
      return
    }
    router.push('/director/tasks')
  }

  async function signIn() {
    setMsg('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) { setMsg(error.message); return }
    setMsg('Logged in.')
  }

  async function signOut() {
    setMsg('')
    const { error } = await supabase.auth.signOut()
    setMsg(error ? error.message : 'Logged out.')
  }

  function handleModeChange(next: Mode) {
    setMode(next)
    setMsg('')
    setInviteCode('')
  }

  const inputStyle = {
    width: '100%',
    padding: 8,
    margin: '6px 0 12px',
    borderRadius: 6,
    border: '1px solid #9ca3af',
    backgroundColor: 'var(--background-elevated)',
    color: 'var(--foreground)',
    boxSizing: 'border-box' as const,
  }

  return (
    <main style={{ maxWidth: 520, margin: '64px auto', fontFamily: 'system-ui', padding: '0 16px' }}>
      <div
        style={{
          padding: 24,
          borderRadius: 16,
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          boxShadow: '0 18px 40px rgba(15,23,42,0.55)',
        }}
      >
        <h2 style={{ marginTop: 0, marginBottom: 4 }}>TISC Volunteering</h2>
        <p style={{ marginTop: 0, marginBottom: 16, color: 'var(--muted)' }}>
          {userEmail ? `Logged in as: ${userEmail}` : 'Not logged in'}
        </p>

        {role && (
          <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Quick links:</span>
            {role === 'member' && (
              <>
                <a href="/member/swipe">Swipe tasks</a>
                <a href="/member/profile">Profile</a>
                <a href="/member/tasks">My tasks</a>
                <a href="/member/rejected">Rejected</a>
              </>
            )}
            {role === 'director' && (
              <>
                <a href="/director/tasks">Director tasks</a>
                <a href="/director/dashboard">Dashboard</a>
              </>
            )}
          </div>
        )}

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--card-border)', paddingBottom: 0 }}>
          {TAB.map(t => (
            <button
              key={t.key}
              onClick={() => handleModeChange(t.key)}
              style={{
                padding: '6px 12px',
                fontSize: 13,
                borderRadius: '6px 6px 0 0',
                border: 'none',
                cursor: 'pointer',
                background: mode === t.key ? 'var(--background-elevated)' : 'transparent',
                color: mode === t.key ? 'var(--foreground)' : 'var(--muted)',
                fontWeight: mode === t.key ? 600 : 400,
                marginBottom: -1,
                borderBottom: mode === t.key ? '2px solid var(--foreground)' : '2px solid transparent',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <label style={{ fontSize: 13 }}>Email</label>
        <input
          style={inputStyle}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label style={{ fontSize: 13 }}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        {mode === 'director-signup' && (
          <>
            <label style={{ fontSize: 13 }}>Director invite code</label>
            <input
              style={inputStyle}
              type="password"
              placeholder="Enter code provided by TISC"
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
            />
          </>
        )}

        <div style={{ marginTop: 12 }}>
          {mode === 'login' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={signIn} disabled={loading}>{loading ? 'Logging in…' : 'Log in'}</button>
              <button onClick={signOut}>Log out</button>
            </div>
          )}
          {mode === 'member-signup' && (
            <button onClick={signUpMember} disabled={loading}>{loading ? 'Creating account…' : 'Create member account'}</button>
          )}
          {mode === 'director-signup' && (
            <button onClick={signUpDirector} disabled={loading}>{loading ? 'Creating account…' : 'Create director account'}</button>
          )}
        </div>

        {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      </div>
    </main>
  )
}
