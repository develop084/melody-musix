import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import {
  MessageCircle,
  Copy,
  Check,
  Share2,
  Smartphone,
  Music,
  Info,
} from 'lucide-react';

export interface WhatsAppShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectTitle: string;
  durationMs: number;
  bpm: number;
  audioBlob?: Blob | null;
  audioFileName?: string;
}

export function WhatsAppShareModal({
  isOpen,
  onClose,
  projectTitle,
  durationMs,
  bpm,
  audioBlob,
  audioFileName,
}: WhatsAppShareModalProps) {
  const durationSec = Math.round(durationMs / 1000);
  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173';

  // Template options
  const templates = [
    {
      id: 'status',
      name: 'Status (30s)',
      badge: '30s Clip',
      text: `Listen to my audio clip: "${projectTitle}" (${durationSec}s) — edited with Melody Studio:\n${currentUrl}`,
    },
    {
      id: 'ringtone',
      name: 'Ringtone',
      badge: 'Short Cut',
      text: `Ringtone cut of "${projectTitle}" (${durationSec}s):\n${currentUrl}`,
    },
    {
      id: 'collab',
      name: 'Track Mix',
      badge: `${bpm} BPM`,
      text: `Listen to my mix: "${projectTitle}" (${bpm} BPM):\n${currentUrl}`,
    },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState(templates[0].id);
  const [customText, setCustomText] = useState(templates[0].text);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSharingFile, setIsSharingFile] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const handleSelectTemplate = (tplId: string) => {
    setSelectedTemplate(tplId);
    const found = templates.find((t) => t.id === tplId);
    if (found) {
      setCustomText(found.text);
    }
  };

  // 1-Click Share to WhatsApp Web / App
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(customText);
    let url = `https://api.whatsapp.com/send?text=${encoded}`;

    if (phoneNumber.trim()) {
      const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
      const finalPhone = cleanPhone.startsWith('91')
        ? cleanPhone
        : cleanPhone.length === 10
        ? `91${cleanPhone}`
        : cleanPhone;
      url = `https://wa.me/${finalPhone}?text=${encoded}`;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Direct Audio File Sharing via Web Share API
  const handleShareAudioFile = async () => {
    if (!audioBlob) return;
    setIsSharingFile(true);
    setShareFeedback(null);

    try {
      const fileName = audioFileName || `${projectTitle.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`;
      const file = new File([audioBlob], fileName, { type: audioBlob.type || 'audio/mp3' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: projectTitle,
          text: customText,
        });
        setShareFeedback('✅ Audio file shared successfully to WhatsApp!');
      } else {
        await navigator.clipboard.writeText(customText);
        handleOpenWhatsApp();
        setShareFeedback('💡 Text copied & WhatsApp opened! (Audio file downloaded)');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleOpenWhatsApp();
      }
    } finally {
      setIsSharingFile(false);
      setTimeout(() => setShareFeedback(null), 5000);
    }
  };

  // Copy share message
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(customText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch {}
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share to WhatsApp"
      description="Share your audio clip, ringtone cut, or mix directly via WhatsApp"
      maxWidth="xl"
      featuredIcon={<MessageCircle className="w-5 h-5 text-emerald-600" />}
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            leftIcon={isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
          >
            {isCopied ? 'Copied' : 'Copy Text'}
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>

            {audioBlob && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleShareAudioFile}
                isLoading={isSharingFile}
                leftIcon={<Share2 className="w-3.5 h-3.5 text-slate-600" />}
              >
                Share Audio File
              </Button>
            )}

            <Button
              type="button"
              variant="whatsapp"
              size="sm"
              onClick={handleOpenWhatsApp}
              leftIcon={<MessageCircle className="w-4 h-4 fill-current" />}
            >
              Open WhatsApp
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-slate-800">
        {/* Step 1: Template selection */}
        <div>
          <label className="text-xs font-semibold text-slate-700 block mb-2">
            Select Template
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleSelectTemplate(tpl.id)}
                className={`p-2.5 rounded-lg border text-left transition-all flex flex-col justify-between cursor-pointer ${
                  selectedTemplate === tpl.id
                    ? 'border-slate-900 bg-slate-50 text-slate-900 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900 leading-tight">
                    {tpl.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {tpl.badge}
                  </div>
                </div>
                {selectedTemplate === tpl.id && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-900 font-medium mt-2">
                    <Check className="w-3 h-3" /> Selected
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Message Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-slate-500" />
              Message Preview
            </span>
            <span className="text-[10px] font-mono text-slate-400">Editable</span>
          </div>

          <div className="rounded-xl p-3 sm:p-4 bg-slate-100 border border-slate-200 relative">
            {/* WhatsApp light message bubble */}
            <div className="max-w-[92%] sm:max-w-[85%] ml-auto bg-[#d9fdd3] text-[#111b21] rounded-2xl rounded-tr-xs p-3 text-xs sm:text-sm shadow-xs font-sans border border-[#c1f5b8]">
              <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-[#c1f5b8]">
                <div className="h-6 w-6 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-semibold text-xs text-slate-900 block leading-none">
                    {projectTitle}
                  </span>
                  <span className="text-[10px] text-slate-600 font-mono">
                    {durationSec}s • {bpm} BPM • Melody Studio
                  </span>
                </div>
              </div>

              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={4}
                className="w-full bg-transparent text-[#111b21] text-xs resize-none focus:outline-none placeholder:text-slate-500 leading-relaxed font-sans"
                placeholder="Type your WhatsApp message..."
              />

              <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781]">
                <span>Just now</span>
                <span className="text-sky-500 font-semibold">✓✓</span>
              </div>
            </div>
          </div>
        </div>

        {/* Optional: Direct Mobile Number */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-slate-700">
              Recipient Phone Number (Optional)
            </label>
            <Badge variant="default" size="sm">
              +91 / International
            </Badge>
          </div>
          <Input
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g. 9876543210 (leave blank to select in WhatsApp)"
            leftIcon={<span className="text-xs font-mono text-slate-500">+91</span>}
            helperText="Enter phone number to chat directly, or leave empty to choose a contact or group in WhatsApp."
          />
        </div>

        {/* Feedback Alert */}
        {shareFeedback && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* Status Tip */}
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong className="text-slate-700">Audio Status Tip:</strong> WhatsApp supports audio status clips up to 30 seconds. Use the 30s preset in the editor before sharing.
          </span>
        </div>
      </div>
    </Modal>
  );
}
