import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Phone, Clock, FileText, AlertCircle, Calendar, ChevronRight, Video, Stethoscope, ArrowLeft, Mail, MessageSquare, Settings, Copy, X, Smartphone, Zap, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { VoiceVisualizer } from './components/VoiceVisualizer';
import { TelehealthSession } from './components/TelehealthSession';
import { PatientAuthForm } from './components/PatientAuthForm';
import { GeminiLiveService, SYSTEM_INSTRUCTION, logInteractionTool, sendPortalLinkTool } from './services/geminiLiveService';
import { InteractionLog, PatientDetails } from './types';

// REPLACE THIS WITH YOUR ACTUAL RETELL PHONE NUMBER
const RETELL_PHONE_NUMBER = "+1 (415) 555-0199";

type ViewState = 'assistant' | 'telehealth';

interface Notification {
  id: string;
  type: 'sms' | 'email';
  destination: string;
}

// Retell-specific Tool Definitions (Mapped from Gemini tools but strictly JSON Schema for Retell)
const RETELL_TOOLS = [
  {
    type: "function",
    name: "logInteraction",
    description: "Logs the structured details of the patient interaction when the call concludes or when sufficient data is gathered.",
    parameters: {
      type: "object",
      properties: {
        caller_name: { type: "string" },
        phone: { type: "string" },
        email: { type: "string" },
        intent: { type: "string" },
        med_status: { type: "string", enum: ["routine_refill", "out_of_meds", "not_applicable"] },
        risk_level: { type: "string", enum: ["low", "medium", "high"] },
        summary: { type: "string" },
        followup_bundle: { type: "string", enum: ["bundle_1", "bundle_2", "bundle_3", "none"] },
        escalation_required: { type: "string", enum: ["yes", "no"] },
        escalation_reason: { type: "string" },
        next_step: { type: "string" },
      },
      required: ["intent", "risk_level", "escalation_required", "next_step"]
    }
  },
  {
    type: "function",
    name: "sendPortalLink",
    description: "Sends a secure access link (magic link) to the patient via SMS or Email. Use this to divert non-emergency calls to the digital portal.",
    parameters: {
      type: "object",
      properties: {
        method: { type: "string", enum: ["sms", "email"] },
        destination: { type: "string", description: "The phone number or email address to send the link to." },
      },
      required: ["method", "destination"]
    }
  }
];

