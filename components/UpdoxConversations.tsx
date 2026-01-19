import React, { useState, useEffect } from 'react';
import { MessageSquare, Bell, Loader2, AlertCircle, CheckCircle, Calendar, Pill, RefreshCw } from 'lucide-react';
import UpdoxService, { UpdoxConversation, UpdoxAppointmentNotification } from '../services/updoxService';

interface UpdoxConversationsProps {
  onSelectConversation?: (patientId: string, patientName: string) => void;
}

export const UpdoxConversations: React.FC<UpdoxConversationsProps> = ({
  onSelectConversation,
}) => {
  const [conversations, setConversations] = useState<UpdoxConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationForm, setShowNotificationForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<UpdoxConversation | null>(null);
  const [notificationType, setNotificationType] = useState<'appointment' | 'refill'>('appointment');
  const [appointmentData, setAppointmentData] = useState({
    appointmentDate: '',
    appointmentTime: '',
    appointmentType: 'Initial Consultation',
    location: 'Dr. Meusburger\'s Office',
    confirmationCode: '',
  });
  const [refillData, setRefillData] = useState({
    medicationName: '',
    refillsRemaining: 0,
  });
  const [sendingNotification, setSendingNotification] = useState(false);
  const updoxService = useRef<UpdoxService | null>(null);

  const updoxServiceRef = React.useRef<UpdoxService | null>(null);

  useEffect(() => {
    // Initialize Updox service
    updoxServiceRef.current = new UpdoxService();
    loadConversations();

    // Refresh conversations every 30 seconds
    const interval = setInterval(loadConversations, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadConversations = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!updoxServiceRef.current) {
        throw new Error('Updox service not initialized');
      }

      const data = await updoxServiceRef.current.getConversations(50, 0);
      setConversations(data);

      const unread = await updoxServiceRef.current.getUnreadCount();
      setUnreadCount(unread);
    } catch (err: any) {
      setError(err.message || 'Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAppointmentNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !appointmentData.appointmentDate || !appointmentData.confirmationCode) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSendingNotification(true);
      setError(null);

      if (!updoxServiceRef.current) {
        throw new Error('Updox service not initialized');
      }

      const notification: UpdoxAppointmentNotification = {
        conversationId: selectedPatient.id,
        patientId: selectedPatient.patientId,
        appointmentDate: appointmentData.appointmentDate,
        appointmentTime: appointmentData.appointmentTime,
        appointmentType: appointmentData.appointmentType,
        providerName: 'Dr. Charles Meusburger',
        location: appointmentData.location,
        confirmationCode: appointmentData.confirmationCode,
        reminderType: 'initial',
      };

      await updoxServiceRef.current.sendAppointmentNotification(notification);

      setSuccess('Appointment notification sent successfully');
      setShowNotificationForm(false);
      setSelectedPatient(null);
      resetAppointmentData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send appointment notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const handleSendRefillNotification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !refillData.medicationName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSendingNotification(true);
      setError(null);

      if (!updoxServiceRef.current) {
        throw new Error('Updox service not initialized');
      }

      await updoxServiceRef.current.sendRefillNotification(
        selectedPatient.patientId,
        refillData.medicationName,
        refillData.refillsRemaining
      );

      setSuccess('Refill notification sent successfully');
      setShowNotificationForm(false);
      setSelectedPatient(null);
      resetRefillData();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send refill notification');
    } finally {
      setSendingNotification(false);
    }
  };

  const resetAppointmentData = () => {
    setAppointmentData({
      appointmentDate: '',
      appointmentTime: '',
      appointmentType: 'Initial Consultation',
      location: 'Dr. Meusburger\'s Office',
      confirmationCode: '',
    });
  };

  const resetRefillData = () => {
    setRefillData({
      medicationName: '',
      refillsRemaining: 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-teal-700" />
          <div>
            <h2 className="text-2xl font-bold text-stone-900">Patient Messages</h2>
            {unreadCount > 0 && (
              <p className="text-sm text-teal-600">{unreadCount} unread message(s)</p>
            )}
          </div>
        </div>
        <button
          onClick={loadConversations}
          disabled={loading}
          className="p-2 hover:bg-stone-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 text-stone-600 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-700">{success}</p>
        </div>
      )}

      {/* Notification Form */}
      {showNotificationForm && selectedPatient && (
        <div className="bg-stone-50 rounded-lg p-6 border border-stone-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-stone-900">
              Send {notificationType === 'appointment' ? 'Appointment' : 'Refill'} Notification
            </h3>
            <button
              onClick={() => {
                setShowNotificationForm(false);
                setSelectedPatient(null);
              }}
              className="text-stone-500 hover:text-stone-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="flex gap-4 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={notificationType === 'appointment'}
                onChange={() => setNotificationType('appointment')}
                className="w-4 h-4"
              />
              <span className="text-sm text-stone-700">Appointment</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={notificationType === 'refill'}
                onChange={() => setNotificationType('refill')}
                className="w-4 h-4"
              />
              <span className="text-sm text-stone-700">Refill</span>
            </label>
          </div>

          {notificationType === 'appointment' ? (
            <form onSubmit={handleSendAppointmentNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Appointment Date *
                  </label>
                  <input
                    type="date"
                    value={appointmentData.appointmentDate}
                    onChange={(e) =>
                      setAppointmentData({
                        ...appointmentData,
                        appointmentDate: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Appointment Time
                  </label>
                  <input
                    type="time"
                    value={appointmentData.appointmentTime}
                    onChange={(e) =>
                      setAppointmentData({
                        ...appointmentData,
                        appointmentTime: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Appointment Type
                  </label>
                  <select
                    value={appointmentData.appointmentType}
                    onChange={(e) =>
                      setAppointmentData({
                        ...appointmentData,
                        appointmentType: e.target.value,
                      })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  >
                    <option>Initial Consultation</option>
                    <option>Follow-up</option>
                    <option>Medication Review</option>
                    <option>Crisis Intervention</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Confirmation Code *
                  </label>
                  <input
                    type="text"
                    value={appointmentData.confirmationCode}
                    onChange={(e) =>
                      setAppointmentData({
                        ...appointmentData,
                        confirmationCode: e.target.value,
                      })
                    }
                    placeholder="e.g., APT-12345"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationForm(false);
                    setSelectedPatient(null);
                  }}
                  className="flex-1 px-4 py-2 border border-stone-300 text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      Send Appointment
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSendRefillNotification} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Medication Name *
                  </label>
                  <input
                    type="text"
                    value={refillData.medicationName}
                    onChange={(e) =>
                      setRefillData({
                        ...refillData,
                        medicationName: e.target.value,
                      })
                    }
                    placeholder="e.g., Sertraline 50mg"
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-stone-900 mb-2">
                    Refills Remaining
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={refillData.refillsRemaining}
                    onChange={(e) =>
                      setRefillData({
                        ...refillData,
                        refillsRemaining: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNotificationForm(false);
                    setSelectedPatient(null);
                  }}
                  className="flex-1 px-4 py-2 border border-stone-300 text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sendingNotification}
                  className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sendingNotification ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Pill className="w-4 h-4" />
                      Send Refill Notice
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Conversations List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      ) : conversations.length === 0 ? (
        <div className="bg-stone-50 rounded-lg p-8 text-center border border-stone-200">
          <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-600">No conversations yet</p>
          <p className="text-sm text-stone-500 mt-2">Patient messages will appear here</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className="bg-white rounded-lg p-4 border border-stone-200 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-stone-900">{conv.patientName}</h3>
                  <p className="text-xs text-stone-500">
                    {conv.patientEmail} • {conv.patientPhone}
                  </p>
                </div>
                {conv.unreadCount > 0 && (
                  <div className="bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                    {conv.unreadCount}
                  </div>
                )}
              </div>

              <p className="text-sm text-stone-600 mb-3 line-clamp-2">{conv.lastMessage}</p>

              <div className="flex items-center justify-between">
                <p className="text-xs text-stone-500">
                  {new Date(conv.lastMessageTime).toLocaleString()}
                </p>

                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectConversation?.(conv.patientId, conv.patientName)}
                    className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded transition-colors"
                  >
                    Reply
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPatient(conv);
                      setShowNotificationForm(true);
                    }}
                    className="px-3 py-1 bg-stone-200 hover:bg-stone-300 text-stone-900 text-xs font-semibold rounded transition-colors flex items-center gap-1"
                  >
                    <Bell className="w-3 h-3" />
                    Notify
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UpdoxConversations;
