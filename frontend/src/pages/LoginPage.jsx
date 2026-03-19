import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../store/slices/authSlice";
import "../styles/pages/LoginPage.css";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isAuthenticated } = useSelector((s) => s.auth);
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });
  const onSubmit = (data) => dispatch(login(data));

  return (
    <div className="auth-page">
      <div className="auth-box">
        <div className="auth-logo-wrap">
          <div className="auth-logo">H</div>
          <h1>Welcome back</h1>
          <p>Sign in to continue designing</p>
        </div>
        <div className="auth-card">
          {error && <div className="auth-error">{error}</div>}
          <form className="auth-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="auth-field">
              <label>Email</label>
              <input
                {...register("email")}
                type="email"
                placeholder="hello@example.com"
                className={errors.email ? "error" : ""}
              />
              {errors.email && (
                <span className="auth-field__err">{errors.email.message}</span>
              )}
            </div>
            <div className="auth-field">
              <label>Password</label>
              <input
                {...register("password")}
                type="password"
                placeholder="••••••••"
                className={errors.password ? "error" : ""}
              />
              {errors.password && (
                <span className="auth-field__err">
                  {errors.password.message}
                </span>
              )}
            </div>
            <div className="auth-forgot">
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
          <p className="auth-footer">
            Don't have an account? <Link to="/register">Sign up free</Link>
          </p>
        </div>
        <div className="auth-back">
          <Link to="/">← Back to homepage</Link>
        </div>
      </div>
    </div>
  );
}
