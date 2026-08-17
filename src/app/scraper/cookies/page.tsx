'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  RefreshCw, Check, X, AlertCircle, Zap, Clock,
  ExternalLink, Copy, CheckCircle, Loader2, Shield
} from 'lucide-react'

const labelStyle: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: 4, letterSpacing: '0.4px' }

interface Cookie {
  id: string
  label: string | null
  username: string | null
  status: string
  requests_count: number
  last_used_at: string | null
  last_success_at: string | null
  consecutive_errors: number
  created_at: string
}

export default function CookieRefreshPage() {
  const [cookies, setCookies] = useState<Cookie[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'cookie'>('login')
  const [form, setForm] = useState({ session_id: '', csrftoken: '', ds_user_id: '', username: 'auto_beast97', password: '', label: '' })
  const [adding, setAdding] = useState(false)
  const [step, setStep] = useState(0) // 0=main, 1=guide, 2=bookmarklet

  const showToast = (msg: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ msg, type }); setTimeout(() => setToast(null), 4000)
  }

  const loadCookies = useCallback(async () => {
    try {
      const res = await fetch('/api/scraper?action=cookies')
      const data = await res.json()
      setCookies(data.cookies || [])
    } catch {
      showToast('Failed to load cookies', 'error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadCookies() }, [loadCookies])

  const addCookie = async () => {
    if (!form.username.trim()) return
    if (authMode === 'login' && !form.password.trim()) return
    if (authMode === 'cookie' && (!form.session_id.trim() || !form.ds_user_id.trim())) return
    
    setAdding(true)
    try {
      const res = await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_cookie',
          username: form.username.trim() || 'auto_beast97',
          password: authMode === 'login' ? form.password.trim() : null,
          session_id: authMode === 'cookie' ? form.session_id.trim() : '',
          ds_user_id: authMode === 'cookie' ? form.ds_user_id.trim() : '',
          csrftoken: authMode === 'cookie' ? form.csrftoken.trim() : null,
          label: form.label.trim() || `${authMode === 'login' ? 'Login' : 'Cookie'} ${new Date().toLocaleDateString()}`,
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      showToast(authMode === 'login' ? 'Login credentials saved' : 'Cookie added successfully')
      setShowAddForm(false)
      setForm({ session_id: '', csrftoken: '', ds_user_id: '', username: 'auto_beast97', password: '', label: '' })
      loadCookies()
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Failed to add', 'error')
    } finally {
      setAdding(false)
    }
  }

  const deleteCookie = async (id: string) => {
    try {
      await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_cookie', cookie_id: id }),
      })
      showToast('Cookie deleted')
      loadCookies()
    } catch {
      showToast('Failed to delete', 'error')
    }
  }

  const toggleCookie = async (id: string, status: string) => {
    try {
      await fetch('/api/scraper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_cookie', cookie_id: id, status }),
      })
      loadCookies()
    } catch {
      showToast('Failed to toggle', 'error')
    }
  }

  // Bookmarklet code that extracts cookies from instagram.com
  const bookmarkletCode = `javascript:void(function(){var%20c=document.cookie.split(';').map(function(c){return c.trim()});var%20s=c.find(function(c){return%20c.startsWith('sessionid=')});var%20d=c.find(function(c){return%20c.startsWith('ds_user_id=')});var%20t=c.find(function(c){return%20c.startsWith('csrftoken=')});if(!s||!d){alert('Not%20on%20instagram.com%20or%20not%20logged%20in!');return}var%20sid=s.split('=').slice(1).join('=');var%20ds=d.split('=').slice(1).join('=');var%20csrf=t?t.split('=').slice(1).join('='):'';var%20u=prompt('Enter%20your%20Instagram%20username%3A','auto_beast97');if(!u)return;fetch('${typeof window !== 'undefined' ? window.location.origin : ''}/api/scraper',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'add_cookie',session_id:sid,ds_user_id:ds,csrftoken:csrf,username:u,label:'Bookmarklet%20'+new%20Date().toLocaleDateString()})}).then(function(r){return%20r.json()}).then(function(d){if(d.error){alert('Error:'+d.error)}else{alert('Cookie%20added!%20'+d.message)}}).catch(function(e){alert('Failed:'+e)})})()`

  const copyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode)
    showToast('Bookmarklet copied! Drag it to your bookmarks bar.')
  }

  const activeCookies = cookies.filter(c => c.status === 'active')
  const expiredCookies = cookies.filter(c => c.status === 'expired')

  return (
    <div className="anim-fade-up" style={{ maxWidth: 800 }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <span className="accent">Cookie</span> Manager
          </h1>
          <p className="page-subtitle">
            Instagram session cookies for scraping. Rotate before expiry.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setStep(step === 0 ? 1 : 0)} className="btn btn-ghost btn-sm">
            {step === 0 ? 'How to get cookies' : 'Back to cookies'}
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn btn-blue btn-sm">
            <Zap size={14} /> Add Cookie
          </button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid-kpi" style={{ marginBottom: 16 }}>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--green-dim)', color: 'var(--green)' }}><CheckCircle size={16} /></div>
          <div className="kpi-label">Active</div>
          <div className="kpi-value">{activeCookies.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--red-dim)', color: 'var(--red)' }}><AlertCircle size={16} /></div>
          <div className="kpi-label">Expired</div>
          <div className="kpi-value">{expiredCookies.length}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{ background: 'var(--blue-dim)', color: 'var(--blue)' }}><RefreshCw size={16} /></div>
          <div className="kpi-label">Total Requests</div>
          <div className="kpi-value">{cookies.reduce((s, c) => s + c.requests_count, 0)}</div>
        </div>
      </div>

      {/* Guided Flow */}
      {step === 1 && (
        <div style={{ background: 'var(--blue-dim)', border: '1px solid rgba(26,115,232,0.2)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={16} /> How to Get Fresh Cookies
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Method 1: Bookmarklet */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--green)' }}>
                Method 1: Bookmarklet (Recommended)
              </h4>
              <ol style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)', paddingLeft: 20 }}>
                <li>Open <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>instagram.com</a> in Chrome and login</li>
                <li>Copy the bookmarklet below (click copy button)</li>
                <li>Create a new bookmark in Chrome (right-click bookmarks bar → Add page)</li>
                <li>Paste the bookmarklet code as the URL</li>
                <li>Click the bookmark while on instagram.com</li>
                <li>Enter your username when prompted — cookie is saved automatically!</li>
              </ol>
              
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                <button onClick={copyBookmarklet} className="btn btn-green btn-sm">
                  <Copy size={13} /> Copy Bookmarklet
                </button>
                <button onClick={() => setStep(2)} className="btn btn-ghost btn-sm">
                  Show me how
                </button>
              </div>
            </div>
            
            {/* Method 2: Manual */}
            <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', padding: 16 }}>
              <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--orange)' }}>
                Method 2: Manual Copy
              </h4>
              <ol style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)', paddingLeft: 20 }}>
                <li>Open instagram.com → Login → Press F12</li>
                <li>Go to Application tab → Cookies → instagram.com</li>
                <li>Copy these values:</li>
              </ol>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                {['sessionid', 'ds_user_id', 'csrftoken'].map(name => (
                  <div key={name} style={{ background: 'var(--bg-elevated)', padding: 8, borderRadius: 'var(--radius-xs)', fontSize: 11, fontFamily: 'monospace' }}>
                    {name}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                Then click &quot;Add Cookie&quot; above and paste them in.
              </p>
            </div>
          </div>
          
          <button onClick={() => setStep(0)} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            Back to cookies
          </button>
        </div>
      )}

      {/* Bookmarklet Demo */}
      {step === 2 && (
        <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,135,90,0.2)', borderRadius: 'var(--radius)', padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Bookmarklet Setup Guide</h3>
          
          <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--text-secondary)' }}>
            <p><strong>1.</strong> Right-click on your Chrome bookmarks bar</p>
            <p><strong>2.</strong> Click &quot;Add page&quot; or &quot;Add bookmark&quot;</p>
            <p><strong>3.</strong> For Name, type: <code style={{ background: 'var(--bg-elevated)', padding: '2px 6px', borderRadius: 3 }}>IG Cookie Extractor</code></p>
            <p><strong>4.</strong> For URL, paste the bookmarklet code you copied</p>
            <p><strong>5.</strong> Click Save</p>
            <p style={{ marginTop: 12 }}><strong>6.</strong> Go to <a href="https://instagram.com" target="_blank" rel="noopener" style={{ color: 'var(--blue)' }}>instagram.com</a> and make sure you&apos;re logged in</p>
            <p><strong>7.</strong> Click the bookmarklet in your bookmarks bar</p>
            <p><strong>8.</strong> When prompted, enter your Instagram username (e.g., auto_beast97)</p>
            <p><strong>9.</strong> Done! Cookie is saved to your database automatically.</p>
          </div>
          
          <button onClick={() => setStep(1)} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            Back to methods
          </button>
        </div>
      )}

      {/* Cookie List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--blue)' }} />
        </div>
      ) : cookies.length === 0 ? (
        <div className="state-panel">
          <Zap size={30} style={{ color: 'var(--text-muted)', marginBottom: 12 }} />
          <div className="state-panel__title">No cookies yet</div>
          <div className="state-panel__desc">Add your first cookie to start scraping.</div>
          <button onClick={() => setStep(1)} className="btn btn-blue btn-sm" style={{ marginTop: 10 }}>
            Show me how
          </button>
        </div>
      ) : (
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Username</th>
                <th>Status</th>
                <th>Requests</th>
                <th>Errors</th>
                <th>Last Success</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cookies.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.label || '—'}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>@{c.username || 'auto_beast97'}</td>
                  <td>
                    <span className={`badge ${c.status === 'active' ? 'badge-green' : c.status === 'expired' ? 'badge-red' : 'badge-gray'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>{c.requests_count}</td>
                  <td style={{ color: c.consecutive_errors > 0 ? 'var(--red)' : 'var(--text-muted)' }}>
                    {c.consecutive_errors}
                  </td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {c.last_success_at ? new Date(c.last_success_at).toLocaleString() : 'Never'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.status === 'active' ? (
                        <button onClick={() => toggleCookie(c.id, 'disabled')} className="btn-subtle btn-xs" title="Disable">
                          <X size={10} />
                        </button>
                      ) : (
                        <button onClick={() => toggleCookie(c.id, 'active')} className="btn-subtle btn-xs" style={{ color: 'var(--green)' }} title="Enable">
                          <Check size={10} />
                        </button>
                      )}
                      <button onClick={() => deleteCookie(c.id)} className="btn-subtle btn-xs" style={{ color: 'var(--red)' }} title="Delete">
                        <X size={10} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Cookie Drawer */}
      {showAddForm && (
        <div className="drawer-overlay" onClick={() => setShowAddForm(false)}>
          <div className="drawer-panel" onClick={e => e.stopPropagation()} style={{ animation: 'slideIn 0.2s ease' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>Add Instagram Session</h2>
              <button onClick={() => setShowAddForm(false)} className="btn-subtle" style={{ padding: 4 }}><X size={14} /></button>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Auth Mode Toggle */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                  <button
                    onClick={() => setAuthMode('login')}
                    className={`btn btn-sm ${authMode === 'login' ? 'btn-blue' : 'btn-ghost'}`}
                  >
                    Login (Recommended)
                  </button>
                  <button
                    onClick={() => setAuthMode('cookie')}
                    className={`btn btn-sm ${authMode === 'cookie' ? 'btn-blue' : 'btn-ghost'}`}
                  >
                    Manual Cookies
                  </button>
                </div>
                
                {/* Username - always shown */}
                <div>
                  <label style={labelStyle}>Instagram Username *</label>
                  <input className="input" placeholder="e.g. auto_beast97" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} />
                </div>
                
                {/* Login Mode Fields */}
                {authMode === 'login' && (
                  <>
                    <div>
                      <label style={labelStyle}>Instagram Password *</label>
                      <input className="input" type="password" placeholder="Your Instagram password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
                        Used with instaloader&apos;s built-in login. Password is stored in DB and passed to Python.
                      </p>
                    </div>
                    <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(0,135,90,0.2)', borderRadius: 'var(--radius)', padding: 14 }}>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, fontWeight: 600 }}>
                        How it works:
                      </p>
                      <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 4 }}>
                        Instaloader logs in with your credentials and gets session cookies automatically. No need to copy cookies from DevTools.
                      </p>
                    </div>
                  </>
                )}
                
                {/* Cookie Mode Fields */}
                {authMode === 'cookie' && (
                  <>
                    <div>
                      <label style={labelStyle}>sessionid *</label>
                      <input className="input" placeholder="Paste sessionid cookie value" value={form.session_id} onChange={e => setForm(p => ({ ...p, session_id: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>ds_user_id *</label>
                      <input className="input" placeholder="e.g. 77429703714" value={form.ds_user_id} onChange={e => setForm(p => ({ ...p, ds_user_id: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>csrftoken (optional)</label>
                      <input className="input" placeholder="Paste csrftoken cookie value" value={form.csrftoken} onChange={e => setForm(p => ({ ...p, csrftoken: e.target.value }))} />
                    </div>
                  </>
                )}
                
                {/* Label - always shown */}
                <div>
                  <label style={labelStyle}>Label</label>
                  <input className="input" placeholder="e.g. Fresh session Aug 2026" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border-1)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button onClick={() => setShowAddForm(false)} className="btn btn-ghost btn-sm">Cancel</button>
              <button
                onClick={addCookie}
                disabled={adding || !form.username.trim() || (authMode === 'login' ? !form.password.trim() : (!form.session_id.trim() || !form.ds_user_id.trim()))}
                className="btn btn-blue btn-sm"
              >
                {adding ? 'Adding...' : authMode === 'login' ? 'Save Login' : 'Add Cookie'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`toast toast--${toast.type}`}>{toast.msg}</div>
      )}
    </div>
  )
}
