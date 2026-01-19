import axios from 'axios';

export interface UpdoxMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'provider' | 'staff';
  recipientId: string;
  recipientName: string;
  messageText: string;
  messageType: 'text' | 'attachment';
  attachmentUrl?: string;
  attachmentName?: string;
  timestamp: string;
  readAt?: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface UpdoxConversation {
  id: string;
  patientId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  providerId: string;
  providerName: string;
  subject: string;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpdoxPatient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  mrn?: string; // Medical Record Number
  createdAt: string;
  updatedAt: string;
}

export interface UpdoxAppointmentNotification {
  conversationId: string;
  patientId: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  providerName: string;
  location: string;
  confirmationCode: string;
  reminderType: 'initial' | '24hour' | '1hour';
}

class UpdoxService {
  private apiBaseUrl: string;
  private accountId: string;
  private userId: string;
  private password: string;
  private accessToken: string | null = null;

  constructor(
    accountId: string = '',
    userId: string = '',
    password: string = ''
  ) {
    this.apiBaseUrl = 'https://api.updoxhq.com';
    this.accountId = accountId || process.env.REACT_APP_UPDOX_ACCOUNT_ID || '';
    this.userId = userId || process.env.REACT_APP_UPDOX_USER_ID || '';
    this.password = password || process.env.REACT_APP_UPDOX_PASSWORD || '';
  }

  /**
   * Authenticate with Updox API
   */
  async authenticate(): Promise<string> {
    try {
      const response = await axios.post(`${this.apiBaseUrl}/auth/login`, {
        accountId: this.accountId,
        userId: this.userId,
        password: this.password,
      });

      this.accessToken = response.data.accessToken;
      return this.accessToken;
    } catch (error) {
      console.error('Updox authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get or create a patient in Updox
   */
  async getOrCreatePatient(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    dateOfBirth: string
  ): Promise<UpdoxPatient> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/patients/create`,
        {
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error creating/getting patient:', error);
      throw error;
    }
  }

  /**
   * Send a message to a patient
   */
  async sendMessage(
    patientId: string,
    messageText: string,
    attachmentUrl?: string
  ): Promise<UpdoxMessage> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.post(
        `${this.apiBaseUrl}/messages/send`,
        {
          patientId,
          messageText,
          messageType: attachmentUrl ? 'attachment' : 'text',
          attachmentUrl,
          senderType: 'provider',
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get conversation history with a patient
   */
  async getConversation(patientId: string, limit: number = 50): Promise<UpdoxMessage[]> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(
        `${this.apiBaseUrl}/conversations/${patientId}/messages`,
        {
          params: { limit },
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error fetching conversation:', error);
      throw error;
    }
  }

  /**
   * Get all active conversations
   */
  async getConversations(limit: number = 50, offset: number = 0): Promise<UpdoxConversation[]> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.apiBaseUrl}/conversations`, {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markMessageAsRead(messageId: string): Promise<void> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      await axios.put(
        `${this.apiBaseUrl}/messages/${messageId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
    } catch (error) {
      console.error('Error marking message as read:', error);
      throw error;
    }
  }

  /**
   * Send appointment reminder/notification
   */
  async sendAppointmentNotification(
    notification: UpdoxAppointmentNotification
  ): Promise<UpdoxMessage> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const messageText = `
Appointment Reminder:
Date: ${notification.appointmentDate}
Time: ${notification.appointmentTime}
Type: ${notification.appointmentType}
Provider: ${notification.providerName}
Location: ${notification.location}
Confirmation Code: ${notification.confirmationCode}

Please reply to confirm your attendance or call our office if you have any questions.
      `.trim();

      const response = await axios.post(
        `${this.apiBaseUrl}/messages/send`,
        {
          patientId: notification.patientId,
          messageText,
          messageType: 'text',
          senderType: 'provider',
          metadata: {
            notificationType: 'appointment',
            appointmentDate: notification.appointmentDate,
            confirmationCode: notification.confirmationCode,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending appointment notification:', error);
      throw error;
    }
  }

  /**
   * Send prescription refill request notification
   */
  async sendRefillNotification(
    patientId: string,
    medicationName: string,
    refillsRemaining: number
  ): Promise<UpdoxMessage> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const messageText = `
Prescription Refill Request:
Medication: ${medicationName}
Refills Remaining: ${refillsRemaining}

Please contact our office to request a refill or reply to this message.
      `.trim();

      const response = await axios.post(
        `${this.apiBaseUrl}/messages/send`,
        {
          patientId,
          messageText,
          messageType: 'text',
          senderType: 'provider',
          metadata: {
            notificationType: 'refill',
            medicationName,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Error sending refill notification:', error);
      throw error;
    }
  }

  /**
   * Get unread message count
   */
  async getUnreadCount(): Promise<number> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const response = await axios.get(`${this.apiBaseUrl}/messages/unread/count`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });

      return response.data.count;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }

  /**
   * Upload file attachment
   */
  async uploadAttachment(file: File): Promise<string> {
    try {
      if (!this.accessToken) {
        await this.authenticate();
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${this.apiBaseUrl}/attachments/upload`, formData, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.attachmentUrl;
    } catch (error) {
      console.error('Error uploading attachment:', error);
      throw error;
    }
  }

  /**
   * Check if Updox is configured and accessible
   */
  async isConfigured(): Promise<boolean> {
    try {
      if (!this.accountId || !this.userId || !this.password) {
        return false;
      }

      await this.authenticate();
      return true;
    } catch (error) {
      console.error('Updox not configured:', error);
      return false;
    }
  }

  /**
   * Get patient portal link for secure access
   */
  getPatientPortalLink(patientId: string): string {
    return `${this.apiBaseUrl}/portal/${patientId}`;
  }
}

export default UpdoxService;
