import React, { useState } from 'react';
import { X, User, Mail, Lock, Eye, EyeOff, LogIn, UserPlus, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: { name: string; email: string }) => void;
  initialMode?: 'login' | 'register';
  bannerMessage?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  initialMode = 'register',
  bannerMessage,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email.trim() || !password.trim()) {
      setError('Harap isi Email dan Password.');
      return;
    }

    if (mode === 'register' && !name.trim()) {
      setError('Harap isi Nama Lengkap Anda.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const isRegister = mode === 'register';

    try {
      let userSession = { name: '', email: '' };

      if (isRegister) {
        const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth');
        const { auth } = await import('../firebase');
        
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(userCredential.user, { displayName: name.trim() });
        
        userSession = {
          name: name.trim(),
          email: cleanEmail,
        };
        setSuccess('Pendaftaran berhasil! Terdaftar di Firebase.');
      } else {
        const { signInWithEmailAndPassword } = await import('firebase/auth');
        const { auth } = await import('../firebase');
        
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
        
        userSession = {
          name: userCredential.user.displayName || cleanEmail.split('@')[0],
          email: cleanEmail,
        };
        setSuccess('Login berhasil!');
      }

      localStorage.setItem('sora_user_session', JSON.stringify(userSession));

      setTimeout(() => {
        onLoginSuccess(userSession);
        onClose();
      }, 600);
    } catch (err: any) {
      console.error("Auth error:", err);
      // Firebase auth error translation
      let errorMessage = 'Terjadi kesalahan sistem.';
      if (err.code === 'auth/email-already-in-use') errorMessage = 'Email sudah terdaftar.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') errorMessage = 'Email atau password salah.';
      if (err.code === 'auth/weak-password') errorMessage = 'Password terlalu lemah (minimal 6 karakter).';
      
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-md bg-[#171717] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in duration-200">

        {/* Header gradient bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-white via-gray-300 to-gray-500" />

        <div className="p-6 sm:p-8 flex flex-col gap-6">

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors cursor-pointer w-8 h-8 flex items-center justify-center"
          >
            <span className="mdi mdi-close-box-outline text-2xl leading-none"></span>
          </button>

          {/* Title & Brand */}
          <div className="flex flex-col items-center text-center gap-1.5">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {mode === 'register' ? 'Daftar Akun SORA AI' : 'Masuk ke SORA AI'}
            </h2>
            <p className="text-xs sm:text-sm text-white/60">
              {mode === 'register'
                ? 'Buat akun gratis Anda untuk mulai berkirim pesan dengan AI'
                : 'Masuk dengan akun yang telah Anda daftarkan'}
            </p>
          </div>

          {/* Banner message if directed from prompt */}
          {bannerMessage && (
            <div className="bg-white/10 border border-white/30 rounded-xl p-3 text-xs sm:text-sm text-white text-center leading-relaxed">
              {bannerMessage}
            </div>
          )}

          {/* Tab Switcher */}
          <div className="flex gap-4 border-b border-white/10 pb-2">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError('');
                setSuccess('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-sm sm:text-base font-semibold transition-all cursor-pointer relative ${mode === 'login'
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
                }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Masuk (Login)</span>
              {mode === 'login' && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-white rounded-t-full"></div>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError('');
                setSuccess('');
              }}
              className={`flex items-center justify-center gap-2 py-2 text-sm sm:text-base font-semibold transition-all cursor-pointer relative ${mode === 'register'
                  ? 'text-white'
                  : 'text-white/40 hover:text-white/70'
                }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Daftar (Register)</span>
              {mode === 'register' && (
                <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-white rounded-t-full"></div>
              )}
            </button>
          </div>

          {/* Error / Success Notifications */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-xs sm:text-sm text-rose-300 text-center">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-white/10 border border-white/30 rounded-xl p-3 text-xs sm:text-sm text-white text-center">
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* Field: Nama (Register mode only) */}
            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-white/80">Nama Lengkap</label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-white/40 absolute left-3.5" />
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama lengkap Anda"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#212121] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Field: Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">Alamat Email</label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-white/40 absolute left-3.5" />
                <input
                  type="email"
                  required
                  placeholder="contoh@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#212121] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                />
              </div>
            </div>

            {/* Field: Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-white/80">Kata Sandi (Password)</label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 text-white/40 absolute left-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#212121] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-white/40 hover:text-white p-1 rounded-md"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="mt-2 w-full py-3 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {mode === 'register' ? (
                <>
                  <UserPlus className="w-4 h-4 text-black" />
                  <span>Daftar Akun Sekarang</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-black" />
                  <span>Masuk ke Akun</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle text link */}
          <div className="text-center text-xs text-white/60">
            {mode === 'register' ? (
              <span>
                Sudah punya akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError('');
                  }}
                  className="text-white hover:underline font-semibold cursor-pointer"
                >
                  Masuk di sini
                </button>
              </span>
            ) : (
              <span>
                Belum memiliki akun?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError('');
                  }}
                  className="text-white hover:underline font-semibold cursor-pointer"
                >
                  Daftar di sini
                </button>
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
