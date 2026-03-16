import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../store/slices/authSlice";
import "../styles/pages/AdminPage.css";

const getStore = () =>
  JSON.parse(
    localStorage.getItem("adminAssets") || '{"furniture":[],"textures":[]}',
  );
const saveStore = (data) =>
  localStorage.setItem("adminAssets", JSON.stringify(data));
const CATS = [
  "sofa",
  "chair",
  "table",
  "bed",
  "storage",
  "lighting",
  "kitchen",
  "bathroom",
  "decor",
];
const NAV = [
  { id: "dashboard", icon: "📊", label: "Dashboard" },
  { id: "furniture", icon: "🪑", label: "Furniture" },
  { id: "textures", icon: "🎨", label: "Textures" },
];

export default function AdminPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const [page, setPage] = useState("dashboard");
  const [store, setStore] = useState(getStore);
  const [form, setForm] = useState({
    name: "",
    category: "sofa",
    price: "",
    width: "",
    depth: "",
  });
  const [texForm, setTexForm] = useState({ name: "", type: "wall" });
  const [preview, setPreview] = useState(null);
  const [texPrev, setTexPrev] = useState(null);
  const [msg, setMsg] = useState("");

  const flash = (t) => {
    setMsg(t);
    setTimeout(() => setMsg(""), 2500);
  };
  const readFile = (file, cb) => {
    const r = new FileReader();
    r.onload = (e) => cb(e.target.result);
    r.readAsDataURL(file);
  };

  const addFurniture = () => {
    if (!preview || !form.name) return flash("⚠ Please add a name and image");
    const item = {
      id: `f_${Date.now()}`,
      ...form,
      price: +form.price || 0,
      width: +form.width || 80,
      depth: +form.depth || 80,
      image: preview,
      addedAt: new Date().toISOString(),
    };
    const next = { ...store, furniture: [item, ...store.furniture] };
    saveStore(next);
    setStore(next);
    setPreview(null);
    setForm({ name: "", category: "sofa", price: "", width: "", depth: "" });
    flash("✓ Furniture added!");
  };
  const addTexture = () => {
    if (!texPrev || !texForm.name)
      return flash("⚠ Please add a name and image");
    const item = {
      id: `t_${Date.now()}`,
      ...texForm,
      image: texPrev,
      addedAt: new Date().toISOString(),
    };
    const next = { ...store, textures: [item, ...store.textures] };
    saveStore(next);
    setStore(next);
    setTexPrev(null);
    setTexForm({ name: "", type: "wall" });
    flash("✓ Texture added!");
  };
  const del = (section, id) => {
    const next = {
      ...store,
      [section]: store[section].filter((i) => i.id !== id),
    };
    saveStore(next);
    setStore(next);
  };
  const handleLogout = () => {
    dispatch(logout());
    navigate("/admin/login");
  };

  const Flash = () =>
    !msg ? null : (
      <div
        className={`admin-flash ${msg.startsWith("⚠") ? "admin-flash--error" : "admin-flash--success"}`}
      >
        {msg}
      </div>
    );

  const UploadBox = ({ preview, onFile, onClear, icon, label }) => (
    <div>
      <label
        className={`admin-upload-box ${preview ? "admin-upload-box--filled" : ""}`}
      >
        {preview ? (
          <img src={preview} alt="preview" />
        ) : (
          <>
            <span className="admin-upload-box__icon">{icon}</span>
            <span className="admin-upload-box__label">{label}</span>
          </>
        )}
        <input
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f, onFile);
            e.target.value = "";
          }}
        />
      </label>
      {preview && (
        <button className="admin-upload-clear" onClick={onClear}>
          ✕ Remove
        </button>
      )}
    </div>
  );

  const Field = ({ label, field, placeholder, type = "text", obj, setObj }) => (
    <div className="admin-field">
      <label>{label}</label>
      <input
        type={type}
        value={obj[field]}
        placeholder={placeholder}
        onChange={(e) => setObj((p) => ({ ...p, [field]: e.target.value }))}
      />
    </div>
  );

  const ItemCard = ({ item, section, isTexture }) => (
    <div className="admin-item-card">
      <img
        src={item.image}
        alt={item.name}
        className={isTexture ? "admin-item-card--texture" : ""}
      />
      <div className="admin-item-card__body">
        <div className="admin-item-card__name">{item.name}</div>
        <div className="admin-item-card__meta">
          {isTexture
            ? item.type === "wall"
              ? "🧱 Wall"
              : "🪵 Floor"
            : `${item.category} • $${item.price}`}
        </div>
      </div>
      <button
        className="admin-item-card__delete"
        onClick={() => del(section, item.id)}
      >
        ✕
      </button>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────
  const DashboardView = () => (
    <div>
      <h2
        style={{
          fontFamily: "Syne,sans-serif",
          fontWeight: 900,
          fontSize: "1.375rem",
          marginBottom: "0.25rem",
        }}
      >
        Dashboard
      </h2>
      <p
        style={{
          color: "rgba(255,255,255,0.3)",
          fontSize: "0.875rem",
          marginBottom: "2rem",
        }}
      >
        Welcome back, {user?.name} 👋
      </p>
      <div className="admin-stats">
        {[
          {
            label: "Furniture",
            value: store.furniture.length,
            icon: "🪑",
            cls: "text-accent",
          },
          {
            label: "Textures",
            value: store.textures.length,
            icon: "🎨",
            cls: "text-teal",
          },
          {
            label: "Wall Textures",
            value: store.textures.filter((t) => t.type === "wall").length,
            icon: "🧱",
            cls: "text-orange",
          },
          {
            label: "Floor Textures",
            value: store.textures.filter((t) => t.type === "floor").length,
            icon: "🪵",
            cls: "text-blue",
          },
        ].map((s) => (
          <div key={s.label} className="admin-stat-card">
            <div className="admin-stat-card__icon">{s.icon}</div>
            <div className={`admin-stat-card__value ${s.cls}`}>{s.value}</div>
            <div className="admin-stat-card__label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <div className="admin-section-header">
          <span className="admin-section-title">Recent Furniture</span>
          <button
            className="admin-section-link admin-section-link--purple"
            onClick={() => setPage("furniture")}
          >
            View all →
          </button>
        </div>
        {store.furniture.length === 0 ? (
          <div className="admin-empty">
            No furniture yet —{" "}
            <button
              className="admin-section-link admin-section-link--purple"
              onClick={() => setPage("furniture")}
            >
              Add some →
            </button>
          </div>
        ) : (
          <div className="admin-mini-grid">
            {store.furniture.slice(0, 8).map((item) => (
              <div key={item.id} className="admin-mini-card">
                <img src={item.image} alt={item.name} />
                <div className="admin-mini-card__label">{item.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="admin-section-header">
          <span className="admin-section-title">Recent Textures</span>
          <button
            className="admin-section-link admin-section-link--teal"
            onClick={() => setPage("textures")}
          >
            View all →
          </button>
        </div>
        {store.textures.length === 0 ? (
          <div className="admin-empty">
            No textures yet —{" "}
            <button
              className="admin-section-link admin-section-link--teal"
              onClick={() => setPage("textures")}
            >
              Add some →
            </button>
          </div>
        ) : (
          <div className="admin-mini-grid">
            {store.textures.slice(0, 8).map((item) => (
              <div
                key={item.id}
                className="admin-mini-card admin-mini-card--texture"
              >
                <img src={item.image} alt={item.name} />
                <div className="admin-mini-card__label">{item.name}</div>
                <div className="admin-mini-card__sublabel">
                  {item.type === "wall" ? "🧱 Wall" : "🪵 Floor"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Furniture ──────────────────────────────────────────────────
  const FurnitureView = () => (
    <div>
      <h2
        style={{
          fontFamily: "Syne,sans-serif",
          fontWeight: 900,
          fontSize: "1.375rem",
          marginBottom: "1.5rem",
        }}
      >
        Furniture Catalog
      </h2>
      <Flash />
      <div className="admin-page-grid">
        <div className="admin-form-card">
          <h3>+ Add Furniture</h3>
          <UploadBox
            preview={preview}
            onFile={setPreview}
            onClear={() => setPreview(null)}
            icon="🪑"
            label="Upload furniture image"
          />
          <Field
            label="Name *"
            field="name"
            placeholder="e.g. Modern Sofa"
            obj={form}
            setObj={setForm}
          />
          <Field
            label="Price ($)"
            field="price"
            placeholder="299"
            type="number"
            obj={form}
            setObj={setForm}
          />
          <Field
            label="Width (cm)"
            field="width"
            placeholder="120"
            type="number"
            obj={form}
            setObj={setForm}
          />
          <Field
            label="Depth (cm)"
            field="depth"
            placeholder="80"
            type="number"
            obj={form}
            setObj={setForm}
          />
          <div className="admin-field">
            <label>Category</label>
            <select
              value={form.category}
              onChange={(e) =>
                setForm((p) => ({ ...p, category: e.target.value }))
              }
            >
              {CATS.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <button className="admin-submit-purple" onClick={addFurniture}>
            Add Furniture
          </button>
        </div>
        <div>
          <div className="admin-item-count">
            {store.furniture.length} items in catalog
          </div>
          {store.furniture.length === 0 ? (
            <div className="admin-empty">No furniture added yet</div>
          ) : (
            <div className="admin-items-grid">
              {store.furniture.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  section="furniture"
                  isTexture={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ── Textures ───────────────────────────────────────────────────
  const TexturesView = () => (
    <div>
      <h2
        style={{
          fontFamily: "Syne,sans-serif",
          fontWeight: 900,
          fontSize: "1.375rem",
          marginBottom: "1.5rem",
        }}
      >
        Texture Library
      </h2>
      <Flash />
      <div className="admin-page-grid">
        <div className="admin-form-card">
          <h3>+ Add Texture</h3>
          <UploadBox
            preview={texPrev}
            onFile={setTexPrev}
            onClear={() => setTexPrev(null)}
            icon="🎨"
            label="Upload texture image"
          />
          <Field
            label="Name *"
            field="name"
            placeholder="e.g. Marble Floor"
            obj={texForm}
            setObj={setTexForm}
          />
          <div className="admin-field">
            <label>Apply To</label>
            <div className="admin-type-toggle">
              <button
                className={`admin-type-btn ${texForm.type === "wall" ? "admin-type-btn--wall-active" : "admin-type-btn--wall-inactive"}`}
                onClick={() => setTexForm((p) => ({ ...p, type: "wall" }))}
              >
                🧱 Wall
              </button>
              <button
                className={`admin-type-btn ${texForm.type === "floor" ? "admin-type-btn--floor-active" : "admin-type-btn--floor-inactive"}`}
                onClick={() => setTexForm((p) => ({ ...p, type: "floor" }))}
              >
                🪵 Floor
              </button>
            </div>
          </div>
          <button className="admin-submit-teal" onClick={addTexture}>
            Add Texture
          </button>
        </div>
        <div>
          <div className="admin-item-count">
            {store.textures.length} textures in library
          </div>
          {store.textures.length === 0 ? (
            <div className="admin-empty">No textures added yet</div>
          ) : (
            <div className="admin-items-grid">
              {store.textures.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  section="textures"
                  isTexture={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const currentNav = NAV.find((n) => n.id === page);

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar__logo">
          <div className="admin-sidebar__logo-icon">⚙️</div>
          <div className="admin-sidebar__logo-text">
            <div className="admin-sidebar__logo-name">HomePlan3D</div>
            <div className="admin-sidebar__logo-badge">Admin Panel</div>
          </div>
        </div>

        <nav className="admin-sidebar__nav">
          <div className="admin-sidebar__section-label">Menu</div>
          {NAV.map((item) => {
            const active = page === item.id;
            const count =
              item.id === "furniture"
                ? store.furniture.length
                : item.id === "textures"
                  ? store.textures.length
                  : null;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className={`admin-nav-btn ${active ? "admin-nav-btn--active" : "admin-nav-btn--inactive"}`}
              >
                <span className="admin-nav-btn__icon">{item.icon}</span>
                <span className="admin-nav-btn__label">{item.label}</span>
                {count > 0 && (
                  <span
                    className={`admin-nav-btn__badge ${item.id === "textures" ? "admin-nav-btn__badge--teal" : "admin-nav-btn__badge--purple"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar__user">
          <div className="admin-sidebar__user-info">
            <div className="admin-sidebar__avatar">
              {user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div>
              <div className="admin-sidebar__user-name">{user?.name}</div>
              <div className="admin-sidebar__user-role">Administrator</div>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar__title">
            {currentNav?.icon} {currentNav?.label}
          </div>
          <div className="admin-topbar__sub">
            {page === "dashboard" && "Overview of your catalog"}
            {page === "furniture" && "Manage furniture items for clients"}
            {page === "textures" && "Manage wall and floor textures"}
          </div>
        </header>
        <main className="admin-content">
          {page === "dashboard" && <DashboardView />}
          {page === "furniture" && <FurnitureView />}
          {page === "textures" && <TexturesView />}
        </main>
      </div>
    </div>
  );
}
