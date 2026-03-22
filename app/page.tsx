'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function Page() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState('')
  const [userEmail, setUserEmail] = useState<string | null>(null)
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
            if (((slotCount ?? 0) + (ruleCount ?? 0)) === 0) router.push('/member/profile')
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

  async function signUp() {
    setMsg('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg('Signed up. Redirecting to profile…')
    router.push('/member/profile')
  }

  async function signIn() {
    setMsg('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMsg(error.message)
      return
    }
    setMsg('Logged in.')
  }

  async function signOut() {
    setMsg('')
    const { error } = await supabase.auth.signOut()
    setMsg(error ? error.message : 'Logged out.')
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

        <label style={{ fontSize: 13 }}>Email</label>
        <input
          style={{
            width: '100%',
            padding: 8,
            margin: '6px 0 12px',
            borderRadius: 6,
            border: '1px solid #9ca3af',
            backgroundColor: 'var(--background-elevated)',
            color: 'var(--foreground)',
          }}
          value={email}
          onChange={e => setEmail(e.target.value)}
        />

        <label style={{ fontSize: 13 }}>Password</label>
        <input
          style={{
            width: '100%',
            padding: 8,
            margin: '6px 0 12px',
            borderRadius: 6,
            border: '1px solid #9ca3af',
            backgroundColor: 'var(--background-elevated)',
            color: 'var(--foreground)',
          }}
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
          <button onClick={signUp}>Sign up</button>
          <button onClick={signIn}>Log in</button>
          <button onClick={signOut}>Log out</button>
        </div>

        {msg ? <p style={{ marginTop: 12 }}>{msg}</p> : null}
      </div>
    </main>
  )
}