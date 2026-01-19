/**
 * Magic Link Authentication Service
 * Generates unique tokens for appointment access without requiring codes
 */

interface MagicLinkToken {
  token: string;
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  appointmentTime: Date;
  reason: string;
}

class MagicLinkService {
  private tokens: Map<string, MagicLinkToken> = new Map();
  private appointments: Map<string, Appointment> = new Map();

  /**
   * Generate a unique magic link token for an appointment
   */
  generateMagicLink(appointment: Appointment): MagicLinkToken {
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const magicLinkToken: MagicLinkToken = {
      token,
      appointmentId: appointment.id,
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail,
      expiresAt,
      used: false,
      createdAt: new Date(),
    };

    this.tokens.set(token, magicLinkToken);
    this.appointments.set(appointment.id, appointment);

    return magicLinkToken;
  }

  /**
   * Verify a magic link token
   */
  verifyToken(token: string): { valid: boolean; appointmentId?: string; error?: string } {
    const magicLinkToken = this.tokens.get(token);

    if (!magicLinkToken) {
      return { valid: false, error: 'Invalid or expired link' };
    }

    if (magicLinkToken.used) {
      return { valid: false, error: 'Link has already been used' };
    }

    if (new Date() > magicLinkToken.expiresAt) {
      return { valid: false, error: 'Link has expired' };
    }

    // Mark token as used
    magicLinkToken.used = true;
    this.tokens.set(token, magicLinkToken);

    return { valid: true, appointmentId: magicLinkToken.appointmentId };
  }

  /**
   * Get appointment details from token
   */
  getAppointmentFromToken(token: string): Appointment | null {
    const magicLinkToken = this.tokens.get(token);
    if (!magicLinkToken) return null;

    return this.appointments.get(magicLinkToken.appointmentId) || null;
  }

  /**
   * Generate a secure random token
   */
  private generateSecureToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 32; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  /**
   * Generate magic link URL
   */
  generateMagicLinkUrl(token: string, baseUrl: string = window.location.origin): string {
    return `${baseUrl}/join?token=${token}`;
  }

  /**
   * Create appointment and generate magic link
   */
  createAppointmentWithMagicLink(
    patientName: string,
    patientEmail: string,
    appointmentTime: Date,
    reason: string
  ): { appointment: Appointment; magicLink: MagicLinkToken; url: string } {
    const appointmentId = `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const appointment: Appointment = {
      id: appointmentId,
      patientName,
      patientEmail,
      appointmentTime,
      reason,
    };

    const magicLink = this.generateMagicLink(appointment);
    const url = this.generateMagicLinkUrl(magicLink.token);

    return { appointment, magicLink, url };
  }

  /**
   * Get all active tokens (for testing/admin)
   */
  getAllTokens(): MagicLinkToken[] {
    return Array.from(this.tokens.values()).filter(t => !t.used && new Date() <= t.expiresAt);
  }

  /**
   * Clear expired tokens
   */
  cleanupExpiredTokens(): void {
    const now = new Date();
    for (const [token, magicLinkToken] of this.tokens.entries()) {
      if (now > magicLinkToken.expiresAt) {
        this.tokens.delete(token);
      }
    }
  }
}

export const magicLinkService = new MagicLinkService();
export type { MagicLinkToken, Appointment };
