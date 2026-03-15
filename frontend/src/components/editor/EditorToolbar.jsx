import { useDispatch, useSelector } from 'react-redux'
import { setTool } from '../../store/slices/editorSlice'

const tools = [
  { id: 'select',  icon: '↖', label: 'Select',  key: 'V' },
  { id: 'wall',    icon: '▬', label: 'Wall',    key: 'W' },
  { id: 'room',    icon: '⬜', label: 'Room',    key: 'R' },
  { id: 'door',    icon: '🚪', label: 'Door',    key: 'D' },
  { id: 'window',  icon: '🪟', label: 'Window',  key: 'N' },
  { id: 'measure', icon: '📏', label: 'Measure', key: 'M' },
]

export default function EditorToolbar() {
  const dispatch    = useDispatch()
  const { activeTool, mode } = useSelector((s) => s.editor)

  return (
    <div style={{ width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, background: '#13131f', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
      {tools.map((t) => {
        const isActive   = activeTool === t.id
        const isDisabled = mode === '3d' && t.id !== 'select'
        return (
          <div key={t.id} className="relative group">
            <button
              onClick={() => !isDisabled && dispatch(setTool(t.id))}
              title={`${t.label} (${t.key})`}
              style={{
                width: 36, height: 36, borderRadius: 10, fontSize: 14,
                border:      isActive ? '1px solid rgba(108,99,255,0.4)' : '1px solid transparent',
                background:  isActive ? 'linear-gradient(135deg,rgba(108,99,255,0.3),rgba(108,99,255,0.1))' : 'transparent',
                color:       isActive ? '#fff' : isDisabled ? '#333' : '#555',
                cursor:      isDisabled ? 'not-allowed' : 'pointer',
                transition:  'all .15s',
              }}
              onMouseEnter={e => { if (!isActive && !isDisabled) e.currentTarget.style.color = '#aaa' }}
              onMouseLeave={e => { if (!isActive && !isDisabled) e.currentTarget.style.color = '#555' }}>
              {t.icon}
            </button>
            {/* Tooltip */}
            <div style={{ position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)', background: '#1a1a2e', color: '#fff', fontSize: 11, padding: '4px 10px', borderRadius: 7, whiteSpace: 'nowrap', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', opacity: 0, transition: 'opacity .15s', zIndex: 100 }}
              className="group-hover:opacity-100">
              {t.label} <span style={{ color: '#555' }}>{t.key}</span>
            </div>
          </div>
        )
      })}

      <div style={{ width: 24, height: 1, background: 'rgba(255,255,255,0.07)', margin: '6px 0' }} />

      {/* Undo */}
      <button title="Undo (Ctrl+Z)" onClick={() => window.__editorUndo?.()}
        style={{ width: 36, height: 36, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: 16 }}
        onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}>↩</button>

      {/* Redo */}
      <button title="Redo (Ctrl+Y)" onClick={() => window.__editorRedo?.()}
        style={{ width: 36, height: 36, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#555', fontSize: 16 }}
        onMouseEnter={e => e.currentTarget.style.color = '#aaa'}
        onMouseLeave={e => e.currentTarget.style.color = '#555'}>↪</button>
    </div>
  )
}