
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import './App.css'

const presets = {
  Classic: { fg: '#111827', bg: '#ffffff', level: 'H' },
  Ocean: { fg: '#075985', bg: '#ecfeff', level: 'H' },
  Forest: { fg: '#166534', bg: '#f0fdf4', level: 'H' },
  Sunset: { fg: '#9f1239', bg: '#fff1f2', level: 'H' },
}

function getSavedSetting(key, fallback) {
  try {
    const saved = JSON.parse(
      localStorage.getItem('qr-studio-settings') || '{}'
    )
    return saved[key] ?? fallback
  } catch {
    return fallback
  }
}

function App() {
  const [type, setType] = useState(() => getSavedSetting('type', 'URL'))
  const [url, setUrl] = useState(() => getSavedSetting('url', 'https://example.com'))
  const [text, setText] = useState(() => getSavedSetting('text', ''))
  const [email, setEmail] = useState(() => getSavedSetting('email', ''))
  const [phone, setPhone] = useState(() => getSavedSetting('phone', ''))
  const [ssid, setSsid] = useState(() => getSavedSetting('ssid', ''))
  const [password, setPassword] = useState('')
  const [security, setSecurity] = useState(() => getSavedSetting('security', 'WPA'))
  const [fg, setFg] = useState(() => getSavedSetting('fg', '#111827'))
  const [bg, setBg] = useState(() => getSavedSetting('bg', '#ffffff'))
  const [size, setSize] = useState(() => getSavedSetting('size', 256))
  const [margin, setMargin] = useState(() => getSavedSetting('margin', 4))
  const [level, setLevel] = useState(() => getSavedSetting('level', 'H'))
  const [preset, setPreset] = useState(() => getSavedSetting('preset', 'Classic'))
  const [qr, setQr] = useState('')
  const [error, setError] = useState('')

  const [recent, setRecent] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('qr-studio-recent') || '[]')
    } catch {
      return []
    }
  })

  // Automatically save settings in this browser.
  useEffect(() => {
    try {
      localStorage.setItem(
        'qr-studio-settings',
        JSON.stringify({
          type, url, text, email, phone, ssid,
          security, fg, bg, size, margin, level, preset,
        })
      )
    } catch {
      // Saving may fail if browser storage is unavailable.
    }
  }, [
    type, url, text, email, phone, ssid,
    security, fg, bg, size, margin, level, preset,
  ])

  function getValue() {
    if (type === 'URL') {
      if (!url.trim()) throw Error('Please enter a URL.')

      let parsed
      try {
        parsed = new URL(url.trim())
      } catch {
        throw Error('Enter a valid URL, including https://')
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw Error('Only HTTP and HTTPS URLs are supported.')
      }

      return url.trim()
    }

    if (type === 'Text') {
      if (!text.trim()) throw Error('Please enter some text.')
      return text.trim()
    }

    if (type === 'Email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw Error('Enter a valid email address.')
      }
      return `mailto:${email.trim()}`
    }

    if (type === 'Phone') {
      if (!/^\+?[0-9\s()-]{7,20}$/.test(phone.trim())) {
        throw Error('Enter a valid phone number.')
      }
      return `tel:${phone.trim()}`
    }

    if (!ssid.trim()) {
      throw Error('Please enter the Wi-Fi network name.')
    }

    if (/[;,:"]/.test(ssid) || /[;,:"]/.test(password)) {
      throw Error('Wi-Fi name and password cannot contain ; , : or quotation marks.')
    }

    if (security !== 'nopass' && !password) {
      throw Error('Please enter the Wi-Fi password.')
    }

    return `WIFI:T:${security};S:${ssid};P:${password};;`
  }

  // Generate a fresh QR code when content or appearance changes.
  useEffect(() => {
    let active = true

    try {
      const value = getValue()
      setError('')

      QRCode.toDataURL(value, {
        width: Number(size),
        margin: Number(margin),
        errorCorrectionLevel: level,
        color: { dark: fg, light: bg },
      })
        .then((data) => {
          if (active) setQr(data)
        })
        .catch(() => {
          if (active) {
            setQr('')
            setError('Could not generate this QR code.')
          }
        })
    } catch (e) {
      setQr('')
      setError(e.message)
    }

    return () => {
      active = false
    }
  }, [
    type, url, text, email, phone, ssid, password,
    security, fg, bg, size, margin, level,
  ])

  function saveRecent() {
    try {
      const value = getValue()

      const item = {
        type,
        value,
        fg,
        bg,
        size,
        margin,
        level,
        date: new Date().toLocaleString(),
      }

      const updated = [
        item,
        ...recent.filter((r) => r.value !== value),
      ].slice(0, 8)

      setRecent(updated)
      localStorage.setItem('qr-studio-recent', JSON.stringify(updated))
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  function applyPreset(name) {
    setPreset(name)
    setFg(presets[name].fg)
    setBg(presets[name].bg)
    setLevel(presets[name].level)
  }

  function downloadQR() {
    if (!qr || error) return

    const a = document.createElement('a')
    a.href = qr
    a.download = 'qr-studio.png'
    document.body.appendChild(a)
    a.click()
    a.remove()

    saveRecent()
  }

  function loadRecent(item) {
    setFg(item.fg)
    setBg(item.bg)
    setSize(item.size)
    setMargin(item.margin)
    setLevel(item.level)

    if (item.type === 'URL') {
      setType('URL')
      setUrl(item.value)
    } else if (item.type === 'Email') {
      setType('Email')
      setEmail(item.value.replace(/^mailto:/, ''))
    } else if (item.type === 'Phone') {
      setType('Phone')
      setPhone(item.value.replace(/^tel:/, ''))
    } else {
      setType('Text')
      setText(item.value)
    }
  }

  return (
    <main className="app">
      <header className="topbar">
        <a className="brand" href="#home">
          <span className="brand-icon">▦</span> QR Studio
        </a>
        <span className="tag">YOUR IDEAS, ONE SCAN AWAY</span>
      </header>

      <section className="hero" id="home">
        <div className="eyebrow">
          <span className="live-dot" /> INSTANT QR GENERATOR
        </div>
        <h1>Make it scannable<span>.</span></h1>
        <p>
          Create beautiful, custom QR codes in seconds.
          No account. No backend. Just create and share.
        </p>
      </section>

      <section className="workspace">
        <div className="panel editor">
          <div className="panel-heading">
            <div><span className="step">01</span><h2>Content</h2></div>
            <span className="small-label">WHAT'S INSIDE?</span>
          </div>

          <label className="field-label">QR CODE TYPE</label>
          <div className="type-grid">
            {['URL', 'Text', 'Email', 'Phone', 'Wi-Fi'].map((item) => (
              <button
                key={item}
                className={`type-btn ${type === item ? 'selected' : ''}`}
                onClick={() => setType(item)}
              >
                {item === 'Wi-Fi' ? '⌁ ' :
                  item === 'URL' ? '↗ ' :
                    item === 'Email' ? '✉ ' :
                      item === 'Phone' ? '☎ ' : 'T '}
                {item}
              </button>
            ))}
          </div>

          {type === 'URL' && (
            <label className="field">
              Website URL
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </label>
          )}

          {type === 'Text' && (
            <label className="field">
              Your message
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Type anything you want to share..."
                rows="4"
              />
            </label>
          )}

          {type === 'Email' && (
            <label className="field">
              Email address
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hello@example.com"
              />
            </label>
          )}

          {type === 'Phone' && (
            <label className="field">
              Phone number
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>
          )}

          {type === 'Wi-Fi' && (
            <>
              <label className="field">
                Network name (SSID)
                <input
                  value={ssid}
                  onChange={(e) => setSsid(e.target.value)}
                  placeholder="My Wi-Fi"
                />
              </label>

              <label className="field">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Wi-Fi password"
                />
              </label>

              <label className="field">
                Security
                <select
                  value={security}
                  onChange={(e) => setSecurity(e.target.value)}
                >
                  <option value="WPA">WPA / WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">No password</option>
                </select>
              </label>
            </>
          )}

          <div className="section-divider" />

          <div className="panel-heading">
            <div><span className="step">02</span><h2>Appearance</h2></div>
            <span className="small-label">MAKE IT YOURS</span>
          </div>

          <label className="field-label">QUICK PRESETS</label>
          <div className="preset-grid">
            {Object.entries(presets).map(([name, p]) => (
              <button
                key={name}
                className={`preset ${preset === name ? 'preset-active' : ''}`}
                onClick={() => applyPreset(name)}
              >
                <span
                  className="preset-swatch"
                  style={{ background: p.bg, color: p.fg }}
                >
                  ▦
                </span>
                {name}
              </button>
            ))}
          </div>

          <div className="color-row">
            <label className="color-control">
              Foreground
              <input
                type="color"
                value={fg}
                onChange={(e) => {
                  setFg(e.target.value)
                  setPreset('')
                }}
              />
              <span>{fg}</span>
            </label>

            <label className="color-control">
              Background
              <input
                type="color"
                value={bg}
                onChange={(e) => {
                  setBg(e.target.value)
                  setPreset('')
                }}
              />
              <span>{bg}</span>
            </label>
          </div>

          <label className="field slider-field">
            QR size <strong>{size} px</strong>
            <input
              type="range"
              min="128"
              max="512"
              step="32"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
            />
          </label>

          <label className="field slider-field">
            Quiet zone / margin <strong>{margin}</strong>
            <input
              type="range"
              min="0"
              max="8"
              value={margin}
              onChange={(e) => setMargin(Number(e.target.value))}
            />
          </label>

          <label className="field">
            Error correction level
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="L">L — Low (7%)</option>
              <option value="M">M — Medium (15%)</option>
              <option value="Q">Q — Quartile (25%)</option>
              <option value="H">H — High (30%)</option>
            </select>
          </label>

          <p className="hint">
            Tip: Dark foregrounds, light backgrounds, and a quiet zone
            help keep your QR code scannable.
          </p>
        </div>

        <aside className="panel preview-panel">
          <div className="panel-heading">
            <div><span className="step">03</span><h2>Live preview</h2></div>
            <span className="live-status">
              <span className="live-dot" /> LIVE
            </span>
          </div>

          <div className="qr-stage">
            {qr ? (
              <img
                className="qr-image"
                src={qr}
                alt="Generated QR code preview"
              />
            ) : (
              <div className="qr-empty">
                ▦<span>QR preview appears here</span>
              </div>
            )}
          </div>

          {error && <p className="error" role="alert">{error}</p>}
          {!error && qr && <p className="success">✓ QR code is ready to scan</p>}

          <button
            className="download-btn"
            disabled={!qr || Boolean(error)}
            onClick={downloadQR}
          >
            ↓ &nbsp; Download PNG
          </button>

          <button
            className="secondary-btn"
            disabled={!qr || Boolean(error)}
            onClick={saveRecent}
          >
            ＋ Save to recents
          </button>

          <p className="privacy-note">
            Generated in your browser. Your content isn't sent to a server.
          </p>

          <div className="preview-footer">
            <span>PNG EXPORT</span>
            <span>{size} × {size} PX</span>
          </div>
        </aside>
      </section>

      <section className="recent-section">
        <div className="panel-heading">
          <div><span className="step">04</span><h2>Recently created</h2></div>
          <span className="small-label">SAVED ON THIS DEVICE</span>
        </div>

        {recent.length === 0 ? (
          <p className="empty-recent">
            Your saved QR codes will appear here.
            Generate a code and select “Save to recents”.
          </p>
        ) : (
          <div className="recent-list">
            {recent.map((item, i) => (
              <button
                className="recent-item"
                key={`${item.value}-${i}`}
                onClick={() => loadRecent(item)}
              >
                <span className="recent-symbol">▦</span>
                <span className="recent-info">
                  <strong>{item.type}</strong>
                  <small>{item.value}</small>
                  <small>{item.date}</small>
                </span>
                <span>↗</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <footer>
        <span>QR STUDIO</span>
        <span>Designed to be simple. Built to be useful.</span>
      </footer>
    </main>
  )
}

export default App