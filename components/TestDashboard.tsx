import React, { useState } from 'react';
import { Copy, Plus, Trash2, RefreshCw, ExternalLink, X } from 'lucide-react';
import { magicLinkService, MagicLinkToken, Appointment } from '../services/magicLinkService';

interface TestDashboardProps {
  onClose: () => void;
}

export const TestDashboard: React.FC<TestDashboardProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    patientName: 'John Doe',
    patientEmail: 'john@example.com',
    appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    reason: 'Scheduled Follow-up',
  });

  const [activeTokens, setActiveTokens] = useState<MagicLinkToken[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();

    const appointmentTime = new Date(formData.appointmentTime);
    const { appointment, magicLink, url } = magicLinkService.createAppointmentWithMagicLink(
      formData.patientName,
      formData.patientEmail,
      appointmentTime,
      formData.reason
    );

    setActiveTokens([magicLink, ...activeTokens]);

    // Reset form
    setFormData({
      patientName: '',
      patientEmail: '',
      appointmentTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      reason: 'Scheduled Follow-up',
    });
  };

  const handleCopyLink = (token: string) => {
    const url = magicLinkService.generateMagicLinkUrl(token);
    navigator.clipboard.writeText(url);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleOpenLink = (token: string) => {
    const url = magicLinkService.generateMagicLinkUrl(token);
    window.open(url, '_blank');
  };

  const handleRefresh = () => {
    magicLinkService.cleanupExpiredTokens();
    setActiveTokens(magicLinkService.getAllTokens());
  };

  const handleDeleteToken = (token: string) => {
    setActiveTokens(activeTokens.filter(t => t.token !== token));
  };

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-stone-200 bg-stone-50">
          <div>
            <h3 className="text-xl font-serif font-bold text-stone-900">Test Dashboard</h3>
            <p className="text-sm text-stone-500 mt-1">Generate magic links for testing</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          
          {/* Form Section */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
            <h4 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-teal-600" />
              Generate New Magic Link
            </h4>
            
            <form onSubmit={handleGenerateLink} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">Patient Name</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.patientEmail}
                    onChange={(e) => setFormData({ ...formData, patientEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">Appointment Time</label>
                  <input
                    type="datetime-local"
                    value={formData.appointmentTime}
                    onChange={(e) => setFormData({ ...formData, appointmentTime: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-2">Visit Type</label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option>Scheduled Follow-up</option>
                    <option>Medication Review</option>
                    <option>Urgent Consultation</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Generate Magic Link
              </button>
            </form>
          </div>

          {/* Active Links Section */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-semibold text-stone-900">Active Magic Links</h4>
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 text-xs text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Refresh
              </button>
            </div>

            {activeTokens.length === 0 ? (
              <div className="bg-stone-50 border border-stone-200 rounded-lg p-6 text-center">
                <p className="text-sm text-stone-500">No active magic links yet. Generate one above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeTokens.map((token) => (
                  <div
                    key={token.token}
                    className="bg-stone-50 border border-stone-200 rounded-lg p-4 space-y-3"
                  >
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-stone-500 font-semibold">Patient</p>
                        <p className="text-stone-900">{token.patientName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500 font-semibold">Email</p>
                        <p className="text-stone-900">{token.patientEmail}</p>
                      </div>
                    </div>

                    <div className="bg-white border border-stone-200 rounded p-3 font-mono text-xs text-stone-600 break-all">
                      {magicLinkService.generateMagicLinkUrl(token.token)}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyLink(token.token)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg transition-colors text-sm font-semibold ${
                          copied === token.token
                            ? 'bg-green-100 text-green-700'
                            : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                        }`}
                      >
                        <Copy className="w-4 h-4" />
                        {copied === token.token ? 'Copied!' : 'Copy Link'}
                      </button>

                      <button
                        onClick={() => handleOpenLink(token.token)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-teal-100 hover:bg-teal-200 text-teal-700 transition-colors text-sm font-semibold"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </button>

                      <button
                        onClick={() => handleDeleteToken(token.token)}
                        className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-xs text-stone-400">
                      Expires: {new Date(token.expiresAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
