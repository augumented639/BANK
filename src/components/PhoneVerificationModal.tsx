import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  RefreshCw, 
  Sparkles, 
  MessageSquare,
  Lock,
  Smartphone
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  sendPhoneVerificationOtp, 
  verifyPhoneOtp, 
  getTwilioConfigStatus,
  TwilioConfigStatus 
} from '../lib/twilio';

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDarkMode: boolean;
  currentPhoneNumber?: string;
  isAlreadyVerified?: boolean;
  onVerificationSuccess: (phoneNumber: string, bonusGranted: boolean) => void;
}

const COUNTRY_CODES = [
  { code: '+1', country: 'US / CA', flag: '🇺🇸' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+61', country: 'Australia', flag: '🇦🇺' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+65', country: 'Singapore', flag: '🇸🇬' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷' },
];

export const PhoneVerificationModal: React.FC<PhoneVerificationModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  currentPhoneNumber = '',
  isAlreadyVerified = false,
  onVerificationSuccess,
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState('+1');
  const [nationalPhone, setNationalPhone] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'phone' | 'otp' | 'success'>(isAlreadyVerified ? 'success' : 'phone');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [twilioStatus, setTwilioStatus] = useState<TwilioConfigStatus | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Fetch Twilio status on open
  useEffect(() => {
    if (isOpen) {
      getTwilioConfigStatus().then(setTwilioStatus);
      if (currentPhoneNumber) {
        // Parse country code if possible
        const matched = COUNTRY_CODES.find(c => currentPhoneNumber.startsWith(c.code));
        if (matched) {
          setSelectedCountryCode(matched.code);
          setNationalPhone(currentPhoneNumber.replace(matched.code, '').trim());
        } else {
          setNationalPhone(currentPhoneNumber);
        }
      }
      if (isAlreadyVerified) {
        setStep('success');
      } else {
        setStep('phone');
      }
      setErrorMessage(null);
      setSuccessNotice(null);
      setDemoCodeHint(null);
    }
  }, [isOpen, currentPhoneNumber, isAlreadyVerified]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  const fullPhoneNumber = `${selectedCountryCode}${nationalPhone.replace(/\D/g, '')}`;

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const digitsOnly = nationalPhone.replace(/\D/g, '');
    if (digitsOnly.length < 6) {
      setErrorMessage('Please enter a valid phone number.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    setDemoCodeHint(null);

    const result = await sendPhoneVerificationOtp(fullPhoneNumber);
    setIsLoading(false);

    if (!result.success) {
      setErrorMessage(result.error || 'Failed to send SMS code.');
      return;
    }

    setStep('otp');
    setResendCooldown(30);
    setSuccessNotice(result.message || `Verification code sent to ${fullPhoneNumber}`);
    
    if (result.simulated && result.demoCode) {
      setDemoCodeHint(result.demoCode);
      // Auto-fill in test mode for instant friction-free developer verification
      const digits = result.demoCode.split('').slice(0, 6);
      setOtpCode([...digits, ...Array(6 - digits.length).fill('')]);
    } else {
      setOtpCode(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  };

  const handleOtpChange = (index: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = char;
    setOtpCode(newOtp);

    // Auto advance
    if (char && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // If all filled, auto-submit
    if (char && index === 5 && newOtp.every(d => d !== '')) {
      const codeString = newOtp.join('');
      handleVerifyCode(codeString);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const digits = pasteData.split('');
    const newOtp = [...digits, ...Array(6 - digits.length).fill('')].slice(0, 6);
    setOtpCode(newOtp);
    if (digits.length === 6) {
      handleVerifyCode(pasteData);
    } else {
      otpInputsRef.current[Math.min(5, digits.length)]?.focus();
    }
  };

  const handleVerifyCode = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode.join('');
    if (code.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    const result = await verifyPhoneOtp(fullPhoneNumber, code);
    setIsLoading(false);

    if (!result.success || !result.verified) {
      setErrorMessage(result.error || 'Verification failed. Please check the code and try again.');
      return;
    }

    setStep('success');
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });

    onVerificationSuccess(fullPhoneNumber, true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-md rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all relative overflow-hidden ${
        isDarkMode 
          ? 'bg-slate-900 border-slate-800 text-slate-100' 
          : 'bg-white border-slate-200 text-slate-900'
      }`}>
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">Twilio Phone Verification</h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                +15 Free Credits
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verify your mobile number via high-speed Twilio SMS
            </p>
          </div>
        </div>

        {/* Twilio Service Status Badge */}
        <div className={`mb-5 p-2.5 rounded-xl border text-xs flex items-center justify-between ${
          twilioStatus?.configured 
            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
            : 'bg-blue-500/5 border-blue-500/20 text-blue-700 dark:text-blue-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${twilioStatus?.configured ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'}`} />
            <span className="font-medium">
              {twilioStatus?.configured ? 'Twilio Carrier SMS Engine Active' : 'Twilio SMS Verification Active'}
            </span>
          </div>
          <span className="text-[10px] opacity-80 uppercase tracking-wider font-mono">
            {twilioStatus?.hasVerifyService ? 'Verify V2' : 'Programmable SMS'}
          </span>
        </div>

        {/* Notifications */}
        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successNotice && step === 'otp' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span>{successNotice}</span>
              {demoCodeHint && (
                <div className="mt-1 font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
                  Sandbox Test Code: {demoCodeHint}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 1: Phone Input */}
        {step === 'phone' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 text-slate-700 dark:text-slate-300">
                Mobile Phone Number
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className={`w-32 px-2.5 py-2.5 rounded-xl text-xs border font-medium outline-hidden transition-all ${
                    isDarkMode 
                      ? 'bg-slate-800/80 border-slate-700 text-slate-200 focus:border-emerald-500' 
                      : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-emerald-500'
                  }`}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.code}
                    </option>
                  ))}
                </select>

                <div className="relative flex-1">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="(555) 000-1234"
                    value={nationalPhone}
                    onChange={(e) => setNationalPhone(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm border font-medium outline-hidden transition-all ${
                      isDarkMode 
                        ? 'bg-slate-800/80 border-slate-700 text-slate-100 focus:border-emerald-500' 
                        : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500'
                    }`}
                    autoFocus
                  />
                </div>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-500" />
                We protect your privacy. Numbers are never sold or shared.
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !nationalPhone}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md hover:shadow-emerald-500/20 cursor-pointer disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sending Twilio SMS...</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Verification Code</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* Step 2: 6-Digit OTP Verification */}
        {step === 'otp' && (
          <div className="space-y-5">
            <div className="text-center">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Enter the 6-digit code sent to <strong className="text-slate-900 dark:text-slate-100">{fullPhoneNumber}</strong>
              </p>
            </div>

            {/* OTP Input Boxes */}
            <div className="flex justify-center gap-2 sm:gap-2.5">
              {otpCode.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => (otpInputsRef.current[idx] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={idx === 0 ? handlePaste : undefined}
                  className={`w-11 h-13 text-center text-xl font-bold rounded-xl border outline-hidden transition-all ${
                    isDarkMode 
                      ? 'bg-slate-800 border-slate-700 text-white focus:border-emerald-500 focus:bg-slate-750' 
                      : 'bg-slate-50 border-slate-300 text-slate-900 focus:border-emerald-500 focus:bg-white'
                  } ${digit ? 'border-emerald-500 ring-2 ring-emerald-500/20' : ''}`}
                />
              ))}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => handleVerifyCode()}
                disabled={isLoading || otpCode.some(d => !d)}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-sm transition-all shadow-md cursor-pointer disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Confirm & Claim +15 Credits</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="hover:underline hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                >
                  Change phone number
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || isLoading}
                  onClick={() => handleSendOtp()}
                  className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium disabled:opacity-50 disabled:no-underline cursor-pointer"
                >
                  {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend SMS code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Verified Success Screen */}
        {step === 'success' && (
          <div className="py-4 text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                Phone Number Verified!
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {fullPhoneNumber || currentPhoneNumber} has been securely verified via Twilio.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-center gap-2 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>+15 Free Conversion Credits added to your account!</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-semibold text-xs transition-colors cursor-pointer"
            >
              Done & Return to Converter
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
