export default function PropertiesPanel({ onClose }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span style={{ fontWeight: 800, fontSize: 14, fontFamily: 'Syne, sans-serif' }}>Properties</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: 16 }}>✕</button>
      </div>
      {[
        { label: 'X Position', val: '0 cm' },
        { label: 'Y Position', val: '0 cm' },
        { label: 'Rotation',   val: '0°' },
        { label: 'Width',      val: '100 cm' },
        { label: 'Height',     val: '80 cm' },
      ].map(p => (
        <div key={p.label} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 4 }}>{p.label}</label>
          <input defaultValue={p.val}
            style={{ width: '100%', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7, color: '#e8e8f0', fontSize: 12, outline: 'none', boxSizing: 'border-box' }} />
        </div>
      ))}
      <div style={{ marginBottom: 16 }}>
        <label style={{ fontSize: 11, color: '#555', display: 'block', marginBottom: 6 }}>Color</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['#f5f0eb','#4a4a6a','#8b6914','#43d9ad','#6c63ff','#ff6b6b'].map(c => (
            <div key={c} style={{ width: 24, height: 24, borderRadius: 6, background: c, cursor: 'pointer', border: '2px solid transparent', transition: 'border .15s' }}
              onMouseEnter={e => e.currentTarget.style.border = '2px solid #fff'}
              onMouseLeave={e => e.currentTarget.style.border = '2px solid transparent'} />
          ))}
        </div>
      </div>
    </div>
  )
}