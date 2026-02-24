'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/',                 label: 'DASHBOARD',    icon: '◈' },
  { href: '/fitness',          label: 'FITNESS HUB',  icon: '⚡' },
  { href: '/fitness/workout',  label: 'WORKOUT',      icon: '💪' },
  { href: '/fitness/diet',     label: 'DIET',         icon: '🥗' },
  { href: '/fitness/cardio',   label: 'CARDIO',       icon: '♡' },
  { href: '/fitness/sleep',    label: 'SLEEP',        icon: '◎' },
  { href: '/fitness/body',     label: 'BODY',         icon: '◉' },
  { href: '/fitness/peptides', label: 'PEPTIDES',     icon: '💉' },
  { href: '/fitness/supplements', label: 'SUPPS',     icon: '💊' },
  { href: '/settings',         label: 'SETTINGS',     icon: '⚙' },
]

const BOTTOM_NAV = [
  { href: '/',                label: 'HOME',    icon: '◈' },
  { href: '/fitness',         label: 'FITNESS', icon: '⚡' },
  { href: '/fitness/workout', label: 'WORKOUT', icon: '💪' },
  { href: '/fitness/diet',    label: 'DIET',    icon: '🥗' },
  { href: '/fitness/sleep',   label: 'SLEEP',   icon: '◎' },
]

export default function Nav() {
  const pathname = usePathname()

  function isActive(href) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Side nav — desktop */}
      <nav className="side-nav" style={s.sideNav}>
        {/* Logo */}
        <div style={s.logo}>
          <div style={s.logoMark} className="animate-orb">N</div>
          <div>
            <div style={s.logoName}>NOMIS</div>
            <div style={s.logoSub}>AI Life OS</div>
          </div>
        </div>

        <div style={s.logoRule} />

        {/* Nav items */}
        <div style={s.navItems}>
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href) ? 'active' : ''}`}
              style={{
                ...s.navItem,
                ...(isActive(item.href) ? s.navItemActive : {}),
              }}
            >
              <span style={s.navIcon}>{item.icon}</span>
              <span style={s.navLabel}>{item.label}</span>
              {isActive(item.href) && <div style={s.navActiveDot} />}
            </Link>
          ))}
        </div>

        {/* Bottom status */}
        <div style={s.navFooter}>
          <div style={s.statusRow}>
            <div style={s.statusDot} className="animate-pulse" />
            <span style={s.statusTxt}>SYSTEMS ONLINE</span>
          </div>
          <div style={s.versionTxt}>v2.0.0</div>
        </div>
      </nav>

      {/* Bottom nav — mobile */}
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
            <span style={s.bottomIcon}>{item.icon}</span>
            <span style={s.bottomLabel}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  )
}

const s = {
  sideNav: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 'var(--nav-w)',
    height: '100vh',
    background: 'rgba(6,9,16,0.98)',
    borderRight: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 50,
    backdropFilter: 'blur(20px)',
    overflowY: 'auto',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '24px 20px 20px',
  },
  logoMark: {
    width: '38px',
    height: '38px',
    borderRadius: '11px',
    background: 'linear-gradient(135deg, rgba(34,212,138,0.2), rgba(34,212,138,0.04))',
    border: '1px solid rgba(34,212,138,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: '700',
    color: 'var(--green)',
    flexShrink: 0,
  },
  logoName: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: '700',
    letterSpacing: '0.2em',
    color: '#fff',
    lineHeight: 1,
  },
  logoSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.44rem',
    color: 'var(--text4)',
    letterSpacing: '0.1em',
    marginTop: '3px',
  },
  logoRule: {
    margin: '0 16px 8px',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, rgba(34,212,138,0.2), transparent)',
  },
  navItems: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '4px 10px',
    gap: '2px',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    borderRadius: '9px',
    borderLeft: '2px solid transparent',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.55rem',
    letterSpacing: '0.1em',
    color: 'var(--text3)',
    transition: 'all 0.15s',
    position: 'relative',
    cursor: 'pointer',
  },
  navItemActive: {
    background: 'var(--green-dim)',
    color: 'var(--green)',
    borderLeftColor: 'var(--green)',
  },
  navIcon: {
    fontSize: '0.85rem',
    width: '18px',
    textAlign: 'center',
    flexShrink: 0,
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
  },
  navFooter: {
    padding: '16px 20px 24px',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    background: 'var(--green)',
    flexShrink: 0,
  },
  statusTxt: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.44rem',
    color: 'var(--green)',
    letterSpacing: '0.12em',
  },
  versionTxt: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'var(--text4)',
    letterSpacing: '0.1em',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: 'var(--nav-h)',
    background: 'rgba(6,9,16,0.97)',
    borderTop: '1px solid var(--border)',
    display: 'none',
    alignItems: 'center',
    justifyContent: 'space-around',
    zIndex: 50,
    backdropFilter: 'blur(20px)',
  },
  bottomItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    padding: '8px 12px',
    borderRadius: '10px',
    transition: 'all 0.15s',
    flex: 1,
  },
  bottomItemActive: {
    color: 'var(--green)',
  },
  bottomIcon: {
    fontSize: '1.1rem',
    lineHeight: 1,
  },
  bottomLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.42rem',
    color: 'inherit',
    letterSpacing: '0.08em',
  },
}
