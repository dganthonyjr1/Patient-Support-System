import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import axios from 'axios';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3001;

// Stripe initialization
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for demo (replace with database in production)
interface AppointmentFee {
  id: string;
  appointmentType: string;
  baseFee: number;
  processingFeePercentage: number;
  processingFeeFixed: number;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  patientName: string;
  patientEmail: string;
  appointmentType: string;
  appointmentDate: string;
  stripePaymentIntentId: string;
  quickbooksTransactionId?: string;
  createdAt: string;
  updatedAt: string;
}

let appointmentFees: AppointmentFee[] = [
  {
    id: '1',
    appointmentType: 'Initial Consultation',
    baseFee: 15000, // $150 in cents
    processingFeePercentage: 2.9,
    processingFeeFixed: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: '2',
    appointmentType: 'Follow-up',
    baseFee: 10000, // $100 in cents
    processingFeePercentage: 2.9,
    processingFeeFixed: 30,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let paymentRecords: PaymentRecord[] = [];
let quickbooksConfig: any = null;

// Helper function to generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 11);

// ===== APPOINTMENT FEES ENDPOINTS =====

app.get('/api/appointment-fees', (req: Request, res: Response) => {
  res.json(appointmentFees);
});

app.post('/api/appointment-fees', (req: Request, res: Response) => {
  const { appointmentType, baseFee, processingFeePercentage, processingFeeFixed } = req.body;

  if (!appointmentType || !baseFee) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const newFee: AppointmentFee = {
    id: generateId(),
    appointmentType,
    baseFee,
    processingFeePercentage,
    processingFeeFixed,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  appointmentFees.push(newFee);
  res.status(201).json(newFee);
});

app.put('/api/appointment-fees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const feeIndex = appointmentFees.findIndex(f => f.id === id);

  if (feeIndex === -1) {
    return res.status(404).json({ error: 'Appointment fee not found' });
  }

  appointmentFees[feeIndex] = {
    ...appointmentFees[feeIndex],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  res.json(appointmentFees[feeIndex]);
});

app.delete('/api/appointment-fees/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  appointmentFees = appointmentFees.filter(f => f.id !== id);
  res.status(204).send();
});

// ===== PAYMENT ENDPOINTS =====

app.post('/api/payments/create-intent', async (req: Request, res: Response) => {
  try {
    const { patientName, patientEmail, appointmentType, appointmentDate, amount } = req.body;

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        patientName,
        patientEmail,
        appointmentType,
        appointmentDate,
      },
    });

    const paymentRecord: PaymentRecord = {
      id: generateId(),
      amount,
      currency: 'usd',
      status: 'pending',
      patientName,
      patientEmail,
      appointmentType,
      appointmentDate,
      stripePaymentIntentId: paymentIntent.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    paymentRecords.push(paymentRecord);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentRecord.id,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/payments/confirm', async (req: Request, res: Response) => {
  try {
    const { paymentIntentId, stripePaymentIntentId } = req.body;

    const paymentIndex = paymentRecords.findIndex(p => p.id === paymentIntentId);
    if (paymentIndex === -1) {
      return res.status(404).json({ error: 'Payment record not found' });
    }

    // Update payment status
    paymentRecords[paymentIndex].status = 'succeeded';
    paymentRecords[paymentIndex].updatedAt = new Date().toISOString();

    // Sync to QuickBooks if connected
    if (quickbooksConfig) {
      try {
        await syncPaymentToQuickBooks(paymentRecords[paymentIndex]);
      } catch (qbError) {
        console.error('QuickBooks sync error:', qbError);
        // Don't fail the payment if QB sync fails
      }
    }

    res.json(paymentRecords[paymentIndex]);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/payments/history', (req: Request, res: Response) => {
  const { limit = 50, offset = 0 } = req.query;
  const start = parseInt(offset as string) || 0;
  const end = start + (parseInt(limit as string) || 50);

  res.json(paymentRecords.slice(start, end));
});

// ===== QUICKBOOKS ENDPOINTS =====

app.post('/api/quickbooks/authorize', async (req: Request, res: Response) => {
  try {
    const { code, realmId } = req.body;

    // Exchange authorization code for tokens
    const tokenResponse = await axios.post('https://oauth.platform.intuit.com/oauth2/tokens/bearer', 
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.QUICKBOOKS_REDIRECT_URI || '',
      }),
      {
        auth: {
          username: process.env.QUICKBOOKS_CLIENT_ID || '',
          password: process.env.QUICKBOOKS_CLIENT_SECRET || '',
        },
      }
    );

    quickbooksConfig = {
      realmId,
      accessToken: tokenResponse.data.access_token,
      refreshToken: tokenResponse.data.refresh_token,
      tokenExpiresAt: new Date(Date.now() + tokenResponse.data.expires_in * 1000).toISOString(),
    };

    res.json(quickbooksConfig);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/quickbooks/status', (req: Request, res: Response) => {
  res.json({
    connected: !!quickbooksConfig,
    realmId: quickbooksConfig?.realmId,
  });
});

app.post('/api/quickbooks/disconnect', (req: Request, res: Response) => {
  quickbooksConfig = null;
  res.json({ message: 'QuickBooks disconnected' });
});

// Helper function to sync payment to QuickBooks
async function syncPaymentToQuickBooks(payment: PaymentRecord) {
  if (!quickbooksConfig) {
    throw new Error('QuickBooks not connected');
  }

  try {
    // Create an invoice or sales receipt in QuickBooks
    const qbPayload = {
      Line: [
        {
          DetailType: 'SalesItemLineDetail',
          Amount: payment.amount / 100, // Convert cents to dollars
          SalesItemLineDetail: {
            ItemRef: {
              value: '1', // Replace with actual item ID
            },
            Qty: 1,
            UnitPrice: payment.amount / 100,
          },
          Description: `${payment.appointmentType} - ${payment.patientName}`,
        },
      ],
      CustomerRef: {
        value: '1', // Replace with actual customer ID or create new
      },
      TxnDate: new Date().toISOString().split('T')[0],
    };

    const qbResponse = await axios.post(
      `https://quickbooks.api.intuit.com/v2/company/${quickbooksConfig.realmId}/invoice`,
      qbPayload,
      {
        headers: {
          Authorization: `Bearer ${quickbooksConfig.accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Store QuickBooks transaction ID
    const paymentIndex = paymentRecords.findIndex(p => p.id === payment.id);
    if (paymentIndex !== -1) {
      paymentRecords[paymentIndex].quickbooksTransactionId = qbResponse.data.Invoice.Id;
    }

    return qbResponse.data;
  } catch (error) {
    console.error('Error syncing to QuickBooks:', error);
    throw error;
  }
}

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Start server
app.listen(port, () => {
  console.log(`Payment server running on port ${port}`);
});

export default app;
