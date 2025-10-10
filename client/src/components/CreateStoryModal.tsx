import React, { useMemo, useRef, useState } from 'react';
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
  const [textX, setTextX] = useState<number>(50); // percent
  const [textY, setTextY] = useState<number>(85); // percent
  const [fontSize, setFontSize] = useState<number>(64);
  const [fontFamily, setFontFamily] = useState<string>('system-ui, -apple-system, Segoe UI, Roboto, sans-serif');
  const [isBold, setIsBold] = useState<boolean>(true);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [align, setAlign] = useState<'left'|'center'|'right'>('center');
  const [withStroke, setWithStroke] = useState<boolean>(true);
  const [rotate, setRotate] = useState<number>(0); // degrees
  const [dragging, setDragging] = useState<boolean>(false);
  const [rotating, setRotating] = useState<boolean>(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const previewUrl = useMemo(()=> file ? URL.createObjectURL(file) : '', [file]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Drag/rotate handlers
  React.useEffect(() => {
    const onMove = (ev: MouseEvent | TouchEvent) => {
      if (!frameRef.current || (!dragging && !rotating)) return;
      const rect = frameRef.current.getBoundingClientRect();
      const pt = 'touches' in ev ? ev.touches[0] : (ev as MouseEvent);
      const cx = Math.min(Math.max(pt.clientX - rect.left, 0), rect.width);
      const cy = Math.min(Math.max(pt.clientY - rect.top, 0), rect.height);
      if (dragging) {
        // update position as percentages
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
    // Render 1080x1920 portrait canvas
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
    // cover
    const ratio = Math.max(W / img.width, H / img.height);
    const iw = img.width * ratio, ih = img.height * ratio;
    const ix = (W - iw) / 2, iy = (H - ih) / 2;
    ctx.drawImage(img, ix, iy, iw, ih);
    // template overlays
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
    // text overlay
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
      // If image, render canvas with overlays
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="text-lg font-semibold text-gray-900 dark:text-white">Create Story</div>
          <button onClick={onClose} className="px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">Close</button>
        </div>
        <div className="flex flex-col md:flex-row">
          {/* Editor preview */}
          <div className="flex-1 p-4 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            {!file ? (
              <label className="cursor-pointer inline-flex items-center px-4 py-3 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                <input type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
                Choose file
              </label>
            ) : (
              <div className="relative w-full max-w-sm mx-auto">
                {/* 9:16 frame */}
                <div ref={frameRef} className="relative w-full aspect-[9/16] rounded-xl overflow-hidden bg-black select-none">
                  {file.type.startsWith('video') ? (
                    <video src={previewUrl} className="w-full h-full object-contain" controls />
                  ) : (
                    <img src={previewUrl} className="w-full h-full object-cover" />
                  )}
                  {/* Overlay render approximation */}
                  {template==='gradient' && (<div className="absolute inset-0 bg-gradient-to-br from-pink-500/30 to-blue-500/30" />)}
                  {template==='vignette' && (<div className="absolute inset-0" style={{
                    background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 40%, rgba(0,0,0,0.35) 100%)'
                  }} />)}
                  {text && !file.type.startsWith('video') && (
                    <div
                      className={`absolute cursor-move ${align==='center'?'left-1/2 -translate-x-1/2':''}`}
                      style={{ left: align==='left'? `${textX}%` : undefined, right: align==='right'? `${100-textX}%` : undefined, top: `${textY}%`, color: textColor, transform: `translate(-50%, -50%) rotate(${rotate}deg)` }}
                      onMouseDown={(e)=>{ e.preventDefault(); setDragging(true); }}
                      onTouchStart={()=> setDragging(true)}
                    >
                      <div style={{
                        fontFamily,
                        fontWeight: isBold ? 700 : 400,
                        fontStyle: isItalic ? 'italic' : 'normal',
                        fontSize: `${fontSize/18}rem`, // map ~64px -> ~3.5rem visual
                        textAlign: align as any,
                        WebkitTextStroke: withStroke ? '3px rgba(0,0,0,0.5)' : '0 transparent',
                        padding: '2px 6px'
                      }}>{text}</div>
                      {/* rotate handle */}
                      <div
                        className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white/80 border border-gray-300 cursor-alias"
                        onMouseDown={(e)=>{ e.stopPropagation(); setRotating(true); }}
                        onTouchStart={(e)=>{ e.stopPropagation(); setRotating(true); }}
                        title="Rotate"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Tools */}
          <div className="w-full md:w-80 p-4 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 space-y-4">
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Templates</div>
              <div className="flex gap-2">
                {['none','gradient','vignette'].map((t)=> (
                  <button key={t} onClick={()=> setTemplate(t as any)} className={`px-3 py-1.5 rounded-full text-sm ${template===t?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Music</div>
              <input value={music} onChange={e=> setMusic(e.target.value)} placeholder="Song title or link (optional)" className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200" />
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-500 mb-1">Text</div>
              <input value={text} onChange={e=> setText(e.target.value)} placeholder="Add text" className="w-full px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mb-2" />
              <div className="flex items-center gap-2 mb-2">
                <label className="text-xs text-gray-500">Color</label>
                <input type="color" value={textColor} onChange={e=> setTextColor(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-500">Font size</label>
                  <input type="range" min={24} max={120} value={fontSize} onChange={e=> setFontSize(parseInt(e.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">Rotate</label>
                  <input type="range" min={-45} max={45} value={rotate} onChange={e=> setRotate(parseInt(e.target.value))} className="w-full" />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <button onClick={()=> setIsBold(v=> !v)} className={`px-2 py-1 rounded ${isBold?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>B</button>
                <button onClick={()=> setIsItalic(v=> !v)} className={`px-2 py-1 rounded ${isItalic?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>I</button>
                <button onClick={()=> setWithStroke(v=> !v)} className={`px-2 py-1 rounded ${withStroke?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>Stroke</button>
                <div className="ml-2 flex items-center gap-1">
                  <button onClick={()=> setAlign('left')} className={`px-2 py-1 rounded ${align==='left'?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>L</button>
                  <button onClick={()=> setAlign('center')} className={`px-2 py-1 rounded ${align==='center'?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>C</button>
                  <button onClick={()=> setAlign('right')} className={`px-2 py-1 rounded ${align==='right'?'bg-gray-900 text-white':'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>R</button>
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-between">
              {!file && (
                <label className="cursor-pointer inline-flex items-center px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                  <input type="file" accept="image/*,video/*" onChange={onFile} className="hidden" />
                  Choose file
                </label>
              )}
              <div className="flex-1" />
              <button onClick={onClose} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 mr-2">Cancel</button>
              <button onClick={submit} disabled={uploading || !file} className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50">
                {uploading ? 'Uploading...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
        {/* Hidden canvas for rendering */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
};

export default CreateStoryModal;
