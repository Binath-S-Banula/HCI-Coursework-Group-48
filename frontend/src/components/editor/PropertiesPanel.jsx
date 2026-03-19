export default function PropertiesPanel({
  onClose,
  projectName,
  stats,
  mode,
  activeTool,
  showGrid,
  isDirty,
  lastSaved,
  onOpenHelp,
}) {
  const saveStatus = isDirty
    ? 'Unsaved changes'
    : lastSaved
      ? `Saved at ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
      : 'No saves yet'

  const roomReady = (stats?.walls || 0) >= 4
  const floorReady = (stats?.walls || 0) > 0 && (stats?.furniture || 0) > 0
  const detailReady = (stats?.openings || 0) > 0

  return (
    <section className="editor-insights" aria-label="Editor insights panel">
      <header className="editor-insights__header">
        <div>
          <p className="editor-insights__eyebrow">Project insights</p>
          <h3 className="editor-insights__title">{projectName || 'Untitled project'}</h3>
        </div>
        <button type="button" className="editor-insights__close" onClick={onClose} aria-label="Close insights panel">✕</button>
      </header>

      <div className="editor-insights__status">
        <span className={`editor-insights__pill ${isDirty ? 'editor-insights__pill--dirty' : 'editor-insights__pill--saved'}`}>
          {saveStatus}
        </span>
        <span className="editor-insights__meta">Mode {mode?.toUpperCase() || '2D'} · Tool {activeTool || 'select'}</span>
      </div>

      <section className="editor-insights__section">
        <p className="editor-insights__section-title">Current model</p>
        <div className="editor-insights__stats-grid">
          <article className="editor-insights__stat-card">
            <span className="editor-insights__stat-label">Walls</span>
            <strong className="editor-insights__stat-value">{stats?.walls || 0}</strong>
          </article>
          <article className="editor-insights__stat-card">
            <span className="editor-insights__stat-label">Furniture</span>
            <strong className="editor-insights__stat-value">{stats?.furniture || 0}</strong>
          </article>
          <article className="editor-insights__stat-card">
            <span className="editor-insights__stat-label">Doors / windows</span>
            <strong className="editor-insights__stat-value">{stats?.openings || 0}</strong>
          </article>
          <article className="editor-insights__stat-card">
            <span className="editor-insights__stat-label">Grid</span>
            <strong className="editor-insights__stat-value">{showGrid ? 'On' : 'Off'}</strong>
          </article>
        </div>
      </section>

      <section className="editor-insights__section">
        <p className="editor-insights__section-title">Progress checklist</p>
        <ul className="editor-insights__checklist">
          <li className={roomReady ? 'editor-insights__check--done' : ''}>{roomReady ? '✓' : '○'} Room structure completed (4+ walls)</li>
          <li className={floorReady ? 'editor-insights__check--done' : ''}>{floorReady ? '✓' : '○'} Functional layout with furniture</li>
          <li className={detailReady ? 'editor-insights__check--done' : ''}>{detailReady ? '✓' : '○'} Architectural details (doors/windows)</li>
        </ul>
      </section>

      <section className="editor-insights__section">
        <p className="editor-insights__section-title">HCI quality tips</p>
        <ul className="editor-insights__tips">
          <li>Keep pathways clear by aligning furniture to the grid.</li>
          <li>Use 2D for precise editing and 3D for visual validation.</li>
          <li>Save after major changes to keep gallery thumbnails current.</li>
        </ul>
        <button type="button" className="editor-insights__help-btn" onClick={onOpenHelp}>Open shortcut guide</button>
      </section>
    </section>
  )
}