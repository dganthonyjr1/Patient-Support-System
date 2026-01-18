import React, { useEffect, useRef } from 'react';
import { Mic, PhoneOff, Activity, ShieldAlert, Sparkles, Volume2 } from 'lucide-react';

interface VoiceVisualizerProps {
  status: string;
  audioLevel: number; // Normalized 0-1
  onStart: () => void;
  onStop: () => void;
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ status, audioLevel, onStart, onStop }) => {
  // Map specific granular states to a general "Connected" visual state
  const isConnected = ['CONNECTED', 'LISTENING', 'SPEAKING'].includes(status);
  const isAgentSpeaking = status === 'SPEAKING';
  const isConnecting = status === 'CONNECTING';
  const isError = status === 'ERROR';

  // Audio Context Ref for Sound Effects
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevStatusRef = useRef<string>(status);

  // Initialize Audio Context on mount
  useEffect(() => {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    if (Ctx) {
      audioCtxRef.current = new Ctx();
    }
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
      }
    };
  }, []);

  // Handler to ensure AudioContext is resumed on a direct user gesture (click)
  // This is critical for browser autoplay policies to allow the sound cues.
  const handleStartInteraction = () => {
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(e => console.error("Could not resume audio context", e));
    }
    onStart();
  };

  // Play Sound Cues based on State Changes
  useEffect(() => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;

    const playTone = (freq: number, type: 'start' | 'end' | 'speak', duration: number = 0.5) => {
      // Fallback resume if not already running (though handleStartInteraction should catch it)
      if (ctx.state === 'suspended') ctx.resume().catch(() => {}); 
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;
      
      if (type === 'start') {
        // Uplifting chime (A4 -> A5)
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      } else if (type === 'end') {
        // Power down (A4 -> A3)
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      } else if (type === 'speak') {
        // Subtle soft blip (800Hz) - signals AI turn start
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      }

      osc.start(now);
      osc.stop(now + duration);
    };

    const prev = prevStatusRef.current;

    // Logic for Triggers
    if (!['CONNECTED', 'LISTENING', 'SPEAKING'].includes(prev) && ['CONNECTED', 'LISTENING'].includes(status)) {
        // Transition to Connected
        playTone(440, 'start');
    } else if (['CONNECTED', 'LISTENING', 'SPEAKING'].includes(prev) && status === 'ENDED') {
        // Transition to Ended
        playTone(440, 'end');
    } else if (prev !== 'SPEAKING' && status === 'SPEAKING') {
        // Agent Starts Speaking (Turn-taking cue)
        playTone(800, 'speak');
    }

    prevStatusRef.current = status;
  }, [status]);

  // Dynamic Scale based on Audio Level (mic input)
  // Only apply when listening to user
  const micScale = status === 'LISTENING' ? 1 + (audioLevel * 0.5) : 1;
  const micOpacity = status === 'LISTENING' ? 0.2 + (audioLevel * 0.8) : 0.2;

  return (
    <div className="w-full">
      <div className={`
        relative overflow-hidden rounded-2xl transition-all duration-500
        ${isConnected ? 'bg-teal-900 text-white shadow-2xl scale-[1.02]' : 'bg-white text-stone-800 shadow-xl border border-stone-200'}
        p-8 md:p-12 text-center
      `}>
        
        {/* Status Indicator / Icon */}
        <div className="flex justify-center mb-8">
          <div className={`
            relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200
            ${isConnected ? 'bg-white/10 text-white' : 'bg-stone-100 text-stone-600'}
            ${isError ? 'bg-red-50 text-red-500' : ''}
          `}
          style={{ transform: isConnected ? `scale(${isAgentSpeaking ? 1 : Math.max(1, micScale)})` : 'scale(1)' }}
          >
             {isConnected ? (
               <div className="relative">
                 {isAgentSpeaking ? (
                    <Volume2 className="w-10 h-10 animate-pulse text-teal-200" />
                 ) : (
                    <Activity className="w-10 h-10" />
                 )}
                 
                 {/* Visual Pulse for Mic Input */}
                 {!isAgentSpeaking && (
                    <div 
                        className="absolute inset-0 bg-white rounded-full blur-xl transition-opacity duration-100"
                        style={{ opacity: micOpacity, transform: `scale(${micScale})` }}
                    ></div>
                 )}

                 {/* Speaking Pulse */}
                 {isAgentSpeaking && (
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-xl animate-pulse scale-110"></div>
                 )}
               </div>
             ) : isError ? (
               <ShieldAlert className="w-10 h-10" />
             ) : (
               <Mic className="w-10 h-10" />
             )}
          </div>
        </div>

        {/* Text Content */}
        <div className="mb-10 space-y-3">
          <h2 className={`text-2xl md:text-3xl font-serif font-bold transition-colors ${isConnected ? 'text-white' : 'text-stone-800'}`}>
            {status === 'IDLE' && 'Speak with our Assistant'}
            {status === 'CONNECTING' && 'Establishing Secure Connection...'}
            {(status === 'LISTENING' || status === 'CONNECTED') && 'I am listening...'}
            {status === 'SPEAKING' && 'Dr. Meusburger Assistant'}
            {status === 'ERROR' && 'Connection Unavailable'}
            {status === 'ENDED' && 'Session Ended'}
          </h2>
          <p className={`text-sm md:text-base max-w-md mx-auto leading-relaxed ${isConnected ? 'text-teal-100' : 'text-stone-500'}`}>
            {status === 'IDLE' && 'Ask about refills, scheduling, or office policies. We are here to help.'}
            {status === 'CONNECTING' && 'Please wait a moment while we connect you.'}
            {(status === 'LISTENING' || status === 'CONNECTED') && 'Please speak naturally. The ring visualizer reacts to your voice.'}
            {status === 'SPEAKING' && 'Providing information...'}
            {status === 'ERROR' && 'We could not connect to the voice service. Please refresh and try again.'}
            {status === 'ENDED' && 'Thank you for calling. Review your instructions below.'}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex justify-center">
          {isConnected ? (
            <button
              onClick={onStop}
              className="group flex items-center gap-3 bg-red-500/20 hover:bg-red-500/30 text-red-100 border border-red-500/30 px-8 py-4 rounded-full font-medium transition-all backdrop-blur-sm"
            >
              <PhoneOff className="w-5 h-5 group-hover:scale-110 transition-transform" />
              End Conversation
            </button>
          ) : (
            <button
              onClick={handleStartInteraction}
              disabled={isConnecting}
              className={`
                group flex items-center gap-3 px-8 py-4 rounded-full font-medium text-lg transition-all shadow-lg hover:shadow-xl
                ${isConnecting ? 'opacity-70 cursor-wait bg-stone-200 text-stone-500' : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95'}
              `}
            >
              {isConnecting ? (
                <Sparkles className="w-5 h-5 animate-spin" />
              ) : (
                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              )}
              {status === 'ERROR' ? 'Retry Connection' : 'Start Conversation'}
            </button>
          )}
        </div>
        
        {/* Secure Badge */}
        <div className={`mt-8 text-xs font-medium tracking-wider uppercase flex items-center justify-center gap-2 ${isConnected ? 'text-teal-300' : 'text-stone-400'}`}>
           <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-teal-400 animate-pulse' : 'bg-stone-300'}`}></div>
           Secure Voice Encryption
        </div>
      </div>
    </div>
  );
};