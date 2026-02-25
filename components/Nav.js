'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Clean SVG icons — no emojis anywhere
const Icons = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  fitness: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h1.5v11H6.5zM16 6.5h1.5v11H16z"/>
      <path d="M4 9.5H6.5M17.5 9.5H20M4 14.5H6.5M17.5 14.5H20M8 10.5h8v3H8z"/>
    </svg>
  ),
  workout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h1.5v11H6.5zM16 6.5h1.5v11H16z"/>
      <path d="M4 9H6.5M17.5 9H20M4 15H6.5M17.5 15H20M8 11h8v2H8z"/>
    </svg>
  ),
  diet: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C8 2 4 6 4 10c0 3 1.5 5.5 4 7v3h8v-3c2.5-1.5 4-4 4-7 0-4-4-8-8-8z"/>
      <path d="M9 17v-2M12 17v-4M15 17v-2"/>
    </svg>
  ),
  cardio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h3l2-7 3 14 3-10 2 3h5"/>
    </svg>
  ),
  sleep: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
    </svg>
  ),
  body: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="2"/>
      <path d="M12 7v6M9 10h6M9 22l3-9 3 9"/>
    </svg>
  ),
  peptides: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6l1 4H8L9 3z"/>
      <path d="M8 7l-1 11a1 1 0 001 1h8a1 1 0 001-1L16 7"/>
      <path d="M10 11h4M10 15h4"/>
    </svg>
  ),
  supps: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="12" rx="8" ry="4" transform="rotate(-45 12 12)"/>
      <path d="M6.34 6.34l11.32 11.32"/>
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
}

const NAV_ITEMS = [
  { href: '/',                    label: 'DASHBOARD',   icon: 'dashboard' },
  { href: '/fitness',             label: 'FITNESS HUB', icon: 'fitness'   },
  { href: '/fitness/workout',     label: 'WORKOUT',     icon: 'workout'   },
  { href: '/fitness/diet',        label: 'DIET',        icon: 'diet'      },
  { href: '/fitness/cardio',      label: 'CARDIO',      icon: 'cardio'    },
  { href: '/fitness/sleep',       label: 'SLEEP',       icon: 'sleep'     },
  { href: '/fitness/body',        label: 'BODY',        icon: 'body'      },
  { href: '/fitness/peptides',    label: 'PEPTIDES',    icon: 'peptides'  },
  { href: '/fitness/supplements', label: 'SUPPS',       icon: 'supps'     },
  { href: '/settings',            label: 'SETTINGS',    icon: 'settings'  },
]

const BOTTOM_NAV = [
  { href: '/',                label: 'HOME',    icon: 'dashboard' },
  { href: '/fitness',         label: 'FITNESS', icon: 'fitness'   },
  { href: '/fitness/workout', label: 'WORKOUT', icon: 'workout'   },
  { href: '/fitness/diet',    label: 'DIET',    icon: 'diet'      },
  { href: '/fitness/sleep',   label: 'SLEEP',   icon: 'sleep'     },
]

export default function Nav() {
  const pathname = usePathname()

  function isActive(href) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* ── Side nav — desktop ── */}
      <nav className="side-nav" style={s.sideNav}>
        <div style={s.logo}>
          <div style={s.logoMark} className="animate-orb">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div style={s.logoName}>NOMIS</div>
            <div style={s.logoSub}>AI Life OS</div>
          </div>
        </div>

        <div style={s.logoRule} />

        <div style={s.navSection}>
          <div style={s.navSectionLabel}>OVERVIEW</div>
          {NAV_ITEMS.slice(0,2).map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        <div style={s.navSection}>
          <div style={s.navSectionLabel}>FITNESS</div>
          {NAV_ITEMS.slice(2,9).map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        <div style={s.navSection}>
          <div style={s.navSectionLabel}>SYSTEM</div>
          {NAV_ITEMS.slice(9).map(item => (
            <NavItem key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>

        <div style={s.navFooter}>
          <div style={s.statusRow}>
            <div style={s.statusDot} className="animate-pulse" />
            <span style={s.statusTxt}>SYSTEMS ONLINE</span>
          </div>
          <div style={s.versionTxt}>v2.5.0</div>
        </div>
      </nav>

      {/* ── Bottom nav — mobile ── */}
      <nav className="bottom-nav safe-bottom" style={s.bottomNav}>
        {BOTTOM_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            style={{
              ...s.bottomItem,
              ...(isActive(item.href) ? s.bottomItemActive : {}),
            }}
          >
            <span style={{ ...s.bottomIcon, color: isActive(item.href) ? 'var(--green)' : 'var(--text3)' }}>
              {Icons[item.icon]}
            </span>
            <span style={s.bottomLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

function NavItem({ item, active }) {
  return (
    <Link
      href={item.href}
      className={`nav-item ${active ? 'active' : ''}`}
      style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
    >
      <span style={{ ...s.navIcon, color: active ? 'var(--green)' : 'var(--text3)' }}>
        {Icons[item.icon]}
      </span>
      <span style={s.navLabel}>{item.label}</span>
      {active && <div style={s.navActiveDot} />}
    </Link>
  )
}

const s = {
  sideNav: {
    position: 'fixed',
    top: 0, left: 0,
    width: 'var(--nav-w)',
    height: '100vh',
    background: '#111111',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 18px 18px',
  },
  logoMark: {
    width: '38px',
    height: '38px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(34,212,138,0.18), rgba(34,212,138,0.06))',
    border: '1px solid rgba(34,212,138,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--green)',
    flexShrink: 0,
  },
  logoName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.05rem',
    fontWeight: '700',
    letterSpacing: '0.18em',
    color: '#fff',
    lineHeight: 1,
  },
  logoSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.45rem',
    color: 'var(--text3)',
    letterSpacing: '0.08em',
    marginTop: '4px',
  },
  logoRule: {
    margin: '0 16px 6px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.18), transparent)',
  },
  navSection: {
    padding: '6px 10px 2px',
  },
  navSectionLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'var(--text4)',
    letterSpacing: '0.14em',
    padding: '6px 10px 4px',
    userSelect: 'none',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '9px 12px',
    borderRadius: '9px',
    borderLeft: '2px solid transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    letterSpacing: '0.08em',
    color: 'var(--text3)',
    transition: 'all 0.15s',
    position: 'relative',
    cursor: 'pointer',
    marginBottom: '1px',
  },
  navItemActive: {
    background: 'rgba(34,212,138,0.08)',
    color: 'var(--green)',
    borderLeftColor: 'var(--green)',
  },
  navIcon: {
    width: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'color 0.15s',
  },
  navLabel: {
    flex: 1,
  },
  navActiveDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 6px var(--green)',
    flexShrink: 0,
  },
  navFooter: {
    marginTop: 'auto',
    padding: '14px 18px 22px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 5px var(--green)',
    flexShrink: 0,
  },
  statusTxt: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.44rem',
    color: 'var(--green)',
    letterSpacing: '0.1em',
    opacity: 0.8,
  },
  versionTxt: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'var(--text4)',
    letterSpacing: '0.08em',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    height: 'var(--nav-h)',
    background: 'rgba(17,17,17,0.97)',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 50,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  bottomItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 10px',
    flex: 1,
    transition: 'all 0.15s',
    WebkitTapHighlightColor: 'transparent',
  },
  bottomItemActive: {
    color: 'var(--green)',
  },
  bottomIcon: {
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  },
  bottomLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.4rem',
    color: 'inherit',
    letterSpacing: '0.06em',
  },
}
