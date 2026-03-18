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
    <aside className="editor-toolbar" aria-label="Editor tools">
      <p className="editor-toolbar__section-label">Tools</p>

      {tools.map((t) => {
        const isActive   = activeTool === t.id
        const isDisabled = mode === '3d' && t.id !== 'select'
        const Icon = t.icon

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => !isDisabled && dispatch(setTool(t.id))}
            title={`${t.label} (${t.key})`}
            disabled={isDisabled}
            className={`editor-tool-btn ${isActive ? 'editor-tool-btn--active' : 'editor-tool-btn--inactive'} ${isDisabled ? 'editor-tool-btn--disabled' : ''}`}>
            <span className="editor-tool-btn__icon" aria-hidden="true">
              <Icon size={17} strokeWidth={2.1} />
            </span>
            <span className="editor-tool-btn__label-wrap">
              <span className="editor-tool-btn__label">{t.label}</span>
            </span>
          </button>
        )
      })}

      <div className="editor-tool-divider" />

      <p className="editor-toolbar__section-label">History</p>

      <button
        type="button"
        title="Undo (Ctrl+Z)"
        onClick={() => window.__editorUndo?.()}
        className="editor-tool-btn editor-tool-btn--secondary">
        <span className="editor-tool-btn__icon" aria-hidden="true"><Undo2 size={17} strokeWidth={2.1} /></span>
        <span className="editor-tool-btn__label-wrap">
          <span className="editor-tool-btn__label">Undo</span>
        </span>
      </button>

      <button
        type="button"
        title="Redo (Ctrl+Y)"
        onClick={() => window.__editorRedo?.()}
        className="editor-tool-btn editor-tool-btn--secondary">
        <span className="editor-tool-btn__icon" aria-hidden="true"><Redo2 size={17} strokeWidth={2.1} /></span>
        <span className="editor-tool-btn__label-wrap">
          <span className="editor-tool-btn__label">Redo</span>
        </span>
      </button>
    </aside>
  )
}