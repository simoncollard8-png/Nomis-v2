'use client'
import { useState } from 'react'
import Link from 'next/link'

const VERSION = '2.0.0'

export default function Settings() {
  const [copied, setCopied] = useState(false)

  function copyVersion() {
    navigator.clipboard?.writeText(`NOMIS v${VERSION}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const rows = [
    {
      section: '// PROFILE',
      items: [
        { label: 'Name', value: 'Simon', type: 'info' },
        { label: 'Program', value: 'PPL Strength Recomp', type: 'info' },
        { label: 'Goal', value: 'Recomp — Build + Cut', type: 'info' },
      ]
    },
    {
      section: '// MODULES',
      items: [
        { label: 'Fitness', value: 'Online', type: 'status', color: 'var(--green)' },
        { label: 'History', value: 'Online', type: 'status', color: 'var(--green)' },
        { label: 'Sleep', value: 'Online', type: 'status', color: 'var(--green)' },
        { label: 'Cardio', value: 'Online', type: 'status', color: 'var(--green)' },
        { label: 'Body Stats', value: 'Online', type: 'status', color: 'var(--green)' },
        { label: 'Finance', value: 'Coming Soon', type: 'status', color: 'var(--text4)' },
        { label: 'Work', value: 'Coming Soon', type: 'status', color: 'var(--text4)' },
        { label: 'Home', value: 'Coming Soon', type: 'status', color: 'var(--text4)' },
      ]
    },
    {
      section: '// INFRASTRUCTURE',
      items: [
        { label: 'Database', value: 'Supabase', type: 'info' },
        { label: 'Middleware', value: 'Railway', type: 'info' },
        { label: 'Frontend', value: 'Vercel + Next.js', type: 'info' },
        { label: 'AI', value: 'Claude (Anthropic)', type: 'info' },
      ]
    },
    {
      section: '// SYSTEM',
      items: [
        { label: 'Version', value: `v${VERSION}`, type: 'action', action: copyVersion },
        { label: 'PWA', value: 'Enabled', type: 'status', color: 'var(--green)' },
        { label: 'Add to Home Screen', value: 'Safari → Share → Add', type: 'info' },
      ]
    },
  ]

  return (
    <div style={s.page} className="safe-top">
      <header style={s.header} className="pwa-header">
        <Link href="/" style={s.back}>‹ BACK</Link>
        <div style={s.headerCenter}>
          <div style={s.title}>SETTINGS</div>
          <div style={s.subtitle}>NOMIS v{VERSION}</div>
        </div>
        <div style={{ width: '60px' }} />
      </header>
      <div style={s.progressTrack}><div style={s.progressFill} /></div>

      <div style={s.body}>
        {rows.map(group => (
          <div key={group.section} style={s.group}>
            <div style={s.groupLabel}>{group.section}</div>
            <div style={s.groupCard}>
              {group.items.map((item, i) => (
                <div key={i} style={{ ...s.row, ...(i < group.items.length - 1 ? s.rowBorder : {}) }}
                  onClick={item.action}
                  style={{
                    ...s.row,
                    ...(i < group.items.length - 1 ? s.rowBorder : {}),
                    cursor: item.action ? 'pointer' : 'default'
                  }}>
                  <span style={s.rowLabel}>{item.label}</span>
                  <span style={{ ...s.rowValue, color: item.color || 'var(--text2)' }}>
                    {item.label === 'Version' && copied ? '✓ COPIED' : item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div style={s.footer}>
          <div style={s.footerText}>NOMIS — Neural Optimization & Management Intelligence System</div>
          <div style={s.footerText}>Built with Next.js · Supabase · Railway · Claude AI</div>
          <div style={{ ...s.footerText, color: 'var(--text4)', marginTop: '4px' }}>© 2026 Simon</div>
        </div>
      </div>
    </div>
  )
}

const s = {
  page: { minHeight: '100dvh', background: 'var(--bg)', paddingBottom: '40px' },
  header: { display: 'flex', alignItems: 'center', padding: '20px 24px 16px', gap: '12px', borderBottom: '1px solid var(--border)' },
  back: { fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text3)', letterSpacing: '0.1em', width: '60px' },
  headerCenter: { flex: 1, textAlign: 'center' },
  title: { fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '700', letterSpacing: '0.2em', color: '#fff', lineHeight: 1 },
  subtitle: { fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text3)', letterSpacing: '0.1em', marginTop: '3px' },
  progressTrack: { height: '2px', background: 'var(--border)' },
  progressFill: { height: '100%', width: '100%', background: 'linear-gradient(90deg, var(--green), var(--cyan), var(--green))', backgroundSize: '200%', boxShadow: '0 0 10px rgba(34,212,138,0.3)' },
  body: { padding: '24px 20px' },
  group: { marginBottom: '24px' },
  groupLabel: { fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'var(--text3)', letterSpacing: '0.15em', marginBottom: '10px' },
  groupCard: { background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' },
  rowBorder: { borderBottom: '1px solid var(--border)' },
  rowLabel: { fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text)', letterSpacing: '0.02em' },
  rowValue: { fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '0.06em' },
  footer: { textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '4px' },
  footerText: { fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text3)', letterSpacing: '0.08em' },
}
