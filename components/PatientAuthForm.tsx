import React, { useState } from 'react';
import { ShieldCheck, User, Calendar, FileText, ArrowRight, Lock, KeyRound } from 'lucide-react';
import { PatientDetails } from '../types';

interface PatientAuthFormProps {
  onComplete: (details: PatientDetails) => void;
  onCancel: () => void;
}

export const PatientAuthForm: React.FC<PatientAuthFormProps> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState<PatientDetails>({
    name: '',
    dob: '',
    reason: '',
    accessCode: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Validate Access Code Format (Mock validation)
    if (formData.accessCode.length < 6) {
        setLoading(false);
        setError("Invalid Access Code. Please check your appointment confirmation.");
        return;
    }

    // Simulate secure handshake/validation delay
    setTimeout(() => {
      onComplete(formData);
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="bg-teal-900 p-6 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 bg-teal-800 rounded-full blur-2xl -mr-6 -mt-6"></div>
        <div className="relative z-10">
          <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-sm border border-white/20">
            <ShieldCheck className="w-6 h-6 text-teal-300" />
          </div>
          <h2 className="text-xl font-serif font-bold">Secure Patient Check-In</h2>
          <p className="text-teal-200 text-xs mt-1">Authorized Appointments Only</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 space-y-5">
        
        {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {error}
            </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
              Full Legal Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 placeholder-stone-400"
                placeholder="e.g. Jane Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
              Date of Birth
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="date"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900"
                value={formData.dob}
                onChange={(e) => setFormData({...formData, dob: e.target.value})}
              />
            </div>
          </div>

          <div>
             <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
               Appointment Access Code
             </label>
             <div className="relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                 <KeyRound className="h-5 w-5 text-teal-600" />
               </div>
               <input
                 type="text"
                 required
                 maxLength={10}
                 className="w-full pl-10 pr-4 py-3 bg-teal-50 border border-teal-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 font-mono tracking-widest placeholder-teal-300"
                 placeholder="######"
                 value={formData.accessCode}
                 onChange={(e) => setFormData({...formData, accessCode: e.target.value.toUpperCase()})}
               />
               <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                 <Lock className="h-4 w-4 text-teal-400" />
               </div>
             </div>
             <p className="text-[10px] text-stone-400 mt-1 ml-1">
               * Required. Provided by office staff for scheduled video visits.
             </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
              Type of Visit
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FileText className="h-5 w-5 text-stone-400" />
              </div>
              <select
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 appearance-none"
                value={formData.reason}
                onChange={(e) => setFormData({...formData, reason: e.target.value})}
              >
                <option value="" disabled>Select verified reason...</option>
                <option value="followup">Scheduled Follow-up</option>
                <option value="medication">Medication Review</option>
                <option value="crisis">Urgent Consultation</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02]'}`}
          >
            {loading ? 'Verifying Authorization...' : 'Authenticate & Join'}
            {!loading && <ArrowRight className="w-5 h-5" />}
          </button>
          
          <button 
            type="button"
            onClick={onCancel}
            className="w-full mt-3 py-2 text-stone-500 text-sm hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 text-xs text-stone-400 bg-stone-50 py-2 rounded-lg">
          <Lock className="w-3 h-3" />
          <span>Strictly Confidential & Encrypted</span>
        </div>

      </form>
    </div>
  );
};
