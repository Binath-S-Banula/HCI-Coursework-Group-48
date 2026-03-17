import { useDispatch, useSelector } from 'react-redux'
import { AppWindow, DoorOpen, Minus, MousePointer2, Redo2, Square, Undo2 } from 'lucide-react'
import { setTool } from '../../store/slices/editorSlice'

const tools = [
  { id: 'select',  icon: MousePointer2, label: 'Select',  key: 'V' },
  { id: 'wall',    icon: Minus,         label: 'Wall',    key: 'W' },
  { id: 'floor',   icon: Square,        label: 'Floor',   key: 'F' },
  { id: 'door',    icon: DoorOpen,      label: 'Door',    key: 'D' },
  { id: 'window',  icon: AppWindow,     label: 'Window',  key: 'N' },
]

export default function EditorToolbar() {
  const dispatch    = useDispatch()
  const { activeTool, mode } = useSelector((s) => s.editor)

  return (
    <div style={{ width: 52, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, background: '#13131f', borderRight: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
      {tools.map((t) => {
        const isActive   = activeTool === t.id
        const isDisabled = mode === '3d' && t.id !== 'select'
        const Icon = t.icon
        const baseColor = isActive ? '#fff' : isDisabled ? '#3d4256' : '#8b92ad'
        return (
          <div key={t.id} className="relative group">
            <button
              onClick={() => !isDisabled && dispatch(setTool(t.id))}
              title={`${t.label} (${t.key})`}
              style={{
                width: 38, height: 38, borderRadius: 10, fontSize: 14,
                border:      isActive ? '1px solid rgba(108,99,255,0.4)' : '1px solid transparent',
                background:  isActive ? 'linear-gradient(135deg,rgba(108,99,255,0.3),rgba(108,99,255,0.1))' : 'transparent',
                color:       baseColor,
                cursor:      isDisabled ? 'not-allowed' : 'pointer',
                transition:  'all .15s',
              }}
              onMouseEnter={e => { if (!isActive && !isDisabled) e.currentTarget.style.color = '#d2d7ee' }}
              onMouseLeave={e => { if (!isActive && !isDisabled) e.currentTarget.style.color = '#8b92ad' }}>
              <Icon size={18} strokeWidth={2.1} />
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
        style={{ width: 38, height: 38, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#8b92ad', fontSize: 16 }}
        onMouseEnter={e => e.currentTarget.style.color = '#d2d7ee'}
        onMouseLeave={e => e.currentTarget.style.color = '#8b92ad'}><Undo2 size={18} strokeWidth={2.1} /></button>

      {/* Redo */}
      <button title="Redo (Ctrl+Y)" onClick={() => window.__editorRedo?.()}
        style={{ width: 38, height: 38, borderRadius: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: '#8b92ad', fontSize: 16 }}
        onMouseEnter={e => e.currentTarget.style.color = '#d2d7ee'}
        onMouseLeave={e => e.currentTarget.style.color = '#8b92ad'}><Redo2 size={18} strokeWidth={2.1} /></button>
    </div>
  )
}