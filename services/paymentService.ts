import axios from 'axios';

export interface AppointmentFee {
  id: string;
  appointmentType: string;
  baseFee: number;
  processingFeePercentage: number; // e.g., 2.9 for 2.9%
  processingFeeFixed: number; // Fixed fee in cents
  createdAt: string;
  updatedAt: string;
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'succeeded' | 'failed';
  patientName: string;
  patientEmail: string;
  appointmentType: string;
  appointmentDate: string;
  stripePaymentIntentId: string;
  quickbooksTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuickBooksConfig {
  realmId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
}

class PaymentService {
  private apiBaseUrl: string;
  private stripePublishableKey: string;

  constructor(apiBaseUrl: string = '', stripeKey: string = '') {
    this.apiBaseUrl = apiBaseUrl || process.env.REACT_APP_API_URL || 'http://localhost:3001';
    this.stripePublishableKey = stripeKey || process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || '';
  }

  /**
   * Get all appointment fee configurations
   */
  async getAppointmentFees(): Promise<AppointmentFee[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/appointment-fees`);
      return response.data;
    } catch (error) {
      console.error('Error fetching appointment fees:', error);
      throw error;
    }
  }

  /**
   * Create or update an appointment fee configuration
   */
  async saveAppointmentFee(fee: Omit<AppointmentFee, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppointmentFee> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/api/appointment-fees`, fee);
      return response.data;
    } catch (error) {
      console.error('Error saving appointment fee:', error);
      throw error;
    }
  }

  /**
   * Update an existing appointment fee
   */
  async updateAppointmentFee(id: string, fee: Partial<AppointmentFee>): Promise<AppointmentFee> {
    try {
      const response = await axios.put(`${this.apiBaseUrl}/api/appointment-fees/${id}`, fee);
      return response.data;
    } catch (error) {
      console.error('Error updating appointment fee:', error);
      throw error;
    }
  }

  /**
   * Delete an appointment fee configuration
   */
  async deleteAppointmentFee(id: string): Promise<void> {
    try {
      await axios.delete(`${this.apiBaseUrl}/api/appointment-fees/${id}`);
    } catch (error) {
      console.error('Error deleting appointment fee:', error);
      throw error;
    }
  }

  /**
   * Create a Stripe payment intent for an appointment
   */
  async createPaymentIntent(
    patientName: string,
    patientEmail: string,
    appointmentType: string,
    appointmentDate: string,
    amount: number
  ): Promise<{ clientSecret: string; paymentIntentId: string }> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/api/payments/create-intent`, {
        patientName,
        patientEmail,
        appointmentType,
        appointmentDate,
        amount, // Amount in cents
      });
      return response.data;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Confirm a payment and sync to QuickBooks
   */
  async confirmPayment(
    paymentIntentId: string,
    stripePaymentIntentId: string
  ): Promise<PaymentIntent> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/api/payments/confirm`, {
        paymentIntentId,
        stripePaymentIntentId,
      });
      return response.data;
    } catch (error) {
      console.error('Error confirming payment:', error);
      throw error;
    }
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(limit: number = 50, offset: number = 0): Promise<PaymentIntent[]> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/payments/history`, {
        params: { limit, offset },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Calculate total amount including processing fees
   */
  calculateTotalWithFees(baseFee: number, processingFeePercentage: number, processingFeeFixed: number): number {
    const percentageFee = (baseFee * processingFeePercentage) / 100;
    return Math.round(baseFee + percentageFee + processingFeeFixed);
  }

  /**
   * Format amount for display (dollars)
   */
  formatAmount(amountInCents: number): string {
    return (amountInCents / 100).toFixed(2);
  }

  /**
   * Get QuickBooks authorization URL
   */
  getQuickBooksAuthUrl(): string {
    const clientId = process.env.REACT_APP_QUICKBOOKS_CLIENT_ID || '';
    const redirectUri = process.env.REACT_APP_QUICKBOOKS_REDIRECT_URI || '';
    const realm = process.env.REACT_APP_QUICKBOOKS_REALM_ID || '';

    return `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=com.intuit.quickbooks.accounting&redirect_uri=${redirectUri}&state=${realm}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthorizationCode(code: string, realmId: string): Promise<QuickBooksConfig> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/api/quickbooks/authorize`, {
        code,
        realmId,
      });
      return response.data;
    } catch (error) {
      console.error('Error exchanging authorization code:', error);
      throw error;
    }
  }

  /**
   * Check if QuickBooks is connected
   */
  async isQuickBooksConnected(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiBaseUrl}/api/quickbooks/status`);
      return response.data.connected;
    } catch (error) {
      console.error('Error checking QuickBooks status:', error);
      return false;
    }
  }

  /**
   * Disconnect QuickBooks
   */
  async disconnectQuickBooks(): Promise<void> {
    try {
      await axios.post(`${this.apiBaseUrl}/api/quickbooks/disconnect`);
    } catch (error) {
      console.error('Error disconnecting QuickBooks:', error);
      throw error;
    }
  }
}

export default new PaymentService();
