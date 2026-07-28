import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, User, ShieldCheck, AlertCircle, ArrowRight, KeyRound, CheckCircle2 } from 'lucide-react';
import { AuroraBackground } from '@/components/react-bits/AuroraBackground';
import { LogoWatermark } from '@/components/LogoWatermark';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useAuthStore } from '@/store/authStore';
import { requestForgotPassword, resetPasswordWithOtp } from '@/services/authService';
import api from '@/services/api';
import logoAsset from '@/assets/satkar-logo.jpeg';

export function Login() {
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password modal state
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState(1); // 1: Request OTP, 2: Reset Password
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

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

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setIsSubmittingForgot(true);

    try {
      const res = await requestForgotPassword(forgotEmail);
      setForgotSuccess(res.message || 'A 6-digit OTP code has been sent to your email.');
      setForgotStep(2);
    } catch (err) {
      setForgotError(err.response?.data?.error?.message || 'Failed to request OTP. Please try again.');
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleResetPasswordWithOtp = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');
    setIsSubmittingForgot(true);

    try {
      const res = await resetPasswordWithOtp({
        email: forgotEmail,
        otp: otpCode,
        newPassword,
      });
      setForgotSuccess(res.message || 'Password reset successfully!');
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setEmail(forgotEmail);
        setPassword('');
        setForgotStep(1);
        setForgotError('');
        setForgotSuccess('');
      }, 2000);
    } catch (err) {
      setForgotError(err.response?.data?.error?.message || 'Failed to reset password. Please check your OTP code.');
    } finally {
      setIsSubmittingForgot(false);
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {!isRegisterMode && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || 'admin@satkarmedical.com');
                        setIsForgotModalOpen(true);
                      }}
                      className="text-xs text-secondary hover:text-primary font-medium hover:underline transition-colors"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
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

        {/* FORGOT PASSWORD MODAL */}
        <Dialog
          isOpen={isForgotModalOpen}
          onClose={() => {
            setIsForgotModalOpen(false);
            setForgotStep(1);
            setForgotError('');
            setForgotSuccess('');
          }}
          title="🔑 Reset Admin Password"
        >
          <div className="p-4 space-y-4">
            {forgotError && (
              <div className="p-3 rounded-lg bg-red-50 border border-error/20 text-error text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccess && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                <span>{forgotSuccess}</span>
              </div>
            )}

            {forgotStep === 1 ? (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <p className="text-xs text-muted">
                  Enter your registered Admin Email address. We will send a 6-digit OTP verification code to reset your password.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="forgotEmail">Admin Email Address</Label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3 top-3 text-muted" />
                    <Input
                      id="forgotEmail"
                      type="email"
                      placeholder="admin@satkarmedical.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsForgotModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    isLoading={isSubmittingForgot}
                  >
                    Send OTP Code
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordWithOtp} className="space-y-4">
                <p className="text-xs text-muted">
                  Enter the 6-digit OTP code sent to <strong>{forgotEmail}</strong> and your new password.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="otpCode">6-Digit OTP Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="e.g. 482910"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    className="font-mono text-center text-base tracking-widest"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newPass">New Password</Label>
                  <Input
                    id="newPass"
                    type="password"
                    placeholder="At least 4 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-xs text-muted hover:text-primary underline"
                  >
                    Back to Email
                  </button>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    isLoading={isSubmittingForgot}
                  >
                    Reset Password
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Dialog>
      </div>
    </AuroraBackground>
  );
}
