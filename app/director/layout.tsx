import type { ReactNode } from 'react'

export default function DirectorLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mobileShell">
      <div className="mobileTopBar">
        <div className="mobileTopBarTitle">TISC Volunteering · Director</div>
        <a className="mobileTopBarLink" href="/">
          Home
        </a>
      </div>

      <div className="mobileContent">{children}</div>

      <nav className="mobileTabBar mobileTabBarDirector" aria-label="Director navigation">
        <a className="mobileTab" href="/director/tasks" aria-label="Tasks" title="Tasks">
          📝
        </a>
        <a className="mobileTab" href="/director/dashboard" aria-label="Dashboard" title="Dashboard">
          📊
        </a>
        <a className="mobileTab" href="/director/messages" aria-label="Messages" title="Messages">
          💬
        </a>
      </nav>
    </div>
  )
}

