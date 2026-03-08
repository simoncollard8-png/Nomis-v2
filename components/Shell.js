'use client'
import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/',          label: 'Home',       sub: 'Dashboard overview' },
  { href: '/train',     label: 'Train',      sub: 'Log workouts' },
  { href: '/nutrition', label: 'Nutrition',  sub: 'Meals and macros' },
  { href: '/sleep',     label: 'Sleep',      sub: 'Sleep tracking' },
  { href: '/calendar',  label: 'Calendar',   sub: 'History and backfill' },
  { href: '/stats',     label: 'Stats',      sub: 'Charts and trends' },
  { href: '/settings',  label: 'Settings',   sub: 'Profile and config' },
]

export default function Shell({ children, title }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const pathname = usePathname()
  const overlayRef = useRef(null)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setMenuOpen(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div style={s.shell}>
      {/* ── Top bar ── */}
      <div style={s.topBar}>
        <div style={s.pageTitle}>{title || 'NOMIS'}</div>
        <button style={s.hamburger} onClick={() => setMenuOpen(true)} aria-label="Menu">
          <span style={{ ...s.hamLine, width: '20px' }} />
          <span style={{ ...s.hamLine, width: '16px' }} />
          <span style={{ ...s.hamLine, width: '12px' }} />
        </button>
      </div>

      {/* ── Page content ── */}
      <div style={s.content}>
        {children}
      </div>

      {/* ── Overlay ── */}
      {menuOpen && (
        <div
          ref={overlayRef}
          style={s.overlay}
          onClick={(e) => { if (e.target === overlayRef.current) setMenuOpen(false) }}
        />
      )}

      {/* ── Slide-out menu ── */}
      <div style={{
        ...s.menu,
        transform: menuOpen ? 'translateX(0)' : 'translateX(100%)',
      }}>
        <div style={s.menuHeader}>
          <div style={s.menuBrand}>NOMIS</div>
          <button style={s.menuClose} onClick={() => setMenuOpen(false)}>
            <span style={s.closeLine1} />
            <span style={s.closeLine2} />
          </button>
        </div>
        <div style={s.menuVersion}>
          <span style={s.versionDot} />
          v3.0 / Sonnet
        </div>
        <nav style={s.menuNav}>
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={s.menuLinkWrap}>
                <div style={{
                  ...s.menuLink,
                  ...(active ? s.menuLinkActive : {}),
                }}>
                  <div style={{
                    ...s.menuLinkLabel,
                    color: active ? '#fff' : 'var(--text2)',
                  }}>{item.label}</div>
                  <div style={s.menuLinkSub}>{item.sub}</div>
                </div>
                {active && <div style={s.activeBar} />}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}

const s = {
  shell: {
    minHeight: '100dvh',
    position: 'relative',
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px 0',
  },
  pageTitle: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.03em',
  },
  hamburger: {
    width: '36px',
    height: '36px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '5px',
    cursor: 'pointer',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    padding: 0,
  },
  hamLine: {
    display: 'block',
    height: '1.5px',
    background: 'var(--text2)',
    borderRadius: '1px',
    transition: 'width 0.15s',
  },
  content: {
    padding: '0 0 40px',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 998,
  },
  menu: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: '280px',
    background: 'var(--bg2)',
    borderLeft: '1px solid var(--border2)',
    zIndex: 999,
    display: 'flex',
    flexDirection: 'column',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '-20px 0 60px rgba(0,0,0,0.3)',
  },
  menuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 12px',
  },
  menuBrand: {
    fontFamily: 'var(--font-body)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '-0.02em',
  },
  menuClose: {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    borderRadius: '8px',
    background: 'transparent',
    border: 'none',
    position: 'relative',
  },
  closeLine1: {
    position: 'absolute',
    width: '16px',
    height: '1.5px',
    background: 'var(--text2)',
    borderRadius: '1px',
    transform: 'rotate(45deg)',
  },
  closeLine2: {
    position: 'absolute',
    width: '16px',
    height: '1.5px',
    background: 'var(--text2)',
    borderRadius: '1px',
    transform: 'rotate(-45deg)',
  },
  menuVersion: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--text3)',
    letterSpacing: '0.1em',
    padding: '0 24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  versionDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--teal)',
    boxShadow: '0 0 6px rgba(45,212,191,0.3)',
  },
  menuNav: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    padding: '0 12px',
    flex: 1,
  },
  menuLinkWrap: {
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  },
  menuLink: {
    flex: 1,
    padding: '14px 12px',
    borderRadius: '10px',
    transition: 'background 0.15s',
  },
  menuLinkActive: {
    background: 'rgba(255,255,255,0.04)',
  },
  menuLinkLabel: {
    fontSize: '0.95rem',
    fontWeight: '600',
    letterSpacing: '-0.01em',
    transition: 'color 0.15s',
  },
  menuLinkSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.48rem',
    color: 'var(--text3)',
    letterSpacing: '0.06em',
    marginTop: '3px',
  },
  activeBar: {
    width: '3px',
    height: '24px',
    borderRadius: '2px',
    background: 'linear-gradient(180deg, var(--cyan), var(--teal))',
    boxShadow: '0 0 8px rgba(34,211,238,0.15)',
    position: 'absolute',
    right: '4px',
  },
}
