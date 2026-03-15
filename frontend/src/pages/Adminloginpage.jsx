import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "../store/slices/authSlice";
import "../styles/pages/AdminLoginPage.css";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password required"),
});

export default function AdminLoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated, user } = useSelector((s) => s.auth);
  const [notAdmin, setNotAdmin] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === "admin") {
        setNotAdmin(false);
        navigate("/admin");
      } else {
        dispatch(logout());
        setNotAdmin(true);
      }
    }
  }, [isAuthenticated, user]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const onSubmit = (data) => {
    setNotAdmin(false);
    dispatch(login(data));
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-box">
        <div className="admin-login-logo-wrap">
          <div className="admin-login-logo">⚙️</div>
          <h1>Admin Portal</h1>
          <p>HomePlan3D — Restricted Access</p>
        </div>
        <div className="admin-login-card">
          {notAdmin && (
            <div className="admin-login-error">
              ⛔ This account does not have admin access.
            </div>
          )}
          {error && !notAdmin && (
            <div className="admin-login-error">{error}</div>
          )}
          <div className="admin-login-warning">
            🔒 Admin accounts only. Clients use the{" "}
            <span onClick={() => navigate("/login")}>regular login</span>.
          </div>
          <form className="admin-login-form" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label>Admin Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="admin@homeplan3d.com"
                className={errors.email ? "error" : ""}
              />
              {errors.email && (
                <div className="admin-login-field-err">
                  {errors.email.message}
                </div>
              )}
            </div>
            <div>
              <label>Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={errors.password ? "error" : ""}
              />
              {errors.password && (
                <div className="admin-login-field-err">
                  {errors.password.message}
                </div>
              )}
            </div>
            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "⚙️ Sign In as Admin"}
            </button>
          </form>
        </div>
        <p className="admin-login-footer">
          Not an admin?{" "}
          <span onClick={() => navigate("/login")}>Go to client login →</span>
        </p>
      </div>
    </div>
  );
}
