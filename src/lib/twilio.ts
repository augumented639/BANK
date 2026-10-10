// Twilio Phone Number Verification Client Service

export interface TwilioConfigStatus {
  configured: boolean;
  hasVerifyService: boolean;
  hasPhoneNumber: boolean;
  mode: 'live' | 'test_ready';
}

export interface SendOtpResponse {
  success: boolean;
  status?: string;
  phoneNumber?: string;
  message?: string;
  expiresIn?: number;
  simulated?: boolean;
  demoCode?: string;
  hint?: string;
  error?: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified?: boolean;
  phoneNumber?: string;
  verifiedAt?: string;
  message?: string;
  error?: string;
}

/**
 * Checks whether Twilio credentials are live or in test sandbox mode
 */
export async function getTwilioConfigStatus(): Promise<TwilioConfigStatus> {
  try {
    const res = await fetch('/api/twilio/config');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Could not fetch Twilio config:', err);
    return { configured: false, hasVerifyService: false, hasPhoneNumber: false, mode: 'test_ready' };
  }
}

/**
 * Sends a 6-digit verification code to the given phone number via Twilio SMS or Twilio Verify Service
 */
export async function sendPhoneVerificationOtp(phoneNumber: string): Promise<SendOtpResponse> {
  try {
    const res = await fetch('/api/twilio/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || 'Failed to send SMS verification code.',
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network error while contacting Twilio verification service.',
    };
  }
}

/**
 * Verifies the 6-digit code entered by the user
 */
export async function verifyPhoneOtp(phoneNumber: string, code: string): Promise<VerifyOtpResponse> {
  try {
    const res = await fetch('/api/twilio/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber, code }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return {
        success: false,
        verified: false,
        error: data.error || 'Invalid verification code.',
      };
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      verified: false,
      error: err.message || 'Network error while verifying OTP code.',
    };
  }
}
