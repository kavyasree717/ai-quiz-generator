import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <header className="navbar">
      <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
        <span className="logo-box">
          {/* pencil icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </span>
        <span className="brand-text">AI Quiz Generator</span>
      </Link>

      <div className="nav-right">
        <button className="icon-btn" onClick={toggle} title="Toggle theme" aria-label="Toggle theme">
          {theme === "light" ? (
            // moon
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
            </svg>
          ) : (
            // sun
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
            </svg>
          )}
        </button>

        {!user ? (
          <Link to="/login" className="btn signin-btn">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            Sign In
          </Link>
        ) : null}

        <button
          className="icon-btn hamburger"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      </div>

      {menuOpen && (
        <div className="dropdown-menu" onClick={() => setMenuOpen(false)}>
          {user ? (
            <>
              <span className="dropdown-user">👋 {user.full_name || user.email}</span>
              <NavLink to="/create">Create Quiz</NavLink>
              <NavLink to="/library">My Quizzes</NavLink>
              <NavLink to="/settings">Settings</NavLink>
              <button className="dropdown-logout" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <NavLink to="/">Home</NavLink>
              <NavLink to="/login">Sign In / Sign Up</NavLink>
            </>
          )}
        </div>
      )}
    </header>
  );
}
