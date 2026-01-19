import React, { useState } from 'react';
import { ShieldCheck, User, Phone, Mail, ArrowRight, CheckCircle } from 'lucide-react';

interface PatientCheckInProps {
  onComplete: (details: { name: string; email: string; phone: string }) => void;
  onCancel: () => void;
}

export const PatientAuthForm: React.FC<PatientCheckInProps> = ({ onComplete, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!formData.email.trim()) {
      setError('Please enter your email');
      return;
    }
    if (!formData.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);

    // Simulate verification delay
    setTimeout(() => {
      onComplete(formData);
      setLoading(false);
    }, 1500);
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
          <h2 className="text-xl font-serif font-bold">Ready for Your Appointment?</h2>
          <p className="text-teal-200 text-xs mt-1">Quick Check-In</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-8 space-y-5">
        
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Full Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 placeholder-stone-400"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 placeholder-stone-400"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-bold text-stone-600 uppercase tracking-wider mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-stone-400" />
              </div>
              <input
                type="tel"
                required
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-stone-900 placeholder-stone-400"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-teal-800 hover:bg-teal-900 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${loading ? 'opacity-80 cursor-wait' : 'hover:scale-[1.02]'}`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                Continue to Telehealth
              </>
            )}
          </button>
          
          <button 
            type="button"
            onClick={onCancel}
            className="w-full mt-3 py-2 text-stone-500 text-sm hover:text-stone-800 transition-colors"
          >
            Cancel
          </button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 text-xs text-stone-400 bg-stone-50 py-3 rounded-lg">
          <ShieldCheck className="w-3 h-3" />
          <span>Secure HIPAA-Compliant Connection</span>
        </div>

      </form>
    </div>
  );
};
