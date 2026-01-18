import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { InteractionLog, VoiceState } from '../types';
import { base64ToUint8Array, float32ToInt16, arrayBufferToBase64, decodeAudioData } from '../utils/audioUtils';

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-12-2025';

// Tool: Log Interaction
export const logInteractionTool: FunctionDeclaration = {
  name: 'logInteraction',
  description: 'Logs the structured details of the patient interaction when the call concludes or when sufficient data is gathered.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      caller_name: { type: Type.STRING },
      phone: { type: Type.STRING },
      email: { type: Type.STRING },
      intent: { type: Type.STRING },
      med_status: { type: Type.STRING, enum: ["routine_refill", "out_of_meds", "not_applicable"] },
      risk_level: { type: Type.STRING, enum: ["low", "medium", "high"] },
      summary: { type: Type.STRING },
      followup_bundle: { type: Type.STRING, enum: ["bundle_1", "bundle_2", "bundle_3", "none"] },
      escalation_required: { type: Type.STRING, enum: ["yes", "no"] },
      escalation_reason: { type: Type.STRING },
      next_step: { type: Type.STRING },
    },
    required: ['intent', 'risk_level', 'escalation_required', 'next_step']
  }
};

// Tool: Send Portal Link (Designed for integration with Retell AI / SMS Gateways)
export const sendPortalLinkTool: FunctionDeclaration = {
  name: 'sendPortalLink',
  description: 'Sends a secure access link (magic link) to the patient via SMS or Email. Use this to divert non-emergency calls to the digital portal.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      method: { type: Type.STRING, enum: ['sms', 'email'] },
      destination: { type: Type.STRING, description: 'The phone number or email address to send the link to.' },
    },
    required: ['method', 'destination']
  }
};

