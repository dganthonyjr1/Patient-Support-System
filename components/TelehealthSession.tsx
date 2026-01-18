import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ShieldCheck, User, Loader2, AlertTriangle, Signal, Wifi, Music, VolumeX, Activity, PhoneIncoming, Phone } from 'lucide-react';
import { PatientDetails } from '../types';

interface TelehealthSessionProps {
  onEndCall: () => void;
  patientDetails: PatientDetails;
}

type ConnectionStatus = 'initializing' | 'waiting' | 'incoming' | 'connecting' | 'connected';

const WAITING_IMAGES = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1920&q=80", // Mountain Lake
  "https://images.unsplash.com/photo-1501854140884-074bf86ee91c?auto=format&fit=crop&w=1920&q=80", // Calm Water
  "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1920&q=80", // Forest Light
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1920&q=80", // Foggy Hills
  "https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?auto=format&fit=crop&w=1920&q=80", // Deep Ocean/Forest
];

// Gentle ambient piano loop (Royalty Free)
const WAITING_MUSIC_URL = "https://cdn.pixabay.com/download/audio/2022/02/07/audio_1822e427fb.mp3?filename=piano-moment-9835.mp3"; 

export const TelehealthSession: React.FC<TelehealthSessionProps> = ({ onEndCall, patientDetails }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ringtoneRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('initializing');
  const [duration, setDuration] = useState(0);
  const [connectionProgress, setConnectionProgress] = useState(0);
  
  // Waiting Room Features
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(true);

  // Initialize Camera
  useEffect(() => {
    let mounted = true;

    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true, 
          audio: true 
        });
        
        if (mounted) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setStatus('waiting');
        }
      } catch (err) {
        console.error("Error accessing media devices:", err);
        if (mounted) setError("Unable to access camera or microphone. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      mounted = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Waiting Room: Image Rotator
  useEffect(() => {
    if (status === 'connected') return;

    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % WAITING_IMAGES.length);
    }, 6000); // Rotate every 6 seconds

    return () => clearInterval(interval);
  }, [status]);

  // Waiting Room: Music Control
  useEffect(() => {
    // Setup Audio Instance
    if (!audioRef.current) {
      audioRef.current = new Audio(WAITING_MUSIC_URL);
      audioRef.current.loop = true;
      audioRef.current.volume = 0.3; // Low background volume
    }

    const audio = audioRef.current;
    
    // Music should play during waiting, but NOT during incoming call (ringtone takes over) or connected.
    const shouldPlay = (status === 'waiting' || status === 'initializing') && isMusicPlaying;

    if (shouldPlay) {
      if (audio.paused) {
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.warn("Auto-play was prevented by browser policy:", error);
            setIsMusicPlaying(false);
          });
        }
      }
    } else {
      if (!audio.paused) {
        audio.pause();
      }
    }
  }, [status, isMusicPlaying]);

  // Ringtone Simulation for Incoming Call
  useEffect(() => {
    if (status === 'incoming') {
        // Initialize Audio Context for synthetic ringtone
        if (!audioCtxRef.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            if (Ctx) audioCtxRef.current = new Ctx();
        }
        
        const ctx = audioCtxRef.current;
        if (ctx) {
            const playRing = () => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                // Classic digital phone ring pattern
                osc.frequency.setValueAtTime(800, ctx.currentTime);
                osc.frequency.setValueAtTime(1000, ctx.currentTime + 0.1);
                
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
                
                osc.start(ctx.currentTime);
                osc.stop(ctx.currentTime + 1.5);
            };

            // Play immediately then loop
            playRing();
            ringtoneRef.current = setInterval(playRing, 3000);
        }
    } else {
        if (ringtoneRef.current) {
            clearInterval(ringtoneRef.current);
            ringtoneRef.current = null;
        }
    }

    return () => {
        if (ringtoneRef.current) clearInterval(ringtoneRef.current);
    };
  }, [status]);

  // Cleanup Music/Context on Unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioCtxRef.current) {
          audioCtxRef.current.close();
      }
    };
  }, []);

  // --- SIMULATION LOGIC: Doctor Joining ---
  useEffect(() => {
    if (status === 'waiting') {
      // 5-second delay to simulate doctor review
      const timer = setTimeout(() => {
          setStatus('incoming');
      }, 5000); 
      return () => clearTimeout(timer);
    }
  }, [status]);

  // --- SIMULATION LOGIC: Connection Handshake ---
  useEffect(() => {
    if (status === 'connecting') {
        // Simulate negotiation progress bar
        const interval = setInterval(() => {
            setConnectionProgress(prev => {
                const next = prev + (Math.random() * 20);
                if (next >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return next;
            });
        }, 300);
        
        // Hard transition to connected after 2 seconds
        const timer = setTimeout(() => {
            setStatus('connected');
        }, 2000);

        return () => {
            clearInterval(interval);
            clearTimeout(timer);
        };
    }
  }, [status]);

  // Call Duration Timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (status === 'connected') {
      interval = setInterval(() => setDuration(d => d + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  const handleAcceptCall = () => {
      setStatus('connecting');
  };

  const handleDeclineCall = () => {
      onEndCall();
  };

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleEmergencyHangup = () => {
    // End call immediately and redirect to dialer
    onEndCall();
    window.location.href = 'tel:911';
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'initializing':
        return { text: 'Initializing Camera...', color: 'bg-stone-500', pulse: false };
      case 'waiting':
        return { text: `Pending Authorization`, color: 'bg-amber-400', pulse: true };
      case 'incoming':
        return { text: 'Incoming Connection...', color: 'bg-blue-500', pulse: true };
      case 'connecting':
        return { text: 'Securing Connection...', color: 'bg-blue-400', pulse: true };
      case 'connected':
        return { text: 'Encrypted • Live', color: 'bg-green-500', pulse: false }; 
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <div className="w-full h-[600px] bg-stone-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative border border-stone-700 ring-1 ring-white/10">
      
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 p-6 z-10 flex justify-between items-start bg-gradient-to-b from-black/90 via-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-3 pointer-events-auto">
          <div className="bg-teal-600/90 p-2.5 rounded-xl backdrop-blur-md shadow-lg border border-white/10">
            <ShieldCheck className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
             <h3 className="text-white font-serif font-bold tracking-wide drop-shadow-lg text-lg leading-tight">Secure Telehealth</h3>
             <div className="flex items-center gap-2 mt-0.5">
               <span className={`w-2 h-2 rounded-full ${statusConfig.color} ${statusConfig.pulse || status === 'connected' ? 'animate-pulse' : ''} shadow-[0_0_8px_currentColor]`}></span>
               <p className={`text-xs font-semibold tracking-wide uppercase ${status === 'connected' ? 'text-green-300' : 'text-stone-300'}`}>
                 {statusConfig.text}
               </p>
             </div>
          </div>
        </div>
        
        {/* Emergency Button - Always accessible */}
        <button 
          onClick={handleEmergencyHangup}
          className="pointer-events-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-all hover:scale-105 shadow-lg shadow-red-900/50 border border-red-500/50 animate-in fade-in zoom-in duration-300 group"
        >
          <AlertTriangle className="w-4 h-4 group-hover:rotate-12 transition-transform" />
          Emergency: 911
        </button>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 flex flex-col items-center justify-center bg-stone-900 text-center relative overflow-hidden">
        
        {/* Screensaver (Waiting / Incoming) */}
        {status !== 'connected' && (
          <div className="absolute inset-0 z-0 pointer-events-none">
             {WAITING_IMAGES.map((img, index) => (
                <div 
                  key={index}
                  className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out ${index === currentBgIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'}`}
                  style={{ backgroundImage: `url(${img})` }}
                />
             ))}
             {/* Dark overlay for text readability */}
             <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"></div>
          </div>
        )}

        {status === 'connected' ? (
           // Connected View (Doctor Feed)
           <div className="absolute inset-0 bg-stone-900 flex flex-col items-center justify-center animate-in fade-in duration-1000 z-10 overflow-hidden">
              {/* Dynamic Background */}
              <div className="absolute inset-0 bg-gradient-to-br from-stone-800 via-stone-900 to-black opacity-80 animate-pulse"></div>
              
              {/* Scanlines Overlay for Video Effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] z-0 bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20"></div>

              {/* Doctor Avatar/Feed Simulation */}
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-48 h-48 rounded-full bg-stone-700 flex items-center justify-center border-4 border-stone-600 shadow-2xl mb-6 relative overflow-hidden group">
                   {/* Simulated Video Feed Image (Placeholder) */}
                   <div className="absolute inset-0 bg-stone-600 flex items-center justify-center overflow-hidden">
                     <User className="w-24 h-24 text-stone-400 opacity-50 z-10" />
                     {/* Dynamic noise background behind user */}
                     <div className="absolute inset-0 bg-black opacity-20 animate-pulse"></div>
                   </div>
                   
                   {/* Simulated Talking Animation Overlay */}
                   <div className="absolute inset-0 bg-teal-500/10 animate-pulse"></div>
                </div>
                
                <h2 className="text-3xl text-white font-serif font-bold drop-shadow-md mb-2 flex items-center gap-2">
                  Dr. Charles Meusburger
                  <ShieldCheck className="w-6 h-6 text-teal-400" />
                </h2>
                
                <div className="flex items-center gap-4 text-stone-400 text-sm">
                   <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                     <span className="font-medium tracking-wide text-green-400">LIVE FEED</span>
                   </div>
                   <span>•</span>
                   <div className="flex items-center gap-1">
                     <Wifi className="w-4 h-4" />
                     <span>HD 1080p</span>
                   </div>
                </div>
              </div>

              {/* Network Stats Overlay */}
              <div className="absolute bottom-6 left-6 flex flex-col gap-1 items-start opacity-50 hover:opacity-100 transition-opacity z-20">
                 <div className="flex gap-1 items-end h-3">
                   <div className="w-1 h-1 bg-green-500 rounded-sm"></div>
                   <div className="w-1 h-2 bg-green-500 rounded-sm"></div>
                   <div className="w-1 h-3 bg-green-500 rounded-sm"></div>
                   <div className="w-1 h-2 bg-green-500/30 rounded-sm"></div>
                 </div>
                 <span className="text-[10px] font-mono text-stone-400">LATENCY: 24ms • ENCRYPTED</span>
              </div>
              
              {/* Recording Indicator */}
              <div className="absolute top-28 right-8 flex items-center gap-2 px-3 py-1.5 bg-red-950/50 border border-red-500/20 rounded-lg backdrop-blur-sm z-20">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-bold text-red-400 tracking-widest uppercase">REC</span>
              </div>
           </div>
        ) : (
          // Waiting / Incoming / Connecting State
          <div className="max-w-md w-full space-y-8 flex flex-col items-center z-10 p-10 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl animate-in slide-in-from-bottom-8 duration-700 relative transition-all">
            
            <div className="relative">
              <div className={`w-28 h-28 rounded-full bg-stone-800 flex items-center justify-center border-4 relative z-10 shadow-inner transition-colors duration-500 ${status === 'incoming' ? 'border-green-500 animate-pulse' : 'border-stone-700'}`}>
                 {status === 'incoming' ? (
                     <PhoneIncoming className="w-12 h-12 text-green-400 animate-bounce" />
                 ) : (
                     <User className="w-12 h-12 text-stone-500" />
                 )}
              </div>
              
              {/* Pulsing rings for waiting state */}
              {status === 'waiting' && <div className="absolute inset-0 bg-teal-500/20 rounded-full blur-xl animate-ping opacity-20"></div>}
              {status === 'incoming' && (
                  <>
                    <div className="absolute inset-0 bg-green-500/30 rounded-full blur-xl animate-ping duration-1000"></div>
                    <div className="absolute -inset-8 border-2 border-green-500/20 rounded-full animate-pulse"></div>
                  </>
              )}
            </div>
            
            <div className="space-y-3 text-center">
              <h2 className="text-2xl text-white font-serif font-medium tracking-wide drop-shadow-lg">
                {status === 'connecting' && 'Finalizing Encryption...'}
                {status === 'waiting' && `Notifying Doctor...`}
                {status === 'incoming' && 'Incoming Call...'}
              </h2>
              <p className="text-stone-200 text-sm leading-relaxed max-w-xs mx-auto drop-shadow">
                {status === 'connecting' && 'Establishing peer-to-peer secure handshake.'}
                {status === 'waiting' && (
                   <span><strong>ID Confirmed:</strong> {patientDetails.name}<br/>
                   <span className="text-teal-200">Waiting for Dr. Meusburger to authorize session start...</span></span>
                )}
                {status === 'incoming' && 'Dr. Meusburger is requesting to join the session.'}
              </p>
            </div>
            
            {/* Dynamic Controls based on State */}
            {status === 'incoming' ? (
                <div className="flex items-center gap-6 w-full justify-center mt-4">
                    <button 
                        onClick={handleDeclineCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-14 h-14 rounded-full bg-red-500/90 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-900/40 transition-transform group-active:scale-95">
                            <PhoneOff className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xs font-bold text-red-200 uppercase tracking-wider">Decline</span>
                    </button>
                    <button 
                        onClick={handleAcceptCall}
                        className="flex flex-col items-center gap-2 group"
                    >
                        <div className="w-16 h-16 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center shadow-lg shadow-green-900/40 transition-transform group-hover:scale-110 animate-bounce">
                            <Phone className="w-8 h-8 text-white fill-current" />
                        </div>
                        <span className="text-xs font-bold text-green-200 uppercase tracking-wider">Accept</span>
                    </button>
                </div>
            ) : (
                // Waiting / Connecting Indicator
                <div className={`flex flex-col items-center gap-3 px-6 py-2.5 rounded-2xl border transition-all duration-500 min-w-[200px] ${
                    status === 'connecting' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-teal-500/10 border-teal-500/30 text-teal-300'
                }`}>
                    <div className="flex items-center gap-2">
                        <Loader2 className={`w-4 h-4 ${status === 'connecting' ? 'animate-spin' : 'animate-pulse'}`} />
                        <span className="text-xs font-bold uppercase tracking-wider">
                        {status === 'connecting' ? 'Connecting...' : 'Waiting for Approval'}
                        </span>
                    </div>
                    
                    {/* Progress Bar for Connecting State */}
                    {status === 'connecting' && (
                        <div className="w-full h-1 bg-blue-900/50 rounded-full overflow-hidden mt-1">
                        <div 
                            className="h-full bg-blue-400 transition-all duration-300 ease-out"
                            style={{ width: `${connectionProgress}%` }}
                        ></div>
                        </div>
                    )}
                </div>
            )}

            {/* Music Controls for Waiting Room (Only visible in Waiting) */}
            {status === 'waiting' && (
                <button 
                onClick={() => setIsMusicPlaying(!isMusicPlaying)}
                className="absolute -bottom-16 flex items-center gap-2 text-stone-400 hover:text-white transition-colors bg-black/40 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5 hover:border-white/20 hover:scale-105"
                >
                {isMusicPlaying ? <Music className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                <span className="text-xs font-medium">{isMusicPlaying ? 'Soothing Music On' : 'Music Off'}</span>
                </button>
            )}
          </div>
        )}

        {/* Self View (PIP) */}
        <div className="absolute bottom-28 right-6 w-56 h-40 bg-black rounded-2xl overflow-hidden shadow-2xl border border-stone-700/50 z-20 group ring-1 ring-white/5 transition-transform hover:scale-105 duration-300">
          {error ? (
             <div className="w-full h-full flex flex-col items-center justify-center text-xs text-red-400 p-4 text-center bg-stone-900">
               <AlertTriangle className="w-6 h-6 mb-2 opacity-50" />
               {error}
             </div>
          ) : (
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className={`w-full h-full object-cover transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'} mirror-mode`}
               style={{ transform: 'scaleX(-1)' }} // Mirror effect
             />
          )}
          
          {/* Video Off Placeholder */}
          {isVideoOff && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-800">
              <User className="w-12 h-12 text-stone-600" />
            </div>
          )}

          {/* PIP Label & Mute Indicator */}
          <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
            <div className="bg-black/60 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white/90 border border-white/5 truncate max-w-[120px]">
              {patientDetails.name}
            </div>
            {isMuted && (
              <div className="bg-red-500/90 p-1.5 rounded-full shadow-sm animate-in zoom-in duration-200">
                <MicOff className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
        </div>
        
        {/* Connection Timer (Only when connected) */}
        {status === 'connected' && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-stone-200 text-sm font-mono border border-white/10 animate-in fade-in slide-in-from-top-4 shadow-xl z-20">
            {formatTime(duration)}
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className="h-28 bg-stone-900 border-t border-stone-800 flex items-center justify-center gap-6 px-6 relative z-30">
         
         <button 
           onClick={toggleMute}
           className={`p-4 rounded-full transition-all duration-300 flex flex-col items-center gap-1 border ${isMuted ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white hover:border-stone-600 hover:shadow-lg hover:-translate-y-1'}`}
           title={isMuted ? "Unmute" : "Mute"}
         >
           {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
         </button>
         
         <button 
           onClick={onEndCall}
           className="px-10 py-4 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold tracking-wide flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-red-900/30 ring-4 ring-stone-900 hover:ring-red-900/50"
         >
           <PhoneOff className="w-6 h-6 fill-current" />
           <span>END CALL</span>
         </button>

         <button 
           onClick={toggleVideo}
           className={`p-4 rounded-full transition-all duration-300 flex flex-col items-center gap-1 border ${isVideoOff ? 'bg-red-500/20 text-red-500 border-red-500/30 hover:bg-red-500/30' : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700 hover:text-white hover:border-stone-600 hover:shadow-lg hover:-translate-y-1'}`}
           title={isVideoOff ? "Turn Video On" : "Turn Video Off"}
         >
           {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
         </button>
      </div>
    </div>
  );
};
