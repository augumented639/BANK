import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Share2, 
  Copy, 
  Check, 
  Sparkles, 
  X, 
  Zap, 
  MessageCircle, 
  Send, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Award,
  Users,
  Clock,
  RefreshCw,
  HelpCircle
} from 'lucide-react';
import { UserCredits } from '../types';
import confetti from 'canvas-confetti';

interface ShareEarnModalProps {
  isOpen: boolean;
  onClose: () => void;
  credits: UserCredits;
  onClaimShareReward: (creditsToAdd?: number) => void;
  isDarkMode: boolean;
  isExhausted?: boolean;
  referralCode: string;
}

export const ShareEarnModal: React.FC<ShareEarnModalProps> = ({
  isOpen,
  onClose,
  credits,
  onClaimShareReward,
  isDarkMode,
  isExhausted = false,
  referralCode,
}) => {
  const [copied, setCopied] = useState(false);
  const [justEarned, setJustEarned] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);
  const [verificationCountdown, setVerificationCountdown] = useState<number>(0);
  const [isCheckingReferrals, setIsCheckingReferrals] = useState<boolean>(false);
  const [verifiedReferralsFound, setVerifiedReferralsFound] = useState<number>(0);

  // Generate unique share URL with user's referral code
  const baseUrl = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : 'https://bank-statement-converter.app';
  const shareUrl = `${baseUrl}?ref=${encodeURIComponent(referralCode)}`;
  const shareText = `Convert any Bank Statement PDF, Image, or CSV into clean Excel & CSV spreadsheets with 100% privacy & automated reconciliation! Get +5 bonus converts with this link:`;
  const fullShareMessage = `${shareText} ${shareUrl}`;

  // Countdown timer for manual social share confirmation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verificationCountdown > 0) {
      timer = setTimeout(() => {
        setVerificationCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [verificationCountdown]);

  if (!isOpen) return null;

  // Check if any genuine referral clicks have arrived
  const checkLiveReferrals = async () => {
    setIsCheckingReferrals(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/referral/check-rewards/${encodeURIComponent(referralCode)}`);
      const data = await res.json();
      if (data.success && data.unclaimed > 0) {
        // Claim the verified referral rewards
        await fetch('/api/referral/claim-rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referralCode }),
        });

        const rewardAmount = data.rewardCredits || data.unclaimed * 10;
        onClaimShareReward(rewardAmount);
        setVerifiedReferralsFound(data.totalVerified);
        setJustEarned(`+${rewardAmount} Credits Added! ${data.unclaimed} friend(s) opened your link!`);
        confetti({ particleCount: 80, spread: 90, origin: { y: 0.6 } });
      } else if (data.success) {
        setVerifiedReferralsFound(data.totalVerified || 0);
        if (data.totalVerified === 0) {
          setErrorMessage('No friends have opened your link yet. Send your referral link to friends or colleagues!');
        } else {
          setJustEarned('All earned referral credits have already been added to your balance!');
        }
      }
    } catch (err) {
      console.warn('Referral check error:', err);
    } finally {
      setIsCheckingReferrals(false);
    }
  };

  // Copy link handler - DOES NOT award credits immediately
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(fullShareMessage);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = fullShareMessage;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setErrorMessage(null);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Native Web Share API - Only grants credits if user actually finishes the native share
  const handleNativeShare = async () => {
    setErrorMessage(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Bank Statement Converter',
          text: shareText,
          url: shareUrl,
        });
        
        // Native share succeeded (user didn't cancel)
        onClaimShareReward(10);
        setJustEarned('+10 Credits Added! Thank you for sharing the app.');
        confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setErrorMessage('Share was dismissed. Complete the share to earn +10 credits.');
        } else {
          // Fallback to copy link
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  // Open social platform
  const handlePlatformShare = (platform: 'whatsapp' | 'twitter' | 'linkedin' | 'telegram' | 'facebook') => {
    let url = '';
    const encodedText = encodeURIComponent(shareText);
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedFull = encodeURIComponent(fullShareMessage);

    switch (platform) {
      case 'whatsapp':
        url = `https://api.whatsapp.com/send?text=${encodedFull}`;
        break;
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}&hashtags=FinTech,Accounting,Excel`;
        break;
      case 'linkedin':
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case 'telegram':
        url = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer,width=650,height=550');
      setPendingPlatform(platform);
      setVerificationCountdown(5); // 5-second anti-spam verification delay
      setErrorMessage(null);
    }
  };

  // Confirm that user sent the message on external platform
  const handleConfirmSent = () => {
    if (verificationCountdown > 0) return;
    
    // Cooldown check
    const now = Date.now();
    const lastVerification = credits.lastShareVerificationDate ? new Date(credits.lastShareVerificationDate).getTime() : 0;
    const diffMinutes = (now - lastVerification) / (1000 * 60);

    if (diffMinutes < 1 && credits.sharesCount > 0) {
      setErrorMessage('Please wait a minute before verifying another share.');
      return;
    }

    onClaimShareReward(10);
    setJustEarned(`+10 Credits Added! Thank you for sharing on ${pendingPlatform || 'social media'}.`);
    setPendingPlatform(null);
    confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-lg rounded-2xl border p-6 sm:p-7 shadow-2xl transition-all relative overflow-hidden ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-200 dark:border-slate-800 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-emerald-500 text-white shadow-md shadow-emerald-500/20">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">
                  {isExhausted ? 'Unlock More Conversions' : 'Share & Earn Free Converts'}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                  +10 Free / Real Share
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Share your personal link. Earn +10 conversion credits when shared or when a colleague visits!
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Banner */}
        <div className="my-4 relative z-10 space-y-2">
          <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            credits.availableCredits === 0
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${
                credits.availableCredits === 0 ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'
              }`}>
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">
                  Your Balance
                </span>
                <span className="text-xl font-extrabold font-mono">
                  {credits.availableCredits} Convert{credits.availableCredits !== 1 ? 's' : ''} Remaining
                </span>
              </div>
            </div>

            <div className="text-right text-xs">
              <span className="block opacity-75 font-medium">Earned by Sharing</span>
              <span className="font-bold font-mono text-sm text-emerald-600 dark:text-emerald-400">
                +{credits.sharesCount * 10} credits
              </span>
            </div>
          </div>

          {/* Reward claimed animation feedback */}
          {justEarned && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-in fade-in">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>{justEarned}</span>
              </div>
              <button onClick={() => setJustEarned(null)} className="text-white/80 hover:text-white font-mono text-xs">
                &times;
              </button>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Pending Share Verification Panel */}
        {pendingPlatform && (
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20 my-3 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                <Clock className="w-4 h-4 animate-spin text-emerald-500" />
                <span>Share Verification in Progress...</span>
              </div>
              <span className="text-[11px] text-slate-400 capitalize">
                Platform: <strong>{pendingPlatform}</strong>
              </span>
            </div>
            
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              We opened <strong>{pendingPlatform}</strong> with your referral message. Once you have sent or posted the message to your contacts, click below to confirm.
            </p>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleConfirmSent}
                disabled={verificationCountdown > 0}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow-xs transition-all flex items-center justify-center gap-1.5"
              >
                {verificationCountdown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Verifying ({verificationCountdown}s)...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>I Have Sent the Message (+10 Credits)</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => setPendingPlatform(null)}
                className="py-2 px-3 rounded-xl text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Share Action Grid */}
        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Share on Social & Messaging Platforms:
            </label>
            <span className="text-[11px] text-slate-400">
              Only real shares earn credits
            </span>
          </div>

          {/* Platform Share Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            
            {/* WhatsApp */}
            <button
              onClick={() => handlePlatformShare('whatsapp')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-semibold text-xs transition-all group"
            >
              <MessageCircle className="w-4 h-4 text-emerald-500 group-hover:scale-110 transition-transform" />
              <span>WhatsApp</span>
            </button>

            {/* Telegram */}
            <button
              onClick={() => handlePlatformShare('telegram')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-sky-500/30 bg-sky-500/5 hover:bg-sky-500/15 text-sky-700 dark:text-sky-300 font-semibold text-xs transition-all group"
            >
              <Send className="w-4 h-4 text-sky-500 group-hover:scale-110 transition-transform" />
              <span>Telegram</span>
            </button>

            {/* X / Twitter */}
            <button
              onClick={() => handlePlatformShare('twitter')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-slate-400/30 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 font-semibold text-xs transition-all group"
            >
              <svg className="w-3.5 h-3.5 fill-current text-slate-700 dark:text-slate-200 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              <span>X (Twitter)</span>
            </button>

            {/* LinkedIn */}
            <button
              onClick={() => handlePlatformShare('linkedin')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-xs transition-all group"
            >
              <Users className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
              <span>LinkedIn</span>
            </button>

            {/* Facebook */}
            <button
              onClick={() => handlePlatformShare('facebook')}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold text-xs transition-all group"
            >
              <ExternalLink className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
              <span>Facebook</span>
            </button>

            {/* Native OS Share (Resolves only on real completed share) */}
            <button
              onClick={handleNativeShare}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/15 text-amber-700 dark:text-amber-300 font-semibold text-xs transition-all group"
            >
              <Share2 className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
              <span>Device Share</span>
            </button>

          </div>

          {/* Unique Referral Link Box */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                Your Personal Referral Link:
              </label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                Friends get +5 bonus, you get +10!
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full px-3 py-2 rounded-xl text-xs font-mono border bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 select-all"
              />
              <button
                onClick={handleCopyLink}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all shadow-xs ${
                  copied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:opacity-90'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>

            {copied && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium animate-in fade-in">
                &check; Link copied! Send it to friends or colleagues. When they open it, you will automatically receive +10 credits.
              </p>
            )}
          </div>

          {/* Live Referral Check Button */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-500 shrink-0" />
              <div>
                <div className="font-semibold text-slate-800 dark:text-slate-200">
                  Referral Activity
                </div>
                <div className="text-[11px] text-slate-400">
                  {verifiedReferralsFound > 0 ? `${verifiedReferralsFound} verified friend(s) joined` : 'Track visits from your link'}
                </div>
              </div>
            </div>

            <button
              onClick={checkLiveReferrals}
              disabled={isCheckingReferrals}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-100 font-semibold text-xs transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingReferrals ? 'animate-spin' : ''}`} />
              <span>{isCheckingReferrals ? 'Checking...' : 'Check Rewards'}</span>
            </button>
          </div>

          {/* Fair Usage Rules */}
          <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              <span>How Actual Share Credits Work:</span>
            </div>
            <p>&bull; <strong>Device Share</strong>: Successfully completing a share sheet gives +10 credits.</p>
            <p>&bull; <strong>Social Apps</strong>: Open WhatsApp/Telegram/Twitter, send to contacts, and confirm to claim credits.</p>
            <p>&bull; <strong>Referral Links</strong>: When anyone opens your personal link, you instantly get +10 credits and they get +5 bonus.</p>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200 dark:border-slate-800 relative z-10">
          <span className="text-[11px] text-slate-400">
            {credits.sharesCount} verified share{credits.sharesCount !== 1 ? 's' : ''} completed
          </span>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
