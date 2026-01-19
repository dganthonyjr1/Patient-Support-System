import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { AlertCircle, CheckCircle, Loader2, DollarSign } from 'lucide-react';
import paymentService, { AppointmentFee } from '../services/paymentService';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '');

interface PaymentCheckoutProps {
  appointmentType: string;
  appointmentDate: string;
  patientName: string;
  patientEmail: string;
  onPaymentComplete?: (paymentIntentId: string) => void;
  onCancel?: () => void;
}

const PaymentCheckoutForm: React.FC<PaymentCheckoutProps> = ({
  appointmentType,
  appointmentDate,
  patientName,
  patientEmail,
  onPaymentComplete,
  onCancel,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [appointmentFee, setAppointmentFee] = useState<AppointmentFee | null>(null);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const loadFee = async () => {
      try {
        const fees = await paymentService.getAppointmentFees();
        const fee = fees.find(f => f.appointmentType === appointmentType);
        if (fee) {
          setAppointmentFee(fee);
          const total = paymentService.calculateTotalWithFees(
            fee.baseFee,
            fee.processingFeePercentage,
            fee.processingFeeFixed
          );
          setTotalAmount(total);
        }
      } catch (err) {
        setError('Failed to load appointment fee. Please try again.');
      }
    };

    loadFee();
  }, [appointmentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements || !appointmentFee) {
      setError('Payment system not ready. Please refresh and try again.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create payment intent
      const { clientSecret, paymentIntentId } = await paymentService.createPaymentIntent(
        patientName,
        patientEmail,
        appointmentType,
        appointmentDate,
        totalAmount
      );

      // Confirm payment with Stripe
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: patientName,
            email: patientEmail,
          },
        },
      });

      if (stripeError) {
        setError(stripeError.message || 'Payment failed. Please try again.');
        setLoading(false);
        return;
      }

      if (paymentIntent?.status === 'succeeded') {
        // Confirm payment in backend and sync to QuickBooks
        await paymentService.confirmPayment(paymentIntentId, paymentIntent.id);
        setSuccess(true);
        if (onPaymentComplete) {
          onPaymentComplete(paymentIntentId);
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during payment processing.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-green-900 mb-2">Payment Successful!</h3>
        <p className="text-green-700 mb-4">
          Your appointment payment of ${paymentService.formatAmount(totalAmount)} has been processed.
        </p>
        <p className="text-sm text-green-600">
          A confirmation has been sent to {patientEmail}
        </p>
      </div>
    );
  }

  if (!appointmentFee) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 text-center">
        <AlertCircle className="w-8 h-8 text-amber-600 mx-auto mb-2" />
        <p className="text-amber-700">Loading appointment fee information...</p>
      </div>
    );
  }

  const baseFee = appointmentFee.baseFee;
  const percentageFee = (baseFee * appointmentFee.processingFeePercentage) / 100;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fee Breakdown */}
      <div className="bg-stone-50 rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-stone-600">Base Fee:</span>
          <span className="font-semibold text-stone-900">${paymentService.formatAmount(baseFee)}</span>
        </div>
        {percentageFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Processing Fee ({appointmentFee.processingFeePercentage}%):</span>
            <span className="font-semibold text-stone-900">${paymentService.formatAmount(percentageFee)}</span>
          </div>
        )}
        {appointmentFee.processingFeeFixed > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Fixed Processing Fee:</span>
            <span className="font-semibold text-stone-900">${paymentService.formatAmount(appointmentFee.processingFeeFixed)}</span>
          </div>
        )}
        <div className="border-t border-stone-200 pt-2 flex justify-between">
          <span className="font-bold text-stone-900">Total Amount:</span>
          <span className="font-bold text-lg text-teal-700">${paymentService.formatAmount(totalAmount)}</span>
        </div>
      </div>

      {/* Card Element */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-stone-900">Card Details</label>
        <div className="border border-stone-300 rounded-lg p-4 bg-white">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1c1917',
                  '::placeholder': {
                    color: '#a8a29e',
                  },
                },
                invalid: {
                  color: '#dc2626',
                },
              },
            }}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="flex-1 px-4 py-3 border border-stone-300 text-stone-900 font-semibold rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !stripe || !elements}
          className="flex-1 px-4 py-3 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="w-4 h-4" />
              Pay ${paymentService.formatAmount(totalAmount)}
            </>
          )}
        </button>
      </div>

      <p className="text-xs text-stone-500 text-center">
        Your payment information is securely processed by Stripe and will be automatically synced to QuickBooks.
      </p>
    </form>
  );
};

export const PaymentCheckout: React.FC<PaymentCheckoutProps> = (props) => {
  return (
    <Elements stripe={stripePromise}>
      <PaymentCheckoutForm {...props} />
    </Elements>
  );
};

export default PaymentCheckout;
