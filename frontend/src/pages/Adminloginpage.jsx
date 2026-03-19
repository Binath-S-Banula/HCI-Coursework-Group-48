import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { login, logout } from "../store/slices/authSlice";
import { Lock, ArrowRight, LogIn } from "lucide-react";
import logoImage from "../uploads/homeland-logo.png";
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
          <img src={logoImage} alt="HomePlan3D Logo" className="admin-login-logo" />
          <h1>Admin Portal</h1>
          <p>Management Dashboard</p>
        </div>
        
        <div className="admin-login-card">
          {notAdmin && (
            <div className="admin-login-error">
              <Lock size={16} /> 
              <span>This account does not have admin access.</span>
            </div>
          )}
          
          {error && !notAdmin && (
            <div className="admin-login-error">
              <Lock size={16} /> 
              <span>{error}</span>
            </div>
          )}
          
          <div className="admin-login-warning">
            <Lock size={16} /> 
            <span>
              Admin accounts only. Regular users should use the <span onClick={() => navigate("/login")}>client login</span>.
            </span>
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
              {loading ? (
                <>Loading...</>
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In as Admin
                </>
              )}
            </button>
          </form>
          
          <div className="admin-login-footer">
            <span onClick={() => navigate("/login")}>← Back to client login</span>
          </div>
        </div>
      </div>
    </div>
  );
}
