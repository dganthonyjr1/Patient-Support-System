import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, Trash2, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import paymentService, { AppointmentFee } from '../services/paymentService';

interface FeeManagementProps {
  onClose?: () => void;
}

export const FeeManagement: React.FC<FeeManagementProps> = ({ onClose }) => {
  const [fees, setFees] = useState<AppointmentFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    appointmentType: '',
    baseFee: 0,
    processingFeePercentage: 2.9,
    processingFeeFixed: 30,
  });

  useEffect(() => {
    loadFees();
  }, []);

  const loadFees = async () => {
    try {
      setLoading(true);
      const data = await paymentService.getAppointmentFees();
      setFees(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load appointment fees');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.appointmentType || formData.baseFee <= 0) {
      setError('Please fill in all required fields with valid values');
      return;
    }

    try {
      if (editingId) {
        await paymentService.updateAppointmentFee(editingId, formData);
        setSuccess('Appointment fee updated successfully');
      } else {
        await paymentService.saveAppointmentFee(formData);
        setSuccess('Appointment fee created successfully');
      }
      await loadFees();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Failed to save appointment fee');
    }
  };

  const handleEdit = (fee: AppointmentFee) => {
    setFormData({
      appointmentType: fee.appointmentType,
      baseFee: fee.baseFee,
      processingFeePercentage: fee.processingFeePercentage,
      processingFeeFixed: fee.processingFeeFixed,
    });
    setEditingId(fee.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this appointment fee?')) {
      return;
    }

    try {
      await paymentService.deleteAppointmentFee(id);
      setSuccess('Appointment fee deleted successfully');
      await loadFees();
    } catch (err: any) {
      setError(err.message || 'Failed to delete appointment fee');
    }
  };

  const resetForm = () => {
    setFormData({
      appointmentType: '',
      baseFee: 0,
      processingFeePercentage: 2.9,
      processingFeeFixed: 30,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const calculateTotal = (baseFee: number, percentageFee: number, fixedFee: number) => {
    const percentageAmount = (baseFee * percentageFee) / 100;
    return baseFee + percentageAmount + fixedFee;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-teal-700" />
          <h2 className="text-2xl font-bold text-stone-900">Appointment Fee Management</h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-700 text-2xl"
          >
            ×
          </button>
        )}
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

      {/* Form */}
      {showForm && (
        <div className="bg-stone-50 rounded-lg p-6 border border-stone-200">
          <h3 className="text-lg font-bold text-stone-900 mb-4">
            {editingId ? 'Edit Appointment Fee' : 'Create New Appointment Fee'}
          </h3>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Appointment Type *
                </label>
                <input
                  type="text"
                  value={formData.appointmentType}
                  onChange={(e) => setFormData({ ...formData, appointmentType: e.target.value })}
                  placeholder="e.g., Initial Consultation, Follow-up"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Base Fee ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.baseFee}
                  onChange={(e) => setFormData({ ...formData, baseFee: parseFloat(e.target.value) })}
                  placeholder="100.00"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Processing Fee (%) 
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.processingFeePercentage}
                  onChange={(e) => setFormData({ ...formData, processingFeePercentage: parseFloat(e.target.value) })}
                  placeholder="2.9"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
                <p className="text-xs text-stone-500 mt-1">Stripe standard: 2.9% + $0.30</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-900 mb-2">
                  Fixed Processing Fee ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.processingFeeFixed}
                  onChange={(e) => setFormData({ ...formData, processingFeeFixed: parseFloat(e.target.value) })}
                  placeholder="0.30"
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            {/* Total Preview */}
            <div className="bg-white rounded-lg p-4 border border-stone-200">
              <p className="text-sm text-stone-600 mb-2">Total Amount Patient Will Pay:</p>
              <p className="text-2xl font-bold text-teal-700">
                ${calculateTotal(formData.baseFee, formData.processingFeePercentage, formData.processingFeeFixed).toFixed(2)}
              </p>
              <p className="text-xs text-stone-500 mt-2">
                Base: ${formData.baseFee.toFixed(2)} + Processing: ${((formData.baseFee * formData.processingFeePercentage) / 100 + formData.processingFeeFixed).toFixed(2)}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-stone-300 text-stone-900 font-semibold rounded-lg hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors"
              >
                {editingId ? 'Update Fee' : 'Create Fee'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add New Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add New Appointment Fee
        </button>
      )}

      {/* Fees List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-teal-700" />
        </div>
      ) : fees.length === 0 ? (
        <div className="bg-stone-50 rounded-lg p-8 text-center border border-stone-200">
          <p className="text-stone-600">No appointment fees configured yet.</p>
          <p className="text-sm text-stone-500 mt-2">Create your first appointment fee to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {fees.map((fee) => (
            <div key={fee.id} className="bg-white rounded-lg p-6 border border-stone-200 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-stone-900">{fee.appointmentType}</h3>
                  <p className="text-sm text-stone-500">
                    Created on {new Date(fee.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(fee)}
                    className="p-2 text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(fee.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-stone-500 uppercase font-semibold">Base Fee</p>
                  <p className="text-lg font-bold text-stone-900">${fee.baseFee.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase font-semibold">Processing %</p>
                  <p className="text-lg font-bold text-stone-900">{fee.processingFeePercentage}%</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase font-semibold">Fixed Fee</p>
                  <p className="text-lg font-bold text-stone-900">${fee.processingFeeFixed.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 uppercase font-semibold">Total</p>
                  <p className="text-lg font-bold text-teal-700">
                    ${calculateTotal(fee.baseFee, fee.processingFeePercentage, fee.processingFeeFixed).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeeManagement;
