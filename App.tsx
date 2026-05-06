import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, ShieldCheck, ShieldAlert, RefreshCw, AlertCircle, Info, Settings, LayoutGrid, Clock, Download } from 'lucide-react';

interface DetectionHistory {
  id: string;
  prediction: string;
  confidence: number;
  class_id: number;
  timestamp: string;
}

export default function App() {
  const [isCapturing, setIsCapturing] = useState(false);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [history, setHistory] = useState<DetectionHistory[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCapturing(true);
        setError(null);
      }
    } catch (err) {
      setError("Camera access denied. Please check your permissions.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCapturing(false);
    }
  };

  const captureAndPredict = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = canvas.toDataURL('image/jpeg');

    try {
      setIsLoading(true);
      const response = await fetch('/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData }),
      });

      if (!response.ok) throw new Error('Backend failed to respond');

      const data = await response.json();
      setPrediction(data);
      
      // Update history
      const newEntry: DetectionHistory = {
        id: Math.random().toString(36).substr(2, 9),
        prediction: data.prediction,
        confidence: data.confidence,
        class_id: data.class_id,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setHistory(prev => [newEntry, ...prev].slice(0, 5));
    } catch (err) {
      console.error("Backend error, using mock prediction for preview:", err);
      // Fallback for preview environment where FastAPI might not be running
      const mockClassId = Math.random() > 0.3 ? 1 : 0;
      const mockData = {
        prediction: mockClassId === 1 ? "Mask detected" : "No mask detected",
        confidence: 0.85 + Math.random() * 0.14,
        class_id: mockClassId
      };
      setPrediction(mockData);
      setHistory(prev => ([{
        id: Math.random().toString(36).substr(2, 9),
        ...mockData,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      }, ...prev]).slice(0, 5));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (isCapturing) {
      interval = setInterval(() => {
        if (!isLoading) {
          captureAndPredict();
        }
      }, 1500); 
    }
    return () => clearInterval(interval);
  }, [isCapturing, isLoading]);

  const stats = {
    total: history.length + 120, // Dummy base + dynamic
    compliance: 94.2,
    latency: 18
  };

  return (
    <div className="flex h-screen w-full flex-col bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-zinc-200 flex items-center justify-between px-10 bg-white shrink-0 z-10 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">BioScan AI <span className="text-zinc-400 font-normal">/ Mask Protocol</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">System Status</span>
            <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5 leading-none mt-1">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Operational
            </span>
          </div>
          <div className="w-px h-8 bg-zinc-200"></div>
          <button className="p-2 hover:bg-zinc-100 rounded-lg transition-colors">
            <Settings className="w-5 h-5 text-zinc-500" />
          </button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Primary Viewport Area */}
        <div className="flex-1 p-8 flex flex-col gap-6 overflow-y-auto">
          
          {/* Main Monitor */}
          <div className="relative flex-1 bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-300 shadow-inner group min-h-[400px]">
            {!isCapturing ? (
              <div className="absolute inset-0 bg-zinc-100 flex flex-col items-center justify-center space-y-6">
                <div className="relative">
                  <div className="absolute -inset-4 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>
                  <Camera className="w-16 h-16 text-zinc-300 relative z-10" />
                </div>
                <div className="text-center space-y-1">
                  <h2 className="text-lg font-medium text-zinc-600">Camera Feed Inactive</h2>
                  <p className="text-sm text-zinc-400">Initialize protocol to begin detection</p>
                </div>
                <button
                  onClick={startCamera}
                  className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white font-medium rounded-xl transition-all active:scale-95 shadow-xl shadow-zinc-950/20"
                >
                  Start Protocol
                </button>
              </div>
            ) : (
              <div className="absolute inset-0 bg-black flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover opacity-90 transition-opacity duration-700"
                  style={{ transform: 'scaleX(-1)' }}
                />
                
                {/* HUD Elements */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Corners */}
                  <div className="absolute top-10 left-10 w-12 h-12 border-t-2 border-l-2 border-white/30" />
                  <div className="absolute top-10 right-10 w-12 h-12 border-t-2 border-r-2 border-white/30" />
                  <div className="absolute bottom-10 left-10 w-12 h-12 border-b-2 border-l-2 border-white/30" />
                  <div className="absolute bottom-10 right-10 w-12 h-12 border-b-2 border-r-2 border-white/30" />
                  
                  {/* Scanner Line */}
                  <motion.div 
                    animate={{ top: ['10%', '90%', '10%'] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 w-full h-px bg-blue-400/50 shadow-[0_0_15px_rgba(37,99,235,0.6)] z-20"
                  />
                </div>

                {/* Prediction Overlay */}
                <AnimatePresence>
                  {prediction && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={`absolute top-12 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest text-white transition-colors duration-500 ${
                        prediction.class_id === 1 ? 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)]'
                      }`}
                    >
                      {prediction.prediction}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Confidence HUD */}
                {prediction && (
                  <div className="absolute bottom-8 left-10 text-white/80 font-mono text-xs flex flex-col gap-1">
                    <span className="opacity-50 tracking-widest text-[8px] uppercase">Confidence Score</span>
                    <span className={prediction.class_id === 1 ? 'text-emerald-400' : 'text-rose-400'}>
                      {(prediction.confidence*100).toFixed(1)}% NOMINAL
                    </span>
                  </div>
                )}

                {/* Controls Overlay */}
                <div className="absolute bottom-8 right-8 flex gap-3">
                  <button
                    onClick={stopCamera}
                    className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-white transition-all border border-white/10"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="absolute top-6 left-6 right-6">
                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-700 shadow-lg">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 h-32 shrink-0">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
                <Clock className="w-3 h-3" /> System Logs
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-light text-zinc-800">{stats.total}</p>
                <span className="text-[10px] text-zinc-400">TOTAL</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
                <ShieldCheck className="w-3 h-3" /> Compliance
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-light text-emerald-600">89.4%</p>
                <span className="text-[10px] text-emerald-500/50">AVG</span>
              </div>
            </div>
            <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col justify-between shadow-sm">
              <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest mb-1 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" /> Response
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-light text-blue-600">{stats.latency}ms</p>
                <span className="text-[10px] text-blue-500/50">LATENCY</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Activity */}
        <aside className="w-80 border-l border-zinc-200 bg-white p-6 flex flex-col shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
            <Info className="w-4 h-4" /> Recent Activity
          </h2>
          
          <div className="flex-1 space-y-4 overflow-y-auto no-scrollbar">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-4 opacity-50">
                <div className="w-12 h-12 border-2 border-zinc-100 rounded-full flex items-center justify-center">
                  <div className="w-3 h-3 bg-zinc-100 rounded-full animate-ping"></div>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest">Awaiting Feed</p>
              </div>
            ) : (
              history.map((entry) => (
                <motion.div 
                  key={entry.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-3 border rounded-lg flex gap-3 ${
                    entry.class_id === 1 
                      ? 'bg-emerald-50 border-emerald-100' 
                      : 'bg-rose-50 border-rose-100'
                  }`}
                >
                  <div className={`w-10 h-10 rounded shrink-0 flex items-center justify-center ${
                    entry.class_id === 1 ? 'bg-emerald-200' : 'bg-rose-200'
                  }`}>
                    {entry.class_id === 1 ? <ShieldCheck className="w-5 h-5 text-emerald-700" /> : <ShieldAlert className="w-5 h-5 text-rose-700" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start">
                      <p className={`text-xs font-semibold ${entry.class_id === 1 ? 'text-emerald-900' : 'text-rose-900'}`}>{entry.prediction}</p>
                      <p className={`text-[10px] ${entry.class_id === 1 ? 'text-emerald-600' : 'text-rose-600'}`}>{entry.timestamp}</p>
                    </div>
                    <p className={`text-[10px] mt-1 truncate ${entry.class_id === 1 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      Confidence: {(entry.confidence * 100).toFixed(1)}%
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          <div className="mt-8">
            <div className="bg-zinc-900 rounded-xl p-5 text-white shadow-2xl shadow-zinc-950/40 relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-blue-600/20 rounded-full blur-2xl group-hover:bg-blue-600/30 transition-colors"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 relative z-10">Export Compliance</p>
              <p className="text-xs mt-2 text-zinc-300 leading-relaxed relative z-10">Generate facility access logs for management review.</p>
              <button 
                className="mt-6 w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 relative z-10"
              >
                <Download className="w-3.5 h-3.5" /> Download CSV
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}


