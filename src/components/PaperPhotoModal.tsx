import React, { useEffect, useRef, useState } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Zap,
  SwitchCamera,
  Image as ImageIcon,
} from 'lucide-react';
import { recognizeTopOrderNumberLocally } from '../utils/localDigitOcr';

interface PaperPhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRecognized: (data: { orderNumber: string }) => void;
}

export const PaperPhotoModal: React.FC<PaperPhotoModalProps> = ({
  isOpen,
  onClose,
  onRecognized,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize camera stream immediately
  const startCamera = async (mode: 'environment' | 'user' = facingMode) => {
    setErrorMsg(null);
    setIsCameraActive(false);

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('المتصفح لا يدعم الوصول المباشر للكاميرا.');
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.warn('Camera stream initial error:', err);
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        setStream(fallbackStream);
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play();
        }
        setIsCameraActive(true);
      } catch (fallbackErr: any) {
        console.error('Complete camera failure:', fallbackErr);
        setErrorMsg('تعذر فتح الكاميرا. يمكنك استخدام البحث اليدوي برقم الطلب.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setIsProcessing(false);
      startCamera(facingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      setIsCameraActive(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen]);

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const handleToggleFacingMode = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const handleRetake = () => {
    setErrorMsg(null);
    setIsProcessing(false);
    if (!isCameraActive) {
      startCamera(facingMode);
    }
  };

  /**
   * Crops ONLY the TOP section of the paper viewfinder (where the order number is printed)
   * and recognizes the 1-4 digit number locally on device in milliseconds.
   */
  const processCroppedTopNumber = async (sourceCanvas: HTMLCanvasElement) => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      // 1. First attempt: Fast Local On-Device Digit OCR (0 network latency)
      const localDigits = await recognizeTopOrderNumberLocally(sourceCanvas);
      if (localDigits) {
        // Confidently detected -> Immediate Firebase Search
        stopCamera();
        onRecognized({ orderNumber: localDigits });
        onClose();
        return;
      }

      // 2. Fast Fallback: send ONLY the small cropped top image to lightweight endpoint
      const croppedBase64 = sourceCanvas.toDataURL('image/jpeg', 0.85);
      const res = await fetch('/api/ocr-fast-digits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: croppedBase64 }),
      });

      if (res.ok) {
        const data = await res.json();
        const serverDigits = (data.orderNumber || '').replace(/[^0-9]/g, '');
        if (serverDigits && serverDigits.length >= 1 && serverDigits.length <= 4) {
          stopCamera();
          onRecognized({ orderNumber: serverDigits });
          onClose();
          return;
        }
      }

      // If not confidently detected, show exact requested message
      setErrorMsg('لم نتمكن من قراءة رقم الطلب — حاول مرة أخرى');
    } catch (err: any) {
      console.error('Fast digit capture error:', err);
      setErrorMsg('لم نتمكن من قراءة رقم الطلب — حاول مرة أخرى');
    } finally {
      setIsProcessing(false);
    }
  };

  // Capture and crop ONLY the top number region from current video frame
  const handleCaptureAndScan = () => {
    if (!videoRef.current || isProcessing) return;

    try {
      const video = videoRef.current;
      const vWidth = video.videoWidth || 640;
      const vHeight = video.videoHeight || 480;

      // Crop ONLY the TOP portion of the frame corresponding to the guide box:
      // Centered horizontally (60% width), Top vertically (top 20% to 50% height)
      const cropX = Math.round(vWidth * 0.15);
      const cropY = Math.round(vHeight * 0.15);
      const cropWidth = Math.round(vWidth * 0.70);
      const cropHeight = Math.round(vHeight * 0.35);

      const cropCanvas = document.createElement('canvas');
      cropCanvas.width = cropWidth;
      cropCanvas.height = cropHeight;
      const ctx = cropCanvas.getContext('2d');

      if (!ctx) return;

      ctx.drawImage(
        video,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      processCroppedTopNumber(cropCanvas);
    } catch (err) {
      console.error('Snapshot crop error:', err);
      setErrorMsg('لم نتمكن من قراءة رقم الطلب — حاول مرة أخرى');
    }
  };

  // Handle uploaded image fallback
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const originalDataUrl = event.target?.result as string;
      if (!originalDataUrl) return;

      const img = new Image();
      img.onload = () => {
        // Crop top 40% of the image where order number is printed
        const cropWidth = Math.round(img.width * 0.8);
        const cropHeight = Math.round(img.height * 0.45);
        const cropX = Math.round(img.width * 0.1);
        const cropY = Math.round(img.height * 0.05);

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropWidth;
        cropCanvas.height = cropHeight;
        const ctx = cropCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
          processCroppedTopNumber(cropCanvas);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-sm flex flex-col items-center justify-between p-3 sm:p-4 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="w-full max-w-md flex items-center justify-between pt-1">
        <button
          id="paper-camera-back-btn"
          type="button"
          onClick={handleClose}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs border border-slate-700 transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="text-center text-white">
          <div className="flex items-center justify-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <h3 className="text-sm font-black tracking-wide">مسح سريع لرقم الطلب</h3>
          </div>
          <span className="text-[10px] text-emerald-400 font-bold">
            معالجة فورية محلية • قراءة الرقم بالأعلى
          </span>
        </div>

        <button
          id="paper-camera-close-x-btn"
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Viewfinder Stage with High-Precision Fixed Guide Frame */}
      <div className="w-full max-w-sm my-auto flex flex-col items-center justify-center">
        <div
          ref={containerRef}
          className="relative w-full aspect-[3/4] max-h-[58vh] bg-slate-900 rounded-3xl overflow-hidden border-2 border-emerald-500/80 shadow-2xl flex items-center justify-center"
        >
          {/* Live Video Feed */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="w-full h-full object-cover"
          />

          {/* Processing Overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center text-amber-400 gap-3 z-30 p-4 text-center animate-in fade-in duration-100">
              <RefreshCw className="w-10 h-10 animate-spin text-amber-400" />
              <div className="space-y-1">
                <span className="text-base font-black text-white block">
                  جاري فحص وقراءة رقم الطلب...
                </span>
                <span className="text-xs text-amber-300/90 font-mono">
                  البحث التلقائي الفوري فور التعرف
                </span>
              </div>
            </div>
          )}

          {/* Error Message with Instant Retake Option */}
          {errorMsg && !isProcessing && (
            <div className="absolute inset-0 bg-slate-950/92 p-5 flex flex-col items-center justify-center text-center text-rose-300 gap-3.5 z-30 animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white leading-relaxed">{errorMsg}</p>
                <p className="text-xs text-slate-400">
                  ضع الرقم العريض داخل المربع العلوي وأعد الضغط
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-1">
                <button
                  id="instant-retake-btn"
                  type="button"
                  onClick={handleRetake}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 font-black text-sm shadow-md flex items-center justify-center gap-2 transition"
                >
                  <RotateCcw className="w-4 h-4 stroke-[3]" />
                  <span>إعادة المحاولة فوراً</span>
                </button>
              </div>
            </div>
          )}

          {/* FIXED GUIDE FRAME SPECIFICALLY POSITIONING THE TOP ORDER NUMBER */}
          {isCameraActive && !isProcessing && !errorMsg && (
            <div className="pointer-events-none absolute inset-4 flex flex-col justify-between p-2">
              {/* Outer Card Contour */}
              <div className="w-full h-full border-2 border-dashed border-emerald-400/60 rounded-2xl flex flex-col p-3 relative">
                {/* 🎯 TARGET CROP ZONE: TOP ORDER NUMBER */}
                <div className="w-full h-[40%] border-2 border-amber-400 bg-amber-400/10 rounded-xl flex flex-col items-center justify-center p-2 shadow-inner relative">
                  <div className="absolute -top-3 bg-amber-500 text-slate-950 text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                    ضع رقم الطلب هنا (0258)
                  </div>
                  <div className="text-amber-300 font-mono text-3xl font-black opacity-30 select-none">
                    0000
                  </div>
                </div>

                {/* Divider Line */}
                <div className="w-full border-b border-emerald-500/30 my-2"></div>

                {/* Bottom zone (Last name position) */}
                <div className="w-full flex-1 border border-slate-700/60 rounded-xl flex items-center justify-center opacity-40">
                  <span className="text-[11px] text-slate-400 font-bold">
                    مكان اللقب (أسفل)
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Switch Camera Button */}
          {isCameraActive && !isProcessing && (
            <button
              type="button"
              onClick={handleToggleFacingMode}
              className="absolute top-3 left-3 p-2.5 rounded-full bg-slate-900/80 text-white backdrop-blur-xs hover:bg-slate-800 border border-slate-700 z-10"
              title="تبديل الكاميرا"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        <p className="text-[11px] text-slate-300 text-center font-bold mt-2.5">
          ضع رقم الطلب داخل الإطار الأصفر ثم اضغط زر المسح أدناه
        </p>
      </div>

      {/* Bottom Controls Area */}
      <div className="w-full max-w-sm pb-2 space-y-2">
        {/* Main Instant Capture & Scan Button */}
        <button
          id="fast-scan-number-btn"
          type="button"
          onClick={handleCaptureAndScan}
          disabled={isProcessing || !isCameraActive}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 active:scale-98 text-slate-950 font-black text-base shadow-xl flex items-center justify-center gap-2.5 transition disabled:opacity-50"
        >
          <Camera className="w-5 h-5 stroke-[2.5]" />
          <span>مسح وقراءة رقم الطلب فوراً</span>
        </button>

        {/* Fallback buttons: manual search or choose gallery */}
        <div className="grid grid-cols-2 gap-2">
          <button
            id="upload-paper-fallback-btn"
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700"
          >
            <ImageIcon className="w-4 h-4 text-cyan-400" />
            <span>صورة من الهاتف</span>
          </button>

          <button
            id="manual-search-fallback-btn"
            type="button"
            onClick={handleClose}
            className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
          >
            البحث اليدوي بالرقم
          </button>
        </div>
      </div>
    </div>
  );
};
