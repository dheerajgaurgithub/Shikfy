import React, { useMemo, useRef, useState } from 'react';
import { X, Upload, Sparkles, Image as ImageIcon, Type, Palette, RotateCw, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import apiClient from '../api/client';

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

const CreateStoryModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const [file, setFile] = useState<File|null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [step, setStep] = useState<'pick'|'edit'>('pick');
  const [template, setTemplate] = useState<'none'|'gradient'|'vignette'>('none');
  const [music, setMusic] = useState<string>('');
  const [text, setText] = useState<string>('');
  const [textColor, setTextColor] = useState<string>('#ffffff');
  const [textX, setTextX] = useState<number>(50);
  const [textY, setTextY] = useState<number>(85);
  const [fontSize, setFontSize] = useState<number>(64);
  const [fontFamily, setFontFamily] = useState<string>('system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  const [isBold, setIsBold] = useState<boolean>(true);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [align, setAlign] = useState<'left'|'center'|'right'>('center');
  const [withStroke, setWithStroke] = useState<boolean>(true);
  const [rotate, setRotate] = useState<number>(0);
  const [dragging, setDragging] = useState<boolean>(false);
  const [rotating, setRotating] = useState<boolean>(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const previewUrl = useMemo(()=> file ? URL.createObjectURL(file) : '', [file]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!frameRef.current || (!dragging && !rotating)) return;
      const rect = frameRef.current.getBoundingClientRect();
      const pt = 'touches' in ev ? ev.touches[0] : (ev as MouseEvent);
      const cx = Math.min(Math.max(pt.clientX - rect.left, 0), rect.width);
      const cy = Math.min(Math.max(pt.clientY - rect.top, 0), rect.height);
      if (dragging) {
        setTextX(Math.round((cx / rect.width) * 100));
        setTextY(Math.round((cy / rect.height) * 100));
      } else if (rotating) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = cx - centerX;
        const dy = cy - centerY;
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
        setRotate(Math.max(-45, Math.min(45, Math.round(angle))));
      }
    };
    const onUp = () => { setDragging(false); setRotating(false); };
    window.addEventListener('mousemove', onMove as any);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove as any, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove as any);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove as any);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, rotating]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setStep('edit');
  };

  const drawImageToCanvas = async () => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const url = previewUrl;
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = url;
    });
    const W = 1080, H = 1920;
    const canvas = canvasRef.current!;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d')!;
    const ratio = Math.max(W / img.width, H / img.height);
    const iw = img.width * ratio, ih = img.height * ratio;
    const ix = (W - iw) / 2, iy = (H - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
    if (template === 'gradient') {
      const grd = ctx.createLinearGradient(0, 0, W, H);
      grd.addColorStop(0, 'rgba(255,0,150,0.25)');
      grd.addColorStop(1, 'rgba(0,150,255,0.25)');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,W,H);
    } else if (template === 'vignette') {
      const grd = ctx.createRadialGradient(W/2,H/2, W*0.2, W/2,H/2, W*0.8);
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(1, 'rgba(0,0,0,0.35)');
      ctx.fillStyle = grd;
      ctx.fillRect(0,0,W,H);
    }
    if (text.trim()) {
      const fontSpec = `${isBold ? 'bold ' : ''}${isItalic ? 'italic ' : ''}${Math.max(24,fontSize)}px ${fontFamily}`;
      ctx.font = fontSpec;
      ctx.fillStyle = textColor;
      ctx.textAlign = align;
      const x = (textX/100)*W;
      const y = (textY/100)*H;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((rotate * Math.PI) / 180);
      if (withStroke) {
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.strokeText(text, 0, 0);
      }
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
    return new Promise<File>((resolve)=> {
      canvas.toBlob((blob)=>{
        resolve(new File([blob!], 'story.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    });
  };

  const submit = async () => {
    if (!file) { setError('Select an image or video'); return; }
    setError('');
    try {
      setUploading(true);
      let uploadFile = file;
      const isVideo = file.type.startsWith('video');
      if (!isVideo) {
        uploadFile = await drawImageToCanvas();
      }
      const fd = new FormData();
      fd.append('file', uploadFile);
      const up = await apiClient.post('/uploads/single', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const url = up.data?.url;
      if (!url) throw new Error('Upload failed');
      const type: 'image' | 'video' = isVideo ? 'video' : 'image';
      await apiClient.post('/stories', { media: { type, url } });
      onCreated();
      onClose();
    } catch (e:any) {
      setError(e?.response?.data?.error || 'Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-300">
      <div className="w-full max-w-5xl rounded-3xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl shadow-2xl overflow-hidden border border-gray-200/50 dark:border-gray-700/50 max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-8 bg-gradient-to-b from-pink-500 via-purple-500 to-blue-500 rounded-full"></div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Create Story</h2>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">Share your moment</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 sm:p-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-300 group"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400 group-hover:rotate-90 transition-transform" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
          
          {/* Preview Area */}
          <div className="flex-1 p-4 sm:p-6 flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-purple-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-purple-950/20 overflow-y-auto">
            {!file ? (
              <div className="text-center space-y-4">
                <div className="w-24 h-24 sm:w-32 sm:h-32 mx-auto rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center mb-4">
                  <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 text-purple-500 dark:text-purple-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Upload Your Story</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mx-auto">Choose an image or video to share with your followers</p>
                <label className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer transform hover:scale-105 active:scale-95">
                  <Upload className="w-5 h-5" />
                  <input type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
                  Choose File
                </label>
              </div>
            ) : (
              <div className="relative w-full max-w-sm mx-auto">
                {/* 9:16 Story Frame */}
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-3xl blur-2xl"></div>
                  <div 
                    ref={frameRef} 
                    className="relative w-full aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-2xl select-none border-4 border-white/10"
                  >
                    {file.type.startsWith('video') ? (
                      <video src={previewUrl} className="w-full h-full object-contain" controls />
                    ) : (
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Story preview" />
                    )}
                    
                    {/* Template Overlays */}
                    {template==='gradient' && (
                      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 via-purple-500/20 to-blue-500/30" />
                    )}
                    {template==='vignette' && (
                      <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)'
                      }} />
                    )}
                    
                    {/* Text Overlay */}
                    {text && !file.type.startsWith('video') && (
                      <div
                        className={`absolute cursor-move ${align==='center'?'left-1/2 -translate-x-1/2':''}`}
                        style={{ 
                          left: align==='left'? `${textX}%` : undefined, 
                          right: align==='right'? `${100-textX}%` : undefined, 
                          top: `${textY}%`, 
                          color: textColor, 
                          transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
                          filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))'
                        }}
                        onMouseDown={(e)=>{ e.preventDefault(); setDragging(true); }}
                        onTouchStart={()=> setDragging(true)}
                      >
                        <div style={{
                          fontFamily,
                          fontWeight: isBold ? 700 : 400,
                          fontStyle: isItalic ? 'italic' : 'normal',
                          fontSize: `${fontSize/18}rem`,
                          textAlign: align as any,
                          WebkitTextStroke: withStroke ? '3px rgba(0,0,0,0.5)' : '0 transparent',
                          padding: '2px 6px'
                        }}>
                          {text}
                        </div>
                        
                        {/* Rotate Handle */}
                        <div
                          className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg cursor-alias flex items-center justify-center group hover:scale-110 transition-transform"
                          onMouseDown={(e)=>{ e.stopPropagation(); setRotating(true); }}
                          onTouchStart={(e)=>{ e.stopPropagation(); setRotating(true); }}
                          title="Rotate text"
                        >
                          <RotateCw className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Change File Button */}
                <label className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <input type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
                  Change File
                </label>
              </div>
            )}
          </div>

          {/* Tools Panel */}
          <div className="w-full lg:w-96 xl:w-[420px] border-t lg:border-t-0 lg:border-l border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-5 space-y-5">
              
              {/* Templates */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-pink-500" />
                  <label className="text-sm font-bold text-gray-900 dark:text-white">Templates</label>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'none', label: 'None', gradient: 'from-gray-100 to-gray-200' },
                    { key: 'gradient', label: 'Gradient', gradient: 'from-pink-500 to-blue-500' },
                    { key: 'vignette', label: 'Vignette', gradient: 'from-gray-700 to-black' }
                  ].map((t)=> (
                    <button 
                      key={t.key} 
                      onClick={()=> setTemplate(t.key as any)} 
                      className={`relative px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all transform hover:scale-105 ${
                        template===t.key
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg scale-105'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Music */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                    <span className="text-white text-xs">🎵</span>
                  </div>
                  <label className="text-sm font-bold text-gray-900 dark:text-white">Music</label>
                </div>
                <input 
                  value={music} 
                  onChange={e=> setMusic(e.target.value)} 
                  placeholder="Song title or link (optional)" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-transparent text-gray-800 dark:text-gray-200 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all outline-none placeholder:text-gray-400" 
                />
              </div>

              {/* Text Editing */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4 text-purple-500" />
                  <label className="text-sm font-bold text-gray-900 dark:text-white">Text Overlay</label>
                </div>
                
                <input 
                  value={text} 
                  onChange={e=> setText(e.target.value)} 
                  placeholder="Add text to your story" 
                  className="w-full px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 border-2 border-transparent text-gray-800 dark:text-gray-200 focus:border-purple-500 dark:focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20 transition-all outline-none placeholder:text-gray-400" 
                />
                
                {/* Color Picker */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600 border border-purple-200 dark:border-gray-600">
                  <Palette className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Color</label>
                  <input 
                    type="color" 
                    value={textColor} 
                    onChange={e=> setTextColor(e.target.value)} 
                    className="ml-auto w-12 h-10 rounded-lg cursor-pointer border-2 border-white dark:border-gray-700 shadow-md"
                  />
                  <div 
                    className="w-10 h-10 rounded-lg border-2 border-white dark:border-gray-700 shadow-md"
                    style={{ backgroundColor: textColor }}
                  />
                </div>

                {/* Font Size & Rotate Sliders */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-between">
                      <span>Font Size</span>
                      <span className="text-purple-600 dark:text-purple-400">{fontSize}px</span>
                    </label>
                    <input 
                      type="range" 
                      min={24} 
                      max={120} 
                      value={fontSize} 
                      onChange={e=> setFontSize(parseInt(e.target.value))} 
                      className="w-full h-2 bg-gradient-to-r from-purple-200 to-pink-200 dark:from-purple-900 dark:to-pink-900 rounded-full appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 flex items-center justify-between">
                      <span>Rotate</span>
                      <span className="text-pink-600 dark:text-pink-400">{rotate}°</span>
                    </label>
                    <input 
                      type="range" 
                      min={-45} 
                      max={45} 
                      value={rotate} 
                      onChange={e=> setRotate(parseInt(e.target.value))} 
                      className="w-full h-2 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-900 dark:to-purple-900 rounded-full appearance-none cursor-pointer slider-thumb"
                    />
                  </div>
                </div>

                {/* Text Style Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  <button 
                    onClick={()=> setIsBold(v=> !v)} 
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                      isBold
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    B
                  </button>
                  <button 
                    onClick={()=> setIsItalic(v=> !v)} 
                    className={`px-4 py-2 rounded-xl text-sm italic font-semibold transition-all ${
                      isItalic
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    I
                  </button>
                  <button 
                    onClick={()=> setWithStroke(v=> !v)} 
                    className={`px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                      withStroke
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    Stroke
                  </button>
                </div>

                {/* Text Alignment */}
                <div className="flex items-center gap-2">
                  <button 
                    onClick={()=> setAlign('left')} 
                    className={`flex-1 px-3 py-2.5 rounded-xl transition-all ${
                      align==='left'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <AlignLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button 
                    onClick={()=> setAlign('center')} 
                    className={`flex-1 px-3 py-2.5 rounded-xl transition-all ${
                      align==='center'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <AlignCenter className="w-4 h-4 mx-auto" />
                  </button>
                  <button 
                    onClick={()=> setAlign('right')} 
                    className={`flex-1 px-3 py-2.5 rounded-xl transition-all ${
                      align==='right'
                        ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    <AlignRight className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button 
                  onClick={onClose} 
                  className="flex-1 px-5 py-3 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={submit} 
                  disabled={uploading || !file} 
                  className="flex-1 px-5 py-3 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 text-white font-bold hover:from-pink-700 hover:via-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>Share Story</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Hidden Canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #ec4899, #a855f7, #3b82f6);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #db2777, #9333ea, #2563eb);
        }
        
        .slider-thumb::-webkit-slider-thumb {
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #a855f7);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
          transition: all 0.2s;
        }
        
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.6);
        }
        
        .slider-thumb::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ec4899, #a855f7);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(236, 72, 153, 0.4);
          transition: all 0.2s;
        }
        
        .slider-thumb::-moz-range-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 4px 12px rgba(236, 72, 153, 0.6);
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes zoom-in {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        .animate-in {
          animation-fill-mode: both;
        }
        
        .fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .zoom-in-95 {
          animation: zoom-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CreateStoryModal;