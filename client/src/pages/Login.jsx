import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react';
import { AuroraBackground } from '@/components/react-bits/AuroraBackground';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/store/authStore';
import api from '@/services/api';
import logoAsset from '@/assets/satkar-logo.jpeg';

export function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isRegisterMode) {
        // Register initial admin
        const res = await api.post('/auth/register', { name, email, password });
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      } else {
        // Login existing admin
        const res = await api.post('/auth/login', { email, password });
        login(res.data.user, res.data.token);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('[Login Error]', err);
      const message =
        err.response?.data?.error?.message ||
        'Failed to connect to authentication server. Please ensure backend is running.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraBackground>
      {/* Prominent Hero Watermark in background */}
      <LogoWatermark opacity={0.18} scale={1.3} position="center" />

      <div className="w-full max-w-md px-4 py-8 relative z-20">
        <Card className="glass-panel border-white/60 shadow-lifted backdrop-blur-xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-surface p-2 shadow-md mb-3 border border-primary/10 flex items-center justify-center">
              <img src={logoAsset} alt="Satkar Medical Logo" className="w-full h-full object-contain" />
            </div>
            <CardTitle className="text-2xl font-bold text-primary font-heading tracking-tight">
              Satkar Medical
            </CardTitle>
            <CardDescription className="text-xs font-mono text-muted uppercase tracking-widest mt-1">
              {isRegisterMode ? 'Initial Admin Setup' : 'Pharmacy Management System'}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-4">
            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-error/20 text-error text-xs flex items-start gap-2 animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegisterMode && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-3 text-muted" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. Admin Manager"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@satkarmedical.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-muted" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full mt-2 group"
                isLoading={loading}
              >
                <span>{isRegisterMode ? 'Create Admin Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col items-center justify-center border-t border-primary/5 pt-4 text-xs text-muted">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setErrorMsg('');
              }}
              className="text-secondary hover:text-primary font-medium hover:underline transition-colors"
            >
              {isRegisterMode
                ? 'Already registered? Sign in here'
                : 'First time setup? Register Initial Admin'}
            </button>
            <div className="mt-3 flex items-center gap-1 text-[11px] text-muted/70 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              <span>Phase 1 • Secure JWT Admin Access</span>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AuroraBackground>
  );
}
