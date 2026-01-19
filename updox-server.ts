// Add these endpoints to your existing server.ts file
// This file contains the Updox-specific API routes

import { Express, Request, Response } from 'express';
import axios from 'axios';

export function setupUpdoxRoutes(app: Express) {
  const UPDOX_API_BASE = 'https://api.updoxhq.com';

  // In-memory storage for Updox sessions (replace with database in production)
  let updoxSessions: Map<string, any> = new Map();

  // ===== UPDOX AUTHENTICATION =====

  app.post('/api/updox/authenticate', async (req: Request, res: Response) => {
    try {
      const { accountId, userId, password } = req.body;

      if (!accountId || !userId || !password) {
        return res.status(400).json({ error: 'Missing authentication credentials' });
      }

      // Authenticate with Updox
      const authResponse = await axios.post(`${UPDOX_API_BASE}/auth/login`, {
        accountId,
        userId,
        password,
      });

      const sessionId = Math.random().toString(36).substring(2, 11);
      updoxSessions.set(sessionId, {
        accountId,
        accessToken: authResponse.data.accessToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });

      res.json({
        sessionId,
        accessToken: authResponse.data.accessToken,
      });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX PATIENT ENDPOINTS =====

  app.post('/api/updox/patients', async (req: Request, res: Response) => {
    try {
      const { sessionId, firstName, lastName, email, phone, dateOfBirth } = req.body;
      const session = updoxSessions.get(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const response = await axios.post(
        `${UPDOX_API_BASE}/patients/create`,
        {
          firstName,
          lastName,
          email,
          phone,
          dateOfBirth,
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX MESSAGING ENDPOINTS =====

  app.post('/api/updox/messages/send', async (req: Request, res: Response) => {
    try {
      const { sessionId, patientId, messageText, attachmentUrl } = req.body;
      const session = updoxSessions.get(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const response = await axios.post(
        `${UPDOX_API_BASE}/messages/send`,
        {
          patientId,
          messageText,
          messageType: attachmentUrl ? 'attachment' : 'text',
          attachmentUrl,
          senderType: 'provider',
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/updox/conversations/:patientId', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;
      const { patientId } = req.params;
      const session = updoxSessions.get(sessionId as string);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const response = await axios.get(
        `${UPDOX_API_BASE}/conversations/${patientId}/messages`,
        {
          params: { limit: 50 },
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/updox/conversations', async (req: Request, res: Response) => {
    try {
      const { sessionId, limit = 50, offset = 0 } = req.query;
      const session = updoxSessions.get(sessionId as string);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const response = await axios.get(`${UPDOX_API_BASE}/conversations`, {
        params: { limit, offset },
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX NOTIFICATION ENDPOINTS =====

  app.post('/api/updox/notifications/appointment', async (req: Request, res: Response) => {
    try {
      const {
        sessionId,
        patientId,
        appointmentDate,
        appointmentTime,
        appointmentType,
        location,
        confirmationCode,
      } = req.body;
      const session = updoxSessions.get(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const messageText = `
Appointment Reminder:
Date: ${appointmentDate}
Time: ${appointmentTime}
Type: ${appointmentType}
Provider: Dr. Charles Meusburger
Location: ${location}
Confirmation Code: ${confirmationCode}

Please reply to confirm your attendance or call our office if you have any questions.
      `.trim();

      const response = await axios.post(
        `${UPDOX_API_BASE}/messages/send`,
        {
          patientId,
          messageText,
          messageType: 'text',
          senderType: 'provider',
          metadata: {
            notificationType: 'appointment',
            appointmentDate,
            confirmationCode,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/updox/notifications/refill', async (req: Request, res: Response) => {
    try {
      const { sessionId, patientId, medicationName, refillsRemaining } = req.body;
      const session = updoxSessions.get(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const messageText = `
Prescription Refill Request:
Medication: ${medicationName}
Refills Remaining: ${refillsRemaining}

Please contact our office to request a refill or reply to this message.
      `.trim();

      const response = await axios.post(
        `${UPDOX_API_BASE}/messages/send`,
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
            Authorization: `Bearer ${session.accessToken}`,
          },
        }
      );

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX FILE UPLOAD =====

  app.post('/api/updox/attachments/upload', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      const session = updoxSessions.get(sessionId);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      // In production, handle multipart file upload
      // For now, return a mock URL
      const attachmentUrl = `${process.env.API_URL || 'http://localhost:3001'}/attachments/${Math.random().toString(36).substring(7)}`;

      res.json({ attachmentUrl });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX UNREAD COUNT =====

  app.get('/api/updox/messages/unread/count', async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.query;
      const session = updoxSessions.get(sessionId as string);

      if (!session) {
        return res.status(401).json({ error: 'Invalid session' });
      }

      const response = await axios.get(`${UPDOX_API_BASE}/messages/unread/count`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      res.json(response.data);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // ===== UPDOX SESSION MANAGEMENT =====

  app.post('/api/updox/logout', (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body;
      updoxSessions.delete(sessionId);
      res.json({ message: 'Logged out successfully' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });
}

export default setupUpdoxRoutes;