export default function App() {
  const [view, setView] = useState<ViewState>('assistant');
  const [status, setStatus] = useState<string>('IDLE');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [logs, setLogs] = useState<InteractionLog[]>([]);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showRetellConfig, setShowRetellConfig] = useState(false);
  const [patientDetails, setPatientDetails] = useState<PatientDetails | null>(null);
  
  // Retell Sync State - Pre-filled with provided key
  const [retellApiKey, setRetellApiKey] = useState("key_a07875e170316b0f6f8481a00965");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{agentId: string, llmId: string} | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  
  const serviceRef = useRef<GeminiLiveService | null>(null);

  // Availability Logic (Simulated: Wednesday is the active office day)
  const today = new Date();
  const currentDay = today.getDay(); // 0 = Sunday, 3 = Wednesday
  const OFFICE_DAY_INDEX = 3; 
  const isOfficeDay = currentDay === OFFICE_DAY_INDEX;

  // Calculate days until next office day for dynamic messaging
  // If today is office day, daysUntil is 0. If tomorrow, 1, etc.
  const daysUntilOffice = (OFFICE_DAY_INDEX - currentDay + 7) % 7;
  
  const getAvailabilityText = () => {
    if (isOfficeDay) return 'Dr. Meusburger is IN THE OFFICE Today • Patient Response Times: < 2 Hours';
    if (daysUntilOffice === 1) return 'Semi-Retired Practice • Out of Office • Returns Tomorrow (Wednesday)';
    return `Semi-Retired Practice • Out of Office • Returns in ${daysUntilOffice} Days (Wednesday)`;
  };

  const getStatusColor = () => {
    if (isOfficeDay) return 'bg-green-700';
    if (daysUntilOffice === 1) return 'bg-amber-600'; // Urgency for tomorrow
    return 'bg-teal-900';
  };

  const handleStart = async () => {
    if (!process.env.API_KEY) {
      alert("API Key is missing. Please set REACT_APP_GEMINI_API_KEY in your environment.");
      return;
    }
    
    if (view !== 'assistant') setView('assistant');

    serviceRef.current = new GeminiLiveService(
      process.env.API_KEY,
      (log) => setLogs(prev => [log, ...prev]),
      (newStatus) => setStatus(newStatus),
      (level) => setAudioLevel(level),
      (method, destination) => {
        const id = Math.random().toString(36).substring(7);
        setNotification({ id, type: method as 'sms' | 'email', destination });
        setTimeout(() => setNotification(current => current?.id === id ? null : current), 5000);
      }
    );

    await serviceRef.current.start();
  };

  const handleStop = async () => {
    if (serviceRef.current) {
      await serviceRef.current.stop();
      serviceRef.current = null;
      setAudioLevel(0);
    }
  };

  const enterTelehealth = async () => {
    if (serviceRef.current) await handleStop();
    setView('telehealth');
  };

  const exitTelehealth = () => {
    setView('assistant');
    setPatientDetails(null); // Reset auth details on exit
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  // --- RETELL AUTO-SYNC LOGIC ---
  const handleRetellSync = async () => {
    if (!retellApiKey) {
      setSyncError("Please enter your Retell API Key.");
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    setSyncResult(null);

    try {
      // Step 1: Create Retell LLM (Defines the Prompt & Tools)
      const llmResponse = await fetch("https://api.retellai.com/create-retell-llm", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          general_prompt: SYSTEM_INSTRUCTION,
          general_tools: RETELL_TOOLS,
          model: "gpt-4o", // Retell's stable standard, maps well to our instructions
          model_temperature: 0.7
        })
      });

      if (!llmResponse.ok) throw new Error("Failed to create Retell LLM. Check API Key.");
      const llmData = await llmResponse.json();
      const llmId = llmData.llm_id;

      // Step 2: Create Agent (Links the LLM to an Identity)
      const agentResponse = await fetch("https://api.retellai.com/create-agent", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${retellApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          agent_name: "Dr. Meusburger Voice Assistant",
          voice_id: "11labs-Adrian", // A solid male voice default
          retell_llm_id: llmId,
          language: "en-US" // It supports polyglot via prompt, base can be EN
        })
      });

      if (!agentResponse.ok) throw new Error("Failed to create Agent.");
      const agentData = await agentResponse.json();
      
      setSyncResult({
        agentId: agentData.agent_id,
        llmId: llmId
      });

    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "An unknown error occurred.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-800 relative">
      
      {/* Retell Configuration Modal */}
      {showRetellConfig && (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-stone-200 flex justify-between items-center bg-stone-50">
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900">Retell AI Setup</h3>
                <p className="text-sm text-stone-500">Auto-deploy this agent to your Retell account.</p>
              </div>
              <button onClick={() => setShowRetellConfig(false)} className="p-2 hover:bg-stone-200 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 space-y-8">
              
              {/* Option A: Auto Sync */}
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-teal-100 rounded-lg text-teal-700">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-stone-900">One-Click Auto Sync</h4>
                </div>
                
                {!syncResult ? (
                  <div className="space-y-4">
                    <p className="text-sm text-stone-600">
                      Enter your <strong>Retell API Key</strong> below. We will automatically create the LLM configuration and Agent for you with all the correct prompts and tools.
                    </p>
                    <input 
                      type="password" 
                      placeholder="key_..." 
                      value={retellApiKey}
                      onChange={(e) => setRetellApiKey(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-stone-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-mono text-sm"
                    />
                    {syncError && (
                      <div className="text-red-600 text-xs flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {syncError}
                      </div>
                    )}
                    <button 
                      onClick={handleRetellSync}
                      disabled={isSyncing}
                      className="w-full bg-teal-700 hover:bg-teal-800 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                      {isSyncing ? "Syncing..." : "Create Agent Automatically"}
                    </button>
                    <p className="text-xs text-stone-400 text-center">
                      Your key is used once locally and never stored.
                    </p>
                  </div>
                ) : (
                  <div className="bg-white border border-green-200 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                      <CheckCircle className="w-5 h-5" />
                      Success! Agent Created.
                    </div>
                    <div className="space-y-2 text-sm text-stone-600">
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span>Agent ID:</span>
                        <span className="font-mono font-bold select-all">{syncResult.agentId}</span>
                      </div>
                      <div className="flex justify-between border-b border-stone-100 pb-2">
                        <span>LLM ID:</span>
                        <span className="font-mono font-bold select-all">{syncResult.llmId}</span>
                      </div>
                      <div className="pt-2">
                        <strong>Microphone Issues?</strong> Test directly in the Retell Dashboard below.
                      </div>
                      <a 
                        href={`https://platform.retellai.com/agents/${syncResult.agentId}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="mt-4 flex items-center justify-center gap-2 w-full bg-stone-900 text-white font-bold py-3 rounded-lg hover:bg-stone-800 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Test Voice Agent (External Dashboard)
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* Option B: Manual Copy Paste */}
              <div>
                 <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                       <div className="w-full border-t border-stone-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                       <span className="px-2 bg-white text-stone-500">OR MANUALLY COPY</span>
                    </div>
                 </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                   <h4 className="font-bold text-stone-700 text-sm uppercase">1. System Prompt</h4>
                   <button onClick={() => copyToClipboard(SYSTEM_INSTRUCTION)} className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-md border border-stone-200">
                     <Copy className="w-3 h-3" /> Copy
                   </button>
                </div>
                <div className="bg-stone-100 p-3 rounded-lg border border-stone-200 max-h-32 overflow-y-auto text-xs font-mono text-stone-600">
                  {SYSTEM_INSTRUCTION}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                   <h4 className="font-bold text-stone-700 text-sm uppercase">2. Tool Definitions (JSON)</h4>
                   <button onClick={() => copyToClipboard(JSON.stringify(RETELL_TOOLS, null, 2))} className="flex items-center gap-2 text-xs text-stone-500 hover:text-stone-900 px-3 py-1.5 rounded-md border border-stone-200">
                     <Copy className="w-3 h-3" /> Copy
                   </button>
                </div>
                <div className="bg-stone-100 p-3 rounded-lg border border-stone-200 max-h-32 overflow-y-auto text-xs font-mono text-stone-600">
                  {JSON.stringify(RETELL_TOOLS, null, 2)}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Toast Notification Layer */}
      {notification && (
        <div className="fixed top-24 right-6 z-50 animate-in slide-in-from-right duration-300">
          <div className="bg-white rounded-lg shadow-xl border border-teal-100 p-4 flex items-center gap-3 w-80">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notification.type === 'sms' ? 'bg-teal-100 text-teal-600' : 'bg-blue-100 text-blue-600'}`}>
              {notification.type === 'sms' ? <MessageSquare className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-bold text-sm text-stone-900">
                {notification.type === 'sms' ? 'SMS Sent' : 'Email Sent'}
              </h4>
              <p className="text-xs text-stone-500">
                Magic link sent to {notification.destination}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top Notification Bar - Dynamic Availability */}
      <div className={`
        ${getStatusColor()} 
        text-white text-xs py-2 px-4 text-center tracking-wide uppercase font-medium transition-colors duration-500 flex items-center justify-center gap-2
      `}>
        {isOfficeDay && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
        {getAvailabilityText()}
      </div>

      {/* Navigation / Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-800 rounded-lg flex items-center justify-center shadow-md">
              <ShieldCheck className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-stone-900 leading-none font-serif">Dr. Charles Meusburger</h1>
              <p className="text-xs text-stone-500 font-medium mt-1 uppercase tracking-widest">Psychiatry & Patient Safety</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-stone-600">
             
             {/* Dynamic Availability Indicator - Header Pill */}
             <div className={`flex items-center gap-2.5 px-4 py-2 rounded-full border transition-all ${
               isOfficeDay 
                 ? 'bg-green-50 border-green-200 text-green-800 shadow-sm' 
                 : 'bg-stone-50 border-stone-200 text-stone-500'
             }`}>
               <span className="relative flex h-2.5 w-2.5">
                  {isOfficeDay && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOfficeDay ? 'bg-green-500' : 'bg-stone-400'}`}></span>
               </span>
               <span className="font-semibold tracking-wide text-xs uppercase">
                 {isOfficeDay ? 'In Office: Active' : 'Out of Office'}
               </span>
             </div>

             <a href="tel:911" className="flex items-center gap-2 text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-full transition-colors border border-red-100">
               <AlertCircle className="w-4 h-4" />
               <span>Emergency: 911</span>
             </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-12">
        
        {/* Navigation Breadcrumb (Only visible in Telehealth) */}
        {view === 'telehealth' && (
          <button 
            onClick={exitTelehealth}
            className="mb-6 flex items-center gap-2 text-sm text-stone-500 hover:text-teal-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Assistant
          </button>
        )}

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          
          {/* Main Interaction Area (Left - 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-8">
            
            {view === 'assistant' ? (
              <>
                <div className="space-y-4">
                  <h2 className="text-4xl font-serif font-bold text-stone-900 leading-tight">
                    Patient Support Center
                  </h2>
                  <p className="text-lg text-stone-600 leading-relaxed">
                    Welcome. Dr. Meusburger is semi-retired and maintains limited office hours. 
                    {isOfficeDay 
                      ? <span className="font-bold text-green-700"> The doctor is IN today.</span> 
                      : <span className="font-medium text-stone-500"> The office is currently closed.</span>
                    } 
                    {" "}Use this secure voice assistant to manage refills, check policies, or request a callback.
                  </p>
                </div>

                <VoiceVisualizer 
                  status={status} 
                  audioLevel={audioLevel}
                  onStart={handleStart} 
                  onStop={handleStop} 
                />

                {/* Retell Phone Call Option - NEW */}
                <div className="bg-gradient-to-r from-stone-900 to-stone-800 rounded-xl p-6 text-white flex items-center justify-between shadow-lg relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-24 bg-teal-500/10 rounded-full blur-3xl -mr-12 -mt-12 group-hover:bg-teal-500/20 transition-all"></div>
                   <div className="relative z-10 flex items-center gap-4">
                      <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10">
                         <Phone className="w-6 h-6 text-teal-300" />
                      </div>
                      <div>
                         <h3 className="font-serif font-bold text-lg">Prefer to call via Phone?</h3>
                         <p className="text-stone-300 text-sm">Talk to our AI Agent on a real line.</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => setShowRetellConfig(true)}
                     className="relative z-10 px-6 py-3 bg-white text-stone-900 rounded-full font-bold text-sm hover:bg-teal-50 transition-colors shadow-md flex items-center gap-2"
                   >
                     <Smartphone className="w-4 h-4" />
                     {RETELL_PHONE_NUMBER} <span className="text-stone-400 font-normal">(Demo)</span>
                   </button>
                </div>

                {/* Disclaimer */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3 text-sm text-amber-900">
                  <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    <strong>Disclaimer:</strong> This automated system cannot provide medical diagnoses or emergency care. 
                    If you are experiencing a medical or psychiatric emergency, please hang up and dial 911 immediately.
                  </p>
                </div>
              </>
            ) : (
              // Telehealth View (Auth -> Session)
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-4">
                  <h2 className="text-2xl font-serif font-bold text-stone-900 flex items-center gap-2">
                    <Video className="w-6 h-6 text-teal-600" />
                    Telehealth Waiting Room
                  </h2>
                  <p className="text-stone-500">
                    {patientDetails ? "Secure connection established." : "Please verify your identity to continue."}
                  </p>
                </div>
                
                {/* Authentication Gate */}
                {!patientDetails ? (
                  <PatientAuthForm 
                    onComplete={(details) => setPatientDetails(details)}
                    onCancel={exitTelehealth}
                  />
                ) : (
                  <TelehealthSession 
                    patientDetails={patientDetails}
                    onEndCall={exitTelehealth} 
                  />
                )}
              </div>
            )}
          </div>

          {/* Sidebar Info (Right - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Telehealth Promo Card (Only visible if NOT in telehealth view) */}
            {view === 'assistant' && (
              <div className="bg-teal-900 text-white rounded-2xl p-8 shadow-lg relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-32 bg-teal-800/50 rounded-full blur-3xl -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                 <div className="relative z-10">
                   <div className="w-12 h-12 bg-teal-700 rounded-xl flex items-center justify-center mb-4 shadow-inner">
                      <Stethoscope className="w-6 h-6 text-white" />
                   </div>
                   <h3 className="text-xl font-serif font-bold mb-2">Scheduled Video Visit?</h3>
                   <p className="text-teal-100 text-sm mb-6 leading-relaxed">
                     If you have a confirmed appointment with Dr. Meusburger today, please enter the access code to join the session.
                   </p>
                   <button 
                     onClick={enterTelehealth}
                     className="w-full py-3 bg-white text-teal-900 font-semibold rounded-lg hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                   >
                     <Video className="w-4 h-4" />
                     Enter Waiting Room
                   </button>
                 </div>
              </div>
            )}

            {/* Practice Facts Card */}
            <div className="bg-white rounded-2xl border border-stone-200 p-8 shadow-sm">
               <h3 className="text-lg font-serif font-bold text-stone-900 mb-6 border-b border-stone-100 pb-4">
                 Practice Information
               </h3>
               <ul className="space-y-5">
                 <li className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                     <FileText className="w-5 h-5 text-teal-700" />
                   </div>
                   <div>
                     <h4 className="font-semibold text-stone-900">Prescription Refills</h4>
                     <p className="text-sm text-stone-500 leading-relaxed mt-1">
                       Routine refills must be requested before you run out. We do not contact pharmacies directly.
                     </p>
                   </div>
                 </li>
                 <li className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center shrink-0">
                     <Calendar className="w-5 h-5 text-teal-700" />
                   </div>
                   <div>
                     <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-stone-900">Appointments</h4>
                        {/* New Visual Badge for Wednesday Schedule */}
                        <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-wide border border-stone-200">
                            Wednesdays Only
                        </span>
                     </div>
                     <p className="text-sm text-stone-500 leading-relaxed mt-1">
                       Dr. Meusburger sees patients one day per week. Please use the voice assistant to request scheduling.
                     </p>
                   </div>
                 </li>
                 <li className="flex gap-4">
                   <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                     <Phone className="w-5 h-5 text-red-600" />
                   </div>
                   <div>
                     <h4 className="font-semibold text-stone-900">Crisis Resources</h4>
                     <p className="text-sm text-stone-500 leading-relaxed mt-1">
                       <strong>Emergency:</strong> 911<br/>
                       <strong>Suicide & Crisis Lifeline:</strong> Call or Text 988
                     </p>
                   </div>
                 </li>
               </ul>
            </div>

            {/* Interaction Log (Only show in Assistant View) */}
            {view === 'assistant' && logs.length > 0 && (
              <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-sm overflow-hidden">
                 <h3 className="text-sm font-bold text-stone-400 uppercase tracking-wider mb-4 flex justify-between items-center">
                   <span>Session History</span>
                   <span className="w-2 h-2 rounded-full bg-green-500"></span>
                 </h3>
                 <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                   {logs.map((log, idx) => (
                     <div key={idx} className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-sm">
                        <div className="flex justify-between items-start mb-3">
                           <span className="font-semibold text-stone-700 font-serif">
                             {log.intent || "General Inquiry"}
                           </span>
                           <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                             log.risk_level === 'high' ? 'bg-red-100 text-red-700' : 'bg-teal-100 text-teal-800'
                           }`}>
                             {log.risk_level} Risk
                           </span>
                        </div>
                        <p className="text-stone-600 mb-3 leading-relaxed">{log.summary}</p>
                        <div className="flex items-center gap-2 text-xs text-stone-400 border-t border-stone-200 pt-3">
                          <ChevronRight className="w-3 h-3" />
                          <span>Action: {log.next_step}</span>
                        </div>
                     </div>
                   ))}
                 </div>
              </div>
            )}
            
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-stone-200 py-12 mt-auto">
        <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8 text-sm text-stone-500">
          <div>
            <h5 className="font-serif font-bold text-stone-900 mb-4">Dr. Charles Meusburger</h5>
            <p>Dedicated to compassionate, safe psychiatric care for over 30 years.</p>
          </div>
          <div>
            <h5 className="font-serif font-bold text-stone-900 mb-4">Office Hours</h5>
            <p>Limited Availability (1 Day/Week)</p>
            <p className="mt-2">
              <span className={`inline-block w-2 h-2 rounded-full mr-2 ${isOfficeDay ? 'bg-green-500 animate-pulse' : 'bg-stone-400'}`}></span>
              {isOfficeDay ? 'Currently IN OFFICE' : 'Currently CLOSED'}
            </p>
            <p className="mt-1">Please allow 24-48 hours for administrative responses.</p>
            
            {/* Developer Trigger for Retell Config */}
            <button 
              onClick={() => setShowRetellConfig(true)}
              className="mt-4 flex items-center gap-2 text-xs text-stone-400 hover:text-teal-700 transition-colors"
            >
              <Settings className="w-3 h-3" />
              Developer: Retell Config
            </button>
          </div>
          <div>
             <h5 className="font-serif font-bold text-stone-900 mb-4">Secure System</h5>
             <p>&copy; {new Date().getFullYear()} Patient Safety Portal.</p>
             <p className="text-xs mt-2 opacity-70">Powered by Gemini Native Audio (Secure Preview)</p>
          </div>
        </div>
      </footer>
    </div>
  );
}