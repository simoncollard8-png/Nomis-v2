'use client'
import { useState, useEffect, useRef } from 'react'
import { chat } from '../lib/api'
import { buildContext } from '../lib/context'

export default function NomisChat({ pageContext = '' }) {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState('')
  const [history, setHistory]   = useState([])
  const [loading, setLoading]   = useState(false)
  const [context, setContext]   = useState('')
  const [ctxLoaded, setCtxLoaded] = useState(false)
  const endRef                  = useRef(null)
  const inputRef                = useRef(null)

  useEffect(() => {
    buildContext().then(ctx => {
      setContext(ctx)
      setCtxLoaded(true)
    })
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  async function send() {
    if (!input.trim() || loading) return
    const msg = input.trim()
    setInput('')
    setLoading(true)
    setHistory(prev => [...prev, { role: 'user', content: msg }])

    const fullMessage = `${context}\n\n${pageContext ? `Current page context:\n${pageContext}\n\n` : ''}User: ${msg}`

    try {
      const res = await chat(fullMessage, history)
      if (res.response) {
        setHistory(prev => [...prev, { role: 'assistant', content: res.response }])
      }
    } catch {
      setHistory(prev => [...prev, { role: 'assistant', content: 'Connection error. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={s.wrap}>
      {/* Chat panel */}
      {open && (
        <div style={s.panel} className="animate-fadeIn">
          {/* Header */}
          <div style={s.panelHeader}>
            <div style={s.panelTitle}>
              <div style={s.panelOrb}>N</div>
              <div>
                <div style={s.panelName}>NOMIS</div>
                <div style={s.panelStatus}>{ctxLoaded ? '● Context loaded · 30 days' : '○ Loading context...'}</div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {history.length === 0 && (
              <div style={s.welcome}>
                <div style={s.welcomeIcon}>N</div>
                <div style={s.welcomeTitle}>Hey Simon.</div>
                <div style={s.welcomeText}>I know your last 30 days. Ask me anything — workouts, sleep, diet, peptides, or just talk through your goals.</div>
              </div>
            )}
            {history.map((msg, i) => (
              <div key={i} style={msg.role === 'user' ? s.msgUser : s.msgNomis}>
                {msg.role === 'assistant' && <div style={s.msgLabel}>NOMIS</div>}
                <div style={s.msgText}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div style={s.msgNomis}>
                <div style={s.msgLabel}>NOMIS</div>
                <div style={s.typing}>
                  <span className="typing-dot">●</span>
                  <span className="typing-dot">●</span>
                  <span className="typing-dot">●</span>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={s.inputRow}>
            <input
              ref={inputRef}
              style={s.chatInput}
              placeholder="Ask NOMIS anything..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
            />
            <button style={s.sendBtn} onClick={send} disabled={loading}>›</button>
          </div>
        </div>
      )}

      {/* Orb toggle */}
      <button
        style={s.orb}
        className="animate-orb"
        onClick={() => setOpen(o => !o)}
        title="Talk to NOMIS"
      >
        N
      </button>
    </div>
  )
}

const s = {
  wrap: {
    position: 'fixed',
    bottom: 'calc(var(--nav-h) + 16px)',
    right: '20px',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '12px',
  },
  panel: {
    width: '360px',
    maxWidth: 'calc(100vw - 40px)',
    height: '480px',
    background: 'rgba(6,9,16,0.97)',
    border: '1px solid rgba(34,212,138,0.2)',
    borderRadius: '18px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(34,212,138,0.05)',
    backdropFilter: 'blur(20px)',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 18px',
    borderBottom: '1px solid var(--border)',
    flexShrink: 0,
  },
  panelTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  panelOrb: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.35), rgba(34,212,138,0.05))',
    border: '1px solid rgba(34,212,138,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '0.95rem',
    fontWeight: '700',
    color: 'var(--green)',
    flexShrink: 0,
  },
  panelName: {
    fontFamily: 'var(--font-display)',
    fontSize: '0.95rem',
    fontWeight: '700',
    letterSpacing: '0.15em',
    color: '#fff',
    lineHeight: 1,
  },
  panelStatus: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.44rem',
    color: 'var(--green)',
    letterSpacing: '0.08em',
    marginTop: '3px',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text3)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'color 0.15s',
  },
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  welcome: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '24px 16px',
    textAlign: 'center',
  },
  welcomeIcon: {
    width: '48px',
    height: '48px',
    borderRadius: '14px',
    background: 'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.25), rgba(34,212,138,0.03))',
    border: '1px solid rgba(34,212,138,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontSize: '1.3rem',
    fontWeight: '700',
    color: 'var(--green)',
    marginBottom: '8px',
  },
  welcomeTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: '1.1rem',
    fontWeight: '600',
    color: '#fff',
    letterSpacing: '0.05em',
  },
  welcomeText: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.6rem',
    color: 'var(--text3)',
    lineHeight: '1.7',
    letterSpacing: '0.04em',
  },
  msgNomis: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  msgUser: {
    alignSelf: 'flex-end',
    maxWidth: '85%',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    borderTopRightRadius: '3px',
    padding: '10px 14px',
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    color: 'var(--text2)',
    lineHeight: '1.5',
  },
  msgLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.44rem',
    color: 'var(--green)',
    letterSpacing: '0.15em',
    opacity: 0.7,
  },
  msgText: {
    background: 'rgba(34,212,138,0.04)',
    border: '1px solid rgba(34,212,138,0.1)',
    borderRadius: '12px',
    borderTopLeftRadius: '3px',
    padding: '10px 14px',
    fontFamily: 'var(--font-display)',
    fontSize: '0.85rem',
    color: 'var(--text)',
    lineHeight: '1.6',
  },
  typing: {
    background: 'rgba(34,212,138,0.04)',
    border: '1px solid rgba(34,212,138,0.1)',
    borderRadius: '12px',
    borderTopLeftRadius: '3px',
    padding: '12px 16px',
    display: 'flex',
    gap: '3px',
    alignItems: 'center',
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    padding: '12px 14px 14px',
    borderTop: '1px solid var(--border)',
    flexShrink: 0,
  },
  chatInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid var(--border2)',
    borderRadius: '10px',
    padding: '11px 14px',
    color: 'var(--text)',
    fontFamily: 'var(--font-display)',
    fontSize: '0.88rem',
    outline: 'none',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    background: 'var(--green-dim)',
    border: '1px solid var(--green-glow)',
    color: 'var(--green)',
    fontSize: '1.3rem',
    cursor: 'pointer',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
    fontFamily: 'var(--font-display)',
  },
  orb: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    background: 'radial-gradient(circle at 35% 35%, rgba(34,212,138,0.45), rgba(34,212,138,0.06))',
    border: '1px solid rgba(34,212,138,0.4)',
    color: 'var(--green)',
    fontFamily: 'var(--font-display)',
    fontSize: '1.2rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    letterSpacing: '0.05em',
    transition: 'box-shadow 0.2s',
  },
}
