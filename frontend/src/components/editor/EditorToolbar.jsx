import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppWindow, ChevronDown, DoorOpen, Minus, MousePointer2, Redo2, Square, Undo2 } from 'lucide-react'
import { setOpeningDesign, setTool } from '../../store/slices/editorSlice'

const tools = [
  { id: 'select',  icon: MousePointer2, label: 'Select',  key: 'V' },
  { id: 'wall',    icon: Minus,         label: 'Wall',    key: 'W' },
  { id: 'floor',   icon: Square,        label: 'Floor',   key: 'F' },
  { id: 'door',    icon: DoorOpen,      label: 'Door',    key: 'D' },
  { id: 'window',  icon: AppWindow,     label: 'Window',  key: 'N' },
]

const openingVariants = {
  door: [
    { id: 'single', label: 'Single Door', icon: '🚪' },
    { id: 'double', label: 'Double Door', icon: '🚪🚪' },
    { id: 'sliding', label: 'Sliding Door', icon: '⇆' },
  ],
  window: [
    { id: 'casement', label: 'Casement Window', icon: '🪟' },
    { id: 'sliding', label: 'Sliding Window', icon: '⇆' },
    { id: 'bay', label: 'Bay Window', icon: '⬒' },
  ],
}

export default function EditorToolbar() {
  const dispatch    = useDispatch()
  const { activeTool, mode, openingDesigns } = useSelector((s) => s.editor)
  const [hoveredTool, setHoveredTool] = useState(null)

  const selectTool = (toolId, isDisabled) => {
    if (isDisabled) return
    dispatch(setTool(toolId))
    if (toolId !== 'door' && toolId !== 'window') {
      setHoveredTool(null)
    }
  }

  const selectVariant = (toolId, designId) => {
    dispatch(setOpeningDesign({ type: toolId, design: designId }))
    dispatch(setTool(toolId))
  }

  return (
    <aside className="editor-toolbar" aria-label="Editor tools">
      <p className="editor-toolbar__section-label">Tools</p>

      {tools.map((t) => {
        const isActive   = activeTool === t.id
        const isDisabled = mode === '3d' && t.id !== 'select'
        const Icon = t.icon
        const isOpeningTool = t.id === 'door' || t.id === 'window'
        const isExpanded = hoveredTool === t.id && isOpeningTool && !isDisabled
        const variants = openingVariants[t.id] || []
        const selectedVariant = openingDesigns?.[t.id]

        return (
          <div
            key={t.id}
            className="editor-tool-group"
            onMouseEnter={() => { if (isOpeningTool && !isDisabled) setHoveredTool(t.id) }}
            onMouseLeave={() => { if (isOpeningTool) setHoveredTool(null) }}
            onFocusCapture={() => { if (isOpeningTool && !isDisabled) setHoveredTool(t.id) }}
            onBlurCapture={(e) => {
              if (!isOpeningTool) return
              if (!e.currentTarget.contains(e.relatedTarget)) setHoveredTool(null)
            }}>
            <button
              type="button"
              onClick={() => selectTool(t.id, isDisabled)}
              onFocus={() => { if (isOpeningTool && !isDisabled) setHoveredTool(t.id) }}
              title={`${t.label} (${t.key})`}
              disabled={isDisabled}
              className={`editor-tool-btn ${isActive ? 'editor-tool-btn--active' : 'editor-tool-btn--inactive'} ${isDisabled ? 'editor-tool-btn--disabled' : ''}`}>
              <span className="editor-tool-btn__icon" aria-hidden="true">
                <Icon size={17} strokeWidth={2.1} />
              </span>
              <span className="editor-tool-btn__label-wrap">
                <span className="editor-tool-btn__label">{t.label}</span>
              </span>
              {isOpeningTool && (
                <span className="editor-tool-btn__caret" aria-hidden="true">
                  <ChevronDown className={`editor-tool-btn__caret-icon ${isExpanded ? 'editor-tool-btn__caret-icon--open' : ''}`} size={15} strokeWidth={2.5} />
                </span>
              )}
            </button>

            {isExpanded && (
              <div className="editor-tool-variants" role="listbox" aria-label={`${t.label} designs`}>
                {variants.map((variant) => {
                  const isVariantActive = selectedVariant === variant.id
                  return (
                    <button
                      key={variant.id}
                      type="button"
                      className={`editor-tool-variant-btn ${isVariantActive ? 'editor-tool-variant-btn--active' : ''}`}
                      onClick={() => selectVariant(t.id, variant.id)}>
                      <span className="editor-tool-variant-btn__icon" aria-hidden="true">{variant.icon}</span>
                      <span className="editor-tool-variant-btn__text">{variant.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
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