import { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

type LoginResponse = {
  token: string;
  user: {
    id: string;
    full_name: string;
    email: string;
    email_verified: boolean;
    is_active: boolean;
    created_at: string;
  };
};

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [loading, setLoading] = useState(false);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

  const validateForm = () => {
    const newErrors: { email?: string; password?: string; form?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setErrors({}); // limpia errores globales

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include', // si luego usas cookies httpOnly
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => null)) as any;

      if (!res.ok) {
        const msg =
          data?.error ||
          (res.status === 401 ? 'Invalid email or password' : 'Login failed');
        setErrors((prev) => ({ ...prev, form: msg }));
        return;
      }

      const { token, user } = data as LoginResponse;

      // Guarda token y user (ajusta a tu gusto)
      localStorage.setItem('leofy_token', token);
      localStorage.setItem('leofy_user', JSON.stringify(user));

      // Si quieres mantener tu flag:
      localStorage.setItem('leofy_onboarded', 'true');

      navigate('/');
    } catch (err) {
      setErrors((prev) => ({ ...prev, form: 'Network error. Is the API running?' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#2DD4BF] to-[#14B8A6] mb-4">
            <span className="text-3xl font-bold text-white">L</span>
          </div>
          <h1 className="text-3xl font-semibold text-[#1F2933] mb-2">Welcome back</h1>
          <p className="text-[#64748B]">Log in to continue to Leofy</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-2xl p-6 lg:p-8 shadow-sm border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error global */}
            {errors.form && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                {errors.form}
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#64748B] mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                    if (errors.form) setErrors({ ...errors, form: undefined });
                  }}
                  placeholder="your@email.com"
                  className={`w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.email ? 'ring-2 ring-red-400 focus:ring-red-400' : 'focus:ring-[#2DD4BF]'
                  }`}
                />
              </div>
              {errors.email && <p className="mt-2 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#64748B] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                    if (errors.form) setErrors({ ...errors, form: undefined });
                  }}
                  placeholder="Enter your password"
                  className={`w-full pl-12 pr-12 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 transition-all ${
                    errors.password ? 'ring-2 ring-red-400 focus:ring-red-400' : 'focus:ring-[#2DD4BF]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#1F2933] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-2 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Forgot Password */}
            <div className="text-right">
              <Link
                to="/forgot-password"
                className="text-sm text-[#2DD4BF] hover:text-[#14B8A6] transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#2DD4BF] text-white font-semibold rounded-xl hover:bg-[#14B8A6] transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in…' : 'Log in'}
            </button>
          </form>
        </div>

        {/* Create Account */}
        <div className="text-center mt-6">
          <p className="text-[#64748B]">
            Don't have an account?{' '}
            <Link
              to="/onboarding"
              className="text-[#2DD4BF] hover:text-[#14B8A6] font-medium transition-colors"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}