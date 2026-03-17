import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Command } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { api } from '@/lib/api';
import { motion } from 'framer-motion';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/auth/login', { email, password });
      useAuthStore.setState({ 
        user: response.data.user, 
        isAuthenticated: true, 
        isLoading: false 
      });
      try {
        const companiesResp = await api.get('/companies');
        useAuthStore.getState().setCompanies(
          companiesResp.data.companies || [],
          companiesResp.data.activeCompanyId || response.data.user?.companyId || null,
          companiesResp.data.activeRole || response.data.user?.role || null
        );
        if ((companiesResp.data.companies || []).length === 0) {
          navigate('/onboarding/company');
        } else {
          navigate('/dashboard');
        }
      } catch {
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col lg:flex-row font-sans overflow-hidden">
      {/* Spotlight Effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-30 transition-opacity duration-300"
        style={{
          background: `radial-gradient(1000px circle at ${mousePos.x}px ${mousePos.y}px, rgba(79, 79, 241, 0.08), transparent 40%)`
        }}
      />

      {/* Visual Side */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden border-r border-white/5">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-tr from-[#4F4FF1]/10 to-transparent" />
        
        <div className="relative z-10 px-24 max-w-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-12"
          >
             <div className="w-14 h-14 rounded-2xl bg-[#4F4FF1] flex items-center justify-center shadow-2xl shadow-blue-500/20">
               <Command className="w-8 h-8 text-white" />
             </div>
             <div className="font-heading font-black text-4xl tracking-tighter uppercase">FinLedger Pro</div>
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl font-heading font-black italic tracking-tighter mb-10 leading-[0.9]"
          >
            Precision meets <br />
            <span className="text-white/20">Intelligence.</span>
          </motion.h2>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-white/40 font-medium leading-relaxed mb-16"
          >
            Log in to access your multi-tenant financial core, AI insights, and real-time profitability engine.
          </motion.p>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-2 gap-8"
          >
            <div className="glass-card p-8 group">
              <div className="text-[#4F4FF1] text-4xl font-heading font-black tracking-tighter mb-2 group-hover:scale-110 transition-transform">20+</div>
              <div className="text-white/20 text-[10px] font-mono font-black uppercase tracking-widest">Financial Ratios</div>
            </div>
            <div className="glass-card p-8 group">
              <div className="text-[#4F4FF1] text-4xl font-heading font-black tracking-tighter mb-2 group-hover:scale-110 transition-transform">99.9%</div>
              <div className="text-white/20 text-[10px] font-mono font-black uppercase tracking-widest">Data Precision</div>
            </div>
          </motion.div>
        </div>

        {/* Floating gradient balls */}
        <div className="absolute -bottom-20 -left-20 w-[40rem] h-[40rem] bg-[#4F4FF1]/10 rounded-full blur-[120px] -z-10" />
      </div>

      {/* Form Side */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-20 relative z-40 bg-black">
        <div className="max-w-md w-full">
          <div className="mb-12 lg:hidden flex items-center gap-4">
             <div className="w-10 h-10 rounded-xl bg-[#4F4FF1] flex items-center justify-center">
               <Command className="w-6 h-6 text-white" />
             </div>
             <div className="font-heading font-black text-2xl tracking-tighter uppercase">FinLedger</div>
          </div>

          <div className="mb-16">
            <h1 className="text-5xl font-heading font-black tracking-tighter mb-4 italic uppercase">Back in Control.</h1>
            <p className="text-white/40 font-mono font-black uppercase tracking-[0.2em] text-[10px]">Secure access to your intelligence hub.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-10">
            <div className="space-y-3">
              <label className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-white/10">Entity ID / Email</label>
              <div className="relative group">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-[#4F4FF1]/50 focus:bg-white/[0.05] text-white px-6 py-4 rounded-2xl outline-none transition-all font-medium text-lg"
                  placeholder="name@enterprise.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono font-black uppercase tracking-[0.3em] text-white/10">Access Token / Password</label>
                <a href="#" className="text-[10px] font-mono font-black uppercase tracking-[0.2em] text-[#4F4FF1] hover:text-white transition-colors">Recover</a>
              </div>
              <div className="relative group">
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/[0.03] border border-white/5 focus:border-[#4F4FF1]/50 focus:bg-white/[0.05] text-white px-6 py-4 rounded-2xl outline-none transition-all font-medium text-lg"
                  placeholder="••••••••"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-black uppercase tracking-widest p-5 rounded-2xl flex items-center gap-4"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                {error}
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-[#4F4FF1] hover:bg-[#3F3FE1] text-white font-heading font-black text-xl py-6 rounded-2xl shadow-2xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-4 group uppercase tracking-widest"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Enter Dashboard <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-16 text-center text-[10px] text-white/10 font-mono font-black uppercase tracking-[0.5em]">
            Secured by FinLedger Intelligence Grid
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
