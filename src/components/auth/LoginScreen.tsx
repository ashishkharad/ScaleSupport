import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  Monitor,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  Mail,
  RefreshCw,
  ArrowLeft,
  Clock,
  Check,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';

export const LoginScreen: React.FC = () => {
  const {
    loginWithCredentials,
    requestAdminOTP,
    verifyAdminOTP,
    resetAdminPasswordWithToken,
  } = useSRMS();

  // Login Form States
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'web' | 'android'>('web');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password / OTP Flow States
  // 'login' | 'request_otp' | 'enter_otp' | 'new_password' | 'reset_success'
  const [authView, setAuthView] = useState<
    'login' | 'request_otp' | 'enter_otp' | 'new_password' | 'reset_success'
  >('login');
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryRequestId, setRecoveryRequestId] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [maskedMobile, setMaskedMobile] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpTimer, setOtpTimer] = useState<number>(600); // 10 minutes in seconds
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccessMsg, setRecoverySuccessMsg] = useState<string | null>(null);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (authView === 'enter_otp' && otpTimer > 0) {
      timer = setInterval(() => {
        setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authView, otpTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle Standard User Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanId = identifier.trim();
    const cleanPwd = password.trim();

    if (!cleanId) {
      setErrorMessage('Please enter your User ID or registered Email.');
      return;
    }
    if (!cleanPwd) {
      setErrorMessage('Please enter your Password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginWithCredentials(cleanId, cleanPwd, selectedRole);
      if (!result.success) {
        setErrorMessage(result.error || 'Invalid User ID or Password.');
        setIsSubmitting(false);
      }
    } catch {
      setErrorMessage('An unexpected error occurred during authentication. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Step 1: Submit Admin ID/Email to Request OTP
  const handleRequestOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const clean = recoveryIdentifier.trim();

    if (!clean) {
      setRecoveryError('Please enter your Admin User ID or registered Email.');
      return;
    }

    setIsProcessingRecovery(true);
    try {
      const res = await requestAdminOTP(clean);
      if (res.success) {
        setRecoveryRequestId(res.requestId || '');
        setMaskedEmail(res.maskedEmail || 'ad***@srms-recovery.in');
        setMaskedMobile(res.maskedMobile || '+91 98*** **223');
        setOtpTimer(600); // 10 minutes
        setAuthView('enter_otp');
        setRecoverySuccessMsg(res.message);
      } else {
        setRecoveryError(res.error || res.message || 'Unable to request OTP. Please verify details.');
      }
    } catch {
      setRecoveryError('Server request failed. Please try again.');
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Step 2: Submit 6-digit OTP for Verification
  const handleVerifyOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    const cleanOtp = otpCode.trim();

    if (!cleanOtp || cleanOtp.length < 6) {
      setRecoveryError('Please enter the complete 6-digit OTP code.');
      return;
    }

    if (otpTimer <= 0) {
      setRecoveryError('This OTP has expired. Please click Resend OTP to request a new code.');
      return;
    }

    setIsProcessingRecovery(true);
    try {
      const res = await verifyAdminOTP(recoveryRequestId, cleanOtp);
      if (res.success && res.resetToken) {
        setResetToken(res.resetToken);
        setAuthView('new_password');
        setRecoverySuccessMsg('OTP verified successfully. Please enter your new password.');
      } else {
        setRecoveryError(res.error || 'Invalid OTP code. Please check and try again.');
      }
    } catch {
      setRecoveryError('Verification failed. Please try again.');
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Step 3: Set New Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);

    const cleanNew = newPassword.trim();
    const cleanConfirm = confirmPassword.trim();

    if (cleanNew.length < 6) {
      setRecoveryError('Password must be at least 6 characters in length.');
      return;
    }

    if (cleanNew !== cleanConfirm) {
      setRecoveryError('Passwords do not match. Please ensure both fields are identical.');
      return;
    }

    setIsProcessingRecovery(true);
    try {
      const res = await resetAdminPasswordWithToken(resetToken, cleanNew);
      if (res.success) {
        setAuthView('reset_success');
        setRecoverySuccessMsg(
          res.message ||
            'Password updated successfully! Previous credentials and sessions have been invalidated.'
        );
      } else {
        setRecoveryError(res.error || 'Failed to update password. Reset token may have expired.');
      }
    } catch {
      setRecoveryError('Password update failed. Please restart the recovery flow.');
    } finally {
      setIsProcessingRecovery(false);
    }
  };

  // Reset state to return to login
  const returnToLogin = () => {
    setAuthView('login');
    setRecoveryError(null);
    setRecoverySuccessMsg(null);
    setOtpCode('');
    setNewPassword('');
    setConfirmPassword('');
    setResetToken('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Tech Mesh */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-60" />

      {/* Ambient Lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative z-10 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand & Header */}
        <div className="text-center space-y-3">
          <div className="inline-block bg-white p-2.5 rounded-2xl shadow-md border border-white/20">
            <ScaleSupportLogo variant="compact" size="md" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {authView === 'login' && 'Sign In to ScaleSupport'}
              {authView === 'request_otp' && 'Admin Password Recovery'}
              {authView === 'enter_otp' && 'Verify One-Time Password'}
              {authView === 'new_password' && 'Create New Password'}
              {authView === 'reset_success' && 'Password Reset Complete'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {authView === 'login' &&
                'Debt Recovery Management & Account Allocation System'}
              {authView === 'request_otp' &&
                'Secure 2-Factor OTP verification for System Administrator'}
              {authView === 'enter_otp' &&
                `Enter the 6-digit OTP code sent to your registered contacts`}
              {authView === 'new_password' &&
                'Set your new secure password. Old password will be invalidated.'}
              {authView === 'reset_success' &&
                'Your credentials have been securely updated across the system.'}
            </p>
          </div>
        </div>

        {/* ----------------- VIEW 1: NORMAL SECURE LOGIN ----------------- */}
        {authView === 'login' && (
          <>
            {/* Preferred Workspace Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Select Workspace:
              </label>
              <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-1 rounded-2xl border border-slate-800">
                <button
                  id="btn-select-web-workspace"
                  type="button"
                  onClick={() => setSelectedRole('web')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedRole === 'web'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>Web Portal</span>
                </button>
                <button
                  id="btn-select-android-workspace"
                  type="button"
                  onClick={() => setSelectedRole('android')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    selectedRole === 'android'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android App</span>
                </button>
              </div>
            </div>

            {/* Error Feedback */}
            {errorMessage && (
              <div
                id="login-error-alert"
                className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  User ID / Email Address:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username-input"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your exact User ID or registered Email"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    required
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">Password:</label>
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => {
                      setRecoveryIdentifier(identifier);
                      setRecoveryError(null);
                      setAuthView('request_otp');
                    }}
                    className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline font-medium cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password-input"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                id="btn-submit-login"
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Authenticating Session...
                  </span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* ----------------- VIEW 2: REQUEST OTP (STEP 1) ----------------- */}
        {authView === 'request_otp' && (
          <div className="space-y-4 text-xs">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800 flex items-start gap-3">
              <KeyRound className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-slate-300 text-xs leading-relaxed">
                <p className="font-semibold text-white mb-0.5">Admin Security Verification</p>
                Password reset requires One-Time Password (OTP) verification sent to the Admin&apos;s registered email &amp; mobile.
              </div>
            </div>

            {recoveryError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleRequestOTPSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Admin User ID / Registered Email:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="input-recovery-identifier"
                    type="text"
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    placeholder="e.g. admin or admin@srms-recovery.in"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <button
                  id="btn-send-otp"
                  type="submit"
                  disabled={isProcessingRecovery}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRecovery ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating &amp; Sending OTP...
                    </span>
                  ) : (
                    <>
                      <span>Send Verification OTP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={returnToLogin}
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- VIEW 3: ENTER OTP (STEP 2) ----------------- */}
        {authView === 'enter_otp' && (
          <div className="space-y-4 text-xs">
            {recoverySuccessMsg && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoverySuccessMsg}</span>
              </div>
            )}

            {/* Destination Verification Badges */}
            <div className="bg-slate-950/80 p-3 rounded-2xl border border-slate-800 space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                OTP Dispatched To:
              </span>
              <div className="flex flex-col gap-1 text-slate-300 font-mono text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📧 Email:</span>
                  <span className="text-white font-semibold">{maskedEmail}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">📱 Mobile:</span>
                  <span className="text-white font-semibold">{maskedMobile}</span>
                </div>
              </div>
            </div>

            {recoveryError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOTPSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-semibold">
                    6-Digit Security OTP Code:
                  </label>
                  <span
                    className={`text-[11px] font-mono flex items-center gap-1 ${
                      otpTimer < 60 ? 'text-red-400 font-bold' : 'text-slate-400'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Expires in {formatTimer(otpTimer)}</span>
                  </span>
                </div>
                <input
                  id="input-otp-code"
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center font-mono text-lg tracking-widest font-bold"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-slate-500 text-center mt-1">
                  Single-use code. Maximum 3 verification attempts permitted.
                </p>
              </div>

              <div className="space-y-2">
                <button
                  id="btn-verify-otp"
                  type="submit"
                  disabled={isProcessingRecovery || otpCode.length < 6}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRecovery ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Verifying Code...
                    </span>
                  ) : (
                    <>
                      <span>Verify &amp; Proceed</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRequestOTPSubmit}
                    disabled={isProcessingRecovery}
                    className="flex-1 py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend OTP</span>
                  </button>
                  <button
                    type="button"
                    onClick={returnToLogin}
                    className="py-2.5 px-4 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- VIEW 4: CREATE NEW PASSWORD (STEP 3) ----------------- */}
        {authView === 'new_password' && (
          <div className="space-y-4 text-xs">
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>OTP Authenticated. Set your new Admin credentials.</span>
            </div>

            {recoveryError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{recoveryError}</span>
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  New Password (min 6 chars):
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Confirm New Password:
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Check className="w-4 h-4" />
                  </div>
                  <input
                    id="input-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] leading-relaxed">
                * Note: Updating your password immediately invalidates previous passwords and all active sessions across all devices.
              </div>

              <div className="space-y-2">
                <button
                  id="btn-save-new-password"
                  type="submit"
                  disabled={isProcessingRecovery || !newPassword || !confirmPassword}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/25 transition cursor-pointer disabled:opacity-50"
                >
                  {isProcessingRecovery ? (
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Updating Password &amp; Revoking Old Sessions...
                    </span>
                  ) : (
                    <>
                      <span>Save New Password</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={returnToLogin}
                  className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 font-medium rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ----------------- VIEW 5: RESET SUCCESS ----------------- */}
        {authView === 'reset_success' && (
          <div className="space-y-5 text-center text-xs">
            <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-white">Password Updated Successfully</h2>
              <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
                {recoverySuccessMsg ||
                  'Your password has been changed and all old credentials have been revoked.'}
              </p>
            </div>

            <button
              id="btn-proceed-to-login"
              type="button"
              onClick={returnToLogin}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition cursor-pointer"
            >
              <span>Return to Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Security Compliance Footer */}
        <div className="text-center pt-2">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-slate-400" />
            <span>256-bit Encrypted Banking Recovery &amp; Dual-Workspace Protocol</span>
          </p>
        </div>
      </div>
    </div>
  );
};
