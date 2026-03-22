import type { ReactNode } from 'react'

export default function MemberLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobileShell">
      <div className="mobileTopBar">
        <div className="mobileTopBarTitle">TISC Volunteering</div>
        <a className="mobileTopBarLink" href="/">
          Home
        </a>
      </div>

      <div className="mobileContent">{children}</div>

      <nav className="mobileTabBar mobileTabBarMember" aria-label="Member navigation">
        <a className="mobileTab" href="/member/tasks" aria-label="My tasks" title="My tasks">
          ✅
        </a>
        <a className="mobileTab" href="/member/profile" aria-label="Profile" title="Profile">
          👤
        </a>
        <a className="mobileTab" href="/member/swipe" aria-label="Swipe" title="Swipe">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="6.5" y="4.5" width="12" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" opacity="0.65" />
            <rect x="5" y="6" width="12" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" opacity="0.85" />
            <rect x="3.5" y="7.5" width="12" height="14" rx="2.2" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </a>
        <a className="mobileTab" href="/member/rejected" aria-label="Rejected" title="Rejected">
          ✖️
        </a>
        <a className="mobileTab" href="/member/messages" aria-label="Messages" title="Messages">
          💬
        </a>
      </nav>
    </div>
  )
}

