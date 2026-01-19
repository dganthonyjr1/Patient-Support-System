import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, AlertCircle, CheckCircle, Paperclip, X } from 'lucide-react';
import UpdoxService, { UpdoxMessage, UpdoxConversation } from '../services/updoxService';

interface UpdoxMessagingProps {
  patientId: string;
  patientName: string;
  onClose?: () => void;
}

export const UpdoxMessaging: React.FC<UpdoxMessagingProps> = ({
  patientId,
  patientName,
  onClose,
}) => {
  const [messages, setMessages] = useState<UpdoxMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const updoxService = useRef<UpdoxService | null>(null);

  useEffect(() => {
    // Initialize Updox service
    updoxService.current = new UpdoxService();
    loadMessages();
  }, [patientId]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!updoxService.current) {
        throw new Error('Updox service not initialized');
      }

      const conversation = await updoxService.current.getConversation(patientId, 50);
      setMessages(conversation);
    } catch (err: any) {
      setError(err.message || 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newMessage.trim() && !attachmentFile) {
      return;
    }

    try {
      setSending(true);
      setError(null);

      if (!updoxService.current) {
        throw new Error('Updox service not initialized');
      }

      let attachmentUrl: string | undefined;

      // Upload attachment if provided
      if (attachmentFile) {
        setUploadingAttachment(true);
        attachmentUrl = await updoxService.current.uploadAttachment(attachmentFile);
        setUploadingAttachment(false);
      }

      // Send message
      const message = await updoxService.current.sendMessage(
        patientId,
        newMessage.trim(),
        attachmentUrl
      );

      setMessages([...messages, message]);
      setNewMessage('');
      setAttachmentFile(null);
      setSuccess('Message sent successfully');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setAttachmentFile(file);
      setError(null);
    }
  };

  const removeAttachment = () => {
    setAttachmentFile(null);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-stone-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-stone-200 bg-teal-50">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-teal-700" />
          <div>
            <h3 className="font-bold text-stone-900">Secure Message</h3>
            <p className="text-xs text-stone-600">{patientName}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-stone-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-stone-600" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <MessageSquare className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-stone-500">No messages yet</p>
              <p className="text-xs text-stone-400 mt-1">Start a conversation</p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderType === 'provider' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.senderType === 'provider'
                    ? 'bg-teal-600 text-white'
                    : 'bg-white border border-stone-200 text-stone-900'
                }`}
              >
                <p className="text-sm">{msg.messageText}</p>
                {msg.attachmentUrl && (
                  <a
                    href={msg.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs mt-2 block underline ${
                      msg.senderType === 'provider' ? 'text-teal-100' : 'text-teal-600'
                    }`}
                  >
                    📎 {msg.attachmentName || 'Attachment'}
                  </a>
                )}
                <p
                  className={`text-xs mt-1 ${
                    msg.senderType === 'provider' ? 'text-teal-100' : 'text-stone-500'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-200 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
          <p className="text-xs text-green-700">{success}</p>
        </div>
      )}

      {/* Attachment Preview */}
      {attachmentFile && (
        <div className="px-4 py-2 bg-stone-100 border-t border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paperclip className="w-4 h-4 text-stone-600" />
            <span className="text-xs text-stone-700">{attachmentFile.name}</span>
          </div>
          <button
            onClick={removeAttachment}
            className="p-1 hover:bg-stone-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-stone-600" />
          </button>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 bg-white">
        <div className="flex gap-2">
          <label className="flex items-center justify-center p-2 hover:bg-stone-100 rounded-lg cursor-pointer transition-colors">
            <Paperclip className="w-5 h-5 text-stone-600" />
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={uploadingAttachment || sending}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
          </label>

          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending || uploadingAttachment}
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none disabled:bg-stone-100"
          />

          <button
            type="submit"
            disabled={sending || uploadingAttachment || (!newMessage.trim() && !attachmentFile)}
            className="p-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {sending || uploadingAttachment ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        <p className="text-xs text-stone-500 mt-2">
          💡 All messages are HIPAA-compliant and securely encrypted
        </p>
      </form>
    </div>
  );
};

export default UpdoxMessaging;
