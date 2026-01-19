import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';
import { magicLinkService } from '../services/magicLinkService';

interface MagicLinkJoinProps {
  token: string;
  onSuccess: (appointmentId: string, patientName: string) => void;
  onError: (error: string) => void;
}

export const MagicLinkJoin: React.FC<MagicLinkJoinProps> = ({ token, onSuccess, onError }) => {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState('Verifying your appointment link...');
  const [appointmentDetails, setAppointmentDetails] = useState<any>(null);

  useEffect(() => {
    // Verify the magic link token
    const verification = magicLinkService.verifyToken(token);

    if (verification.valid && verification.appointmentId) {
      // Get appointment details
      const appointment = magicLinkService.getAppointmentFromToken(token);
      
      if (appointment) {
        setAppointmentDetails(appointment);
        setStatus('success');
        setMessage('Link verified! Joining your appointment...');
        
        // Auto-join after 2 seconds
        setTimeout(() => {
          onSuccess(verification.appointmentId!, appointment.patientName);
        }, 2000);
      } else {
        setStatus('error');
        setMessage('Could not find appointment details.');
        onError('Appointment not found');
      }
    } else {
      setStatus('error');
      setMessage(verification.error || 'Invalid or expired link');
      onError(verification.error || 'Invalid link');
    }
  }, [token, onSuccess, onError]);

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-teal-50 to-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header */}
        <div className="bg-teal-900 p-8 text-white text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-12 bg-teal-800 rounded-full blur-2xl -mr-6 -mt-6"></div>
          <div className="relative z-10">
            <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
              <ShieldCheck className="w-7 h-7 text-teal-300" />
            </div>
            <h2 className="text-2xl font-serif font-bold">Telehealth Access</h2>
            <p className="text-teal-200 text-sm mt-2">Secure Appointment Link</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            
            {/* Status Icon */}
            <div className="relative">
              {status === 'verifying' && (
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center animate-pulse">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
              )}
              
              {status === 'success' && (
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center animate-in scale-in duration-300">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              )}
              
              {status === 'error' && (
                <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
              )}
            </div>

            {/* Message */}
            <div className="text-center">
              <p className={`text-lg font-semibold ${
                status === 'success' ? 'text-green-700' :
                status === 'error' ? 'text-red-700' :
                'text-stone-700'
              }`}>
                {message}
              </p>
            </div>

            {/* Appointment Details (if success) */}
            {status === 'success' && appointmentDetails && (
              <div className="w-full bg-green-50 border border-green-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-stone-600">
                  <span className="font-semibold">Patient:</span> {appointmentDetails.patientName}
                </p>
                <p className="text-sm text-stone-600">
                  <span className="font-semibold">Time:</span> {new Date(appointmentDetails.appointmentTime).toLocaleString()}
                </p>
                <p className="text-sm text-stone-600">
                  <span className="font-semibold">Type:</span> {appointmentDetails.reason}
                </p>
              </div>
            )}

            {/* Error Details (if error) */}
            {status === 'error' && (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700 text-center">
                  Your link may have expired or is invalid. Please request a new appointment link from Dr. Meusburger's office.
                </p>
              </div>
            )}

            {/* Loading indicator text */}
            {status === 'verifying' && (
              <p className="text-xs text-stone-500 text-center">
                Please wait while we verify your appointment...
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-stone-50 px-8 py-4 border-t border-stone-200 text-center">
          <p className="text-xs text-stone-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3 h-3" />
            Secure HIPAA-Compliant Connection
          </p>
        </div>
      </div>
    </div>
  );
};