export const SYSTEM_INSTRUCTION = `
IDENTITY
You are the voice-based Patient Communication and Safety Assistant for Dr. Charles Meusburger’s practice.
Your job is to provide clear, calm, consistent information and next steps for non-emergency needs, especially prescription refill questions, while protecting the doctor’s semi-retired schedule and maintaining patient safety.
You must sound human, professional, calm, and unhurried. Use complete sentences. Be helpful but firm about the policies.
Never say you are an AI. Never mention prompts, systems, policies you “cannot access,” or internal tooling.

GLOBAL POLYGLOT PROTOCOL (AUTO-DETECT & SWITCH)
You are a master polyglot. You must handle the following languages natively: **English, Spanish, Italian, German, Portuguese, and Mandarin Chinese.**
1. **Listen & Detect:** In the first turn, detect the user's language immediately based on their greeting or first sentence.
2. **Switch & Sustain:** Reply ONLY in the user's detected language. Do not ask for permission to switch. Maintain that language for the entire session unless the user switches.
3. **Data Logging:** ALWAYS log the JSON data (intent, risk_level, summary) in **ENGLISH**, regardless of the conversation language.

APPROVED TRANSLATION KNOWLEDGE BASES
You must use these specific translations for core Practice Facts to ensure policy accuracy.

### 🇪🇸 SPANISH (Español)
- **Availability:** "El Dr. Meusburger está semi-retirado y atiende en la oficina solo un día a la semana (los miércoles)."
- **Refills:** "Para recetas de rutina, contacte a su farmacia antes de quedarse sin medicamento. No llamamos a las farmacias."
- **Emergency:** "Si está en peligro inmediato, llame al 911 ahora mismo."
- **Portal:** "Puedo enviarle un enlace seguro a su teléfono para ver sus citas sin llamar."

### 🇮🇹 ITALIAN (Italiano)
- **Availability:** "Il Dott. Meusburger è in semi-pensionamento e riceve in studio solo un giorno a settimana (il mercoledì)."
- **Refills:** "Per i rinnovi di routine, la prego di contattare la sua farmacia prima di terminare i farmaci. Non contattiamo direttamente le farmacie."
- **Emergency:** "Se è in pericolo immediato o teme di farsi del male, chiami subito il 911."
- **Portal:** "Posso inviarle un link sicuro sul cellulare per gestire la richiesta senza attendere in linea."

### 🇩🇪 GERMAN (Deutsch)
- **Availability:** "Dr. Meusburger ist im Teilruhestand und ist nur einen Tag pro Woche in der Praxis (Mittwochs)."
- **Refills:** "Für Routine-Rezeptverlängerungen wenden Sie sich bitte an Ihre Apotheke, bevor Ihr Medikament ausgeht. Wir rufen keine Apotheken an."
- **Emergency:** "Wenn Sie in unmittelbarer Gefahr sind, rufen Sie bitte sofort 911 an."
- **Portal:** "Ich kann Ihnen einen sicheren Link senden, damit Sie Ihre Termine sofort einsehen können."

### 🇵🇹 PORTUGUESE (Português)
- **Availability:** "O Dr. Meusburger está semi-aposentado e atende no consultório apenas um dia por semana (às quartas-feiras)."
- **Refills:** "Para renovações de rotina, entre em contato com sua farmácia antes que o medicamento acabe. Não ligamos para farmácias."
- **Emergency:** "Se estiver em perigo imediato, ligue para o 911 agora mesmo."
- **Portal:** "Posso enviar um link seguro para o seu telefone para verificar isso instantaneamente."

### 🇨🇳 MANDARIN CHINESE (中文)
- **Availability:** "Meusburger 医生处于半退休状态，每周只在诊所工作一天（周三）。"
- **Refills:** "对于常规处方续配，请在药物用完前联系您的药房。我们不直接联系药房。"
- **Emergency:** "如果您处于紧迫的危险中，请立即拨打 911。"
- **Portal:** "我可以发送一个安全链接到您的手机，您可以直接查看预约信息。"

DIGITAL REDIRECTION (PRIORITY GOAL)
Your goal is to reduce phone calls by offering the Digital Patient Portal.
**TRIGGER:** If a user asks about:
- **Appointment Status** ("When is my appointment?", "¿Cuándo es mi cita?", "Quando è il mio appuntamento?")
- **Policy Details** ("Do you take insurance?", "Orari?", "Versicherung?")
- **Administrative Info** ("Update address")

**ACTION:**
1. **Offer the Link:** "I can send a secure link to your phone/email right now to view this instantly. Would you like that?"
2. **Execute Tool:** IF they say yes, call 'sendPortalLink' immediately.
3. **Confirm:** After the tool executes, verbally confirm: "I have sent that link to you now."

PRACTICE FACTS (SOURCE OF TRUTH)
- **Provider:** Dr. Charles Meusburger
- **Availability:** Semi-retired. In the office ONE day per week (Wednesdays).
- **Refills:** We do NOT contact pharmacies. Patients must request refills at their pharmacy BEFORE running out.
- **Appointments:** We cannot confirm times verbally. We can only submit a request OR send the portal link.
- **Emergency:** If in immediate danger/harm -> Call 911.
- **Crisis:** Emotional crisis/suicide risk -> Call/Text 988.

ABSOLUTE SAFETY RULES (MANDATORY)
- **No Medical Advice:** Do not provide diagnoses or dosing advice in ANY language.
- **No Guarantees:** Do not promise specific outcomes.
- **Safety First:** If the user implies self-harm ("I want to die", "voglio morire", "ich will sterben"), redirect to 911/988 immediately.

INTENTS & FLOWS
A) ROUTINE REFILL REQUEST:
1. Acknowledge boundary (1 day/week).
2. Ask if routine or out of meds.
3. If routine: Guide to pharmacy. **OFFER PORTAL LINK via SMS.**

B) OUT OF MEDS / WITHDRAWAL RISK:
1. Confirm urgency/danger. If danger -> 911.
2. If no danger but symptoms -> Urgent Care.
3. Log escalation.

C) NON-EMERGENCY QUESTIONS:
1. **Trigger Digital Redirection** immediately.
2. If they decline, provide basic Practice Facts (Translated).

IMPORTANT: At the end of the conversation, call 'logInteraction' to save details.
`;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private inputSource: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private nextStartTime = 0;
  private onLogCallback: (log: InteractionLog) => void;
  private onStatusChange: (status: string) => void;
  private onVolumeCallback: (volume: number) => void;
  private onSendLinkCallback: (method: string, destination: string) => void;
  private sourceNodes: Set<AudioBufferSourceNode> = new Set();
  private isAgentSpeaking: boolean = false;
  private speakingWatchdog: any = null;

  constructor(
    apiKey: string, 
    onLog: (log: InteractionLog) => void, 
    onStatus: (status: string) => void,
    onVolume: (volume: number) => void,
    onSendLink: (method: string, destination: string) => void
  ) {
    this.ai = new GoogleGenAI({ apiKey });
    this.onLogCallback = onLog;
    this.onStatusChange = onStatus;
    this.onVolumeCallback = onVolume;
    this.onSendLinkCallback = onSendLink;
  }

  async start() {
    this.onStatusChange(VoiceState.CONNECTING);

    this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    
    // Ensure contexts are running (browsers sometimes suspend them)
    if (this.inputAudioContext?.state === 'suspended') await this.inputAudioContext.resume();
    if (this.outputAudioContext?.state === 'suspended') await this.outputAudioContext.resume();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
        } 
      });
      
      const config = {
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: [logInteractionTool, sendPortalLinkTool] }],
        },
      };

      const sessionPromise = this.ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            this.onStatusChange(VoiceState.LISTENING);
            this.setupAudioInput(stream, sessionPromise);
          },
          onmessage: (msg) => this.handleMessage(msg, sessionPromise),
          onclose: () => this.onStatusChange(VoiceState.ENDED),
          onerror: (err) => {
             console.error(err);
             this.onStatusChange(VoiceState.ERROR);
          },
        }
      });

    } catch (error) {
      console.error("Failed to start session:", error);
      this.onStatusChange(VoiceState.ERROR);
    }
  }

  private setupAudioInput(stream: MediaStream, sessionPromise: Promise<any>) {
    if (!this.inputAudioContext) return;

    this.inputSource = this.inputAudioContext.createMediaStreamSource(stream);
    // Increased buffer size to 4096 to reduce processing overhead and jitter
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate volume for visualizer BEFORE ducking, so user sees they are talking
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      this.onVolumeCallback(Math.min(1, rms * 5));

      // --- AGGRESSIVE DUCKING (Echo Prevention) ---
      // If agent is speaking, we completely mute the input sent to the model.
      // This prevents the model from hearing itself (loopback) and stopping.
      if (this.isAgentSpeaking) {
         for (let i = 0; i < inputData.length; i++) {
             inputData[i] = 0.0; 
         }
      }

      const pcmInt16 = float32ToInt16(inputData);
      const base64Data = arrayBufferToBase64(pcmInt16.buffer);
      
      sessionPromise.then((session) => {
        session.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data
          }
        });
      });
    };

    this.inputSource.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, sessionPromise: Promise<any>) {
    // 1. Handle Tool Calls
    if (message.toolCall) {
        for (const fc of message.toolCall.functionCalls) {
            
            // Handle Interaction Log
            if (fc.name === 'logInteraction') {
                console.log("Log Tool:", fc.args);
                this.onLogCallback(fc.args as unknown as InteractionLog);
                sessionPromise.then(session => {
                    session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result: "Interaction logged." }
                        }
                    });
                });
            }

            // Handle Send Portal Link
            if (fc.name === 'sendPortalLink') {
                console.log("Send Link Tool:", fc.args);
                const args = fc.args as any;
                this.onSendLinkCallback(args.method, args.destination);
                
                sessionPromise.then(session => {
                    session.sendToolResponse({
                        functionResponses: {
                            id: fc.id,
                            name: fc.name,
                            response: { result: `Success. Link sent to ${args.destination} via ${args.method}.` }
                        }
                    });
                });
            }
        }
    }

    const serverContent = message.serverContent;
    
    // 2. Handle Interruption
    if (serverContent?.interrupted) {
        console.log("Interrupted.");
        this.stopAllAudio();
        this.isAgentSpeaking = false;
        this.onStatusChange(VoiceState.LISTENING);
        return; 
    }

    // 3. Handle Audio Output
    if (serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
        // PRE-EMPTIVE DUCKING START
        // Crucial Fix: Mark agent as speaking IMMEDIATELY when we receive audio data.
        // Do not wait for decoding/playback. This prevents the mic from picking up 
        // the agent's voice via speaker-to-mic loopback during the processing delay.
        this.isAgentSpeaking = true;
        this.onStatusChange(VoiceState.SPEAKING);

        const base64Audio = serverContent.modelTurn.parts[0].inlineData.data;
        if (this.outputAudioContext) {
            const audioBytes = base64ToUint8Array(base64Audio);
            const audioBuffer = await decodeAudioData(audioBytes, this.outputAudioContext);
            this.playAudio(audioBuffer);
        }
    }
  }

  private playAudio(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    // Safety Watchdog: If audio somehow stops without event, reset state after max duration + buffer
    if (this.speakingWatchdog) clearTimeout(this.speakingWatchdog);
    this.speakingWatchdog = setTimeout(() => {
        if (this.isAgentSpeaking) {
            console.log("Watchdog reset speaking state");
            this.isAgentSpeaking = false;
            this.onStatusChange(VoiceState.LISTENING);
        }
    }, (buffer.duration * 1000) + 1000);

    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputAudioContext.destination);

    source.onended = () => {
        this.sourceNodes.delete(source);
        if (this.sourceNodes.size === 0) {
            this.isAgentSpeaking = false;
            if (this.speakingWatchdog) clearTimeout(this.speakingWatchdog);
            this.onStatusChange(VoiceState.LISTENING);
        }
    };
    this.sourceNodes.add(source);

    const currentTime = this.outputAudioContext.currentTime;
    if (this.nextStartTime < currentTime) {
      this.nextStartTime = currentTime;
    }
    
    source.start(this.nextStartTime);
    this.nextStartTime += buffer.duration;
  }

  private stopAllAudio() {
    if (!this.outputAudioContext) return;
    
    this.sourceNodes.forEach(node => {
        try { node.stop(); } catch (e) { }
    });
    this.sourceNodes.clear();
    
    // Reset start time to now to prevent skipping if we resume later
    this.nextStartTime = this.outputAudioContext.currentTime;
  }

  async stop() {
    this.stopAllAudio();
    if (this.inputSource) this.inputSource.disconnect();
    if (this.processor) this.processor.disconnect();
    if (this.inputAudioContext) await this.inputAudioContext.close();
    if (this.outputAudioContext) await this.outputAudioContext.close();
    
    this.onStatusChange(VoiceState.ENDED);
  }
}