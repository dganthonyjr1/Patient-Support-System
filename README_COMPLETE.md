# Dr. Charles Meusburger Patient Support System

A comprehensive, HIPAA-compliant patient support platform featuring voice AI assistance, secure messaging, payment processing, and integrated healthcare management.

## Features

### 🎤 Voice AI Assistant
- **Google Gemini Live API** integration for real-time voice conversations
- **Multi-language support** (English, Spanish, Italian, German, Portuguese, Mandarin)
- **Natural conversation flow** with context awareness
- **Patient safety protocols** with crisis detection
- **Automated logging** of interactions for compliance

### 💬 Secure Patient Messaging
- **Updox integration** for HIPAA-compliant messaging
- **Real-time conversations** with patients
- **File attachments** support (documents, images, PDFs)
- **Appointment notifications** with confirmation codes
- **Prescription refill requests** management
- **Patient portal access** for self-service

### 💳 Payment Processing
- **Stripe integration** for secure credit card processing
- **Custom appointment fees** configuration
- **Processing fee management** (percentage + fixed)
- **Automatic QuickBooks sync** for accounting
- **Payment history tracking** and reporting
- **Patient receipt generation**

### 📊 QuickBooks Online Integration
- **Automatic payment syncing** to QB
- **Invoice creation** for appointments
- **Customer record management**
- **Financial reporting** integration
- **Real-time transaction tracking**

### 📅 Appointment Management
- **Automated reminders** via Updox
- **Confirmation tracking** with codes
- **Rescheduling support**
- **No-show prevention**
- **Calendar integration**

### 🔐 Security & Compliance
- **HIPAA-compliant** architecture
- **End-to-end encryption** for messages
- **Role-based access control**
- **Audit logging** of all activities
- **Secure authentication** (OAuth 2.0)
- **PCI DSS compliance** (Stripe)

## Technology Stack

### Frontend
- **React 19** with TypeScript
- **Vite** for fast builds
- **Tailwind CSS** for styling
- **Lucide React** for icons
- **Stripe Elements** for payment UI
- **Google Genai SDK** for voice

### Backend
- **Express.js** for API server
- **Stripe SDK** for payments
- **Axios** for HTTP requests
- **CORS** for cross-origin support
- **Environment variables** for configuration

### External Services
- **Google Gemini Live API** - Voice AI
- **Stripe** - Payment processing
- **QuickBooks Online** - Accounting
- **Updox** - Secure messaging
- **Google Cloud Run** - Deployment

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- API keys for:
  - Google Gemini
  - Stripe
  - QuickBooks Online
  - Updox

### Installation

```bash
# Clone the repository
git clone https://github.com/dganthonyjr1/Patient-Support-System.git
cd Patient-Support-System

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your API keys
nano .env.local
```

### Running Locally

```bash
# Frontend only
npm run dev

# Full stack (frontend + backend)
npm run dev:all

# Production build
npm run build
```

## Configuration

### Environment Variables

Create `.env.local` with:

```env
# Gemini API
GEMINI_API_KEY=your_gemini_key

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...

# QuickBooks
REACT_APP_QUICKBOOKS_CLIENT_ID=your_client_id
REACT_APP_QUICKBOOKS_CLIENT_SECRET=your_secret
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_secret

# Updox
REACT_APP_UPDOX_ACCOUNT_ID=your_account_id
REACT_APP_UPDOX_USER_ID=your_user_id
REACT_APP_UPDOX_PASSWORD=your_password

# Server
PORT=3001
REACT_APP_API_URL=http://localhost:3001
```

See `.env.example` for all available options.

## Project Structure

```
.
├── components/
│   ├── VoiceVisualizer.tsx          # Audio visualization
│   ├── TelehealthSession.tsx        # Video calls
│   ├── PatientAuthForm.tsx          # Authentication
│   ├── PaymentCheckout.tsx          # Stripe payment UI
│   ├── FeeManagement.tsx            # Appointment fees
│   ├── UpdoxMessaging.tsx           # Secure messaging
│   └── UpdoxConversations.tsx       # Message management
├── services/
│   ├── geminiLiveService.ts         # Voice AI integration
│   ├── paymentService.ts            # Payment processing
│   └── updoxService.ts              # Secure messaging
├── utils/
│   └── audioUtils.ts                # Audio processing
├── App.tsx                          # Main application
├── server.ts                        # Backend API
├── updox-server.ts                  # Updox API routes
├── types.ts                         # TypeScript types
├── vite.config.ts                   # Vite configuration
├── SETUP_GUIDE.md                   # Setup instructions
├── UPDOX_INTEGRATION.md             # Updox guide
└── README.md                        # This file
```

## API Documentation

### Voice Assistant
- **POST** `/api/voice/start` - Start voice session
- **POST** `/api/voice/stop` - Stop voice session
- **GET** `/api/voice/logs` - Get interaction logs

### Payments
- **GET** `/api/appointment-fees` - List fees
- **POST** `/api/appointment-fees` - Create fee
- **POST** `/api/payments/create-intent` - Create payment
- **POST** `/api/payments/confirm` - Confirm payment
- **GET** `/api/payments/history` - Payment history

### QuickBooks
- **POST** `/api/quickbooks/authorize` - OAuth authorization
- **GET** `/api/quickbooks/status` - Connection status
- **POST** `/api/quickbooks/disconnect` - Disconnect

### Updox
- **POST** `/api/updox/authenticate` - Authenticate
- **POST** `/api/updox/messages/send` - Send message
- **GET** `/api/updox/conversations` - List conversations
- **POST** `/api/updox/notifications/appointment` - Send reminder
- **POST** `/api/updox/notifications/refill` - Send refill notice

## Usage Examples

### Send Appointment Reminder

```typescript
import UpdoxService from './services/updoxService';

const updox = new UpdoxService();

await updox.sendAppointmentNotification({
  conversationId: 'conv-123',
  patientId: 'patient-123',
  appointmentDate: '2026-02-15',
  appointmentTime: '14:00',
  appointmentType: 'Initial Consultation',
  providerName: 'Dr. Charles Meusburger',
  location: 'Dr. Meusburger\'s Office',
  confirmationCode: 'APT-12345',
  reminderType: 'initial',
});
```

### Process Payment

```typescript
import paymentService from './services/paymentService';

const { clientSecret, paymentIntentId } = 
  await paymentService.createPaymentIntent(
    'John Doe',
    'john@example.com',
    'Initial Consultation',
    '2026-02-15',
    15000 // $150 in cents
  );

// Confirm payment (automatically syncs to QB)
await paymentService.confirmPayment(paymentIntentId, stripeIntentId);
```

### Send Secure Message

```typescript
import UpdoxService from './services/updoxService';

const updox = new UpdoxService();

await updox.sendMessage(
  'patient-123',
  'Your prescription is ready for pickup at your pharmacy.'
);
```

## Deployment

### Deploy to Google Cloud Run

```bash
# Build Docker image
docker build -t dr-meusburger-patient-assistant .

# Push to Google Container Registry
docker tag dr-meusburger-patient-assistant \
  gcr.io/your-project/dr-meusburger-patient-assistant
docker push gcr.io/your-project/dr-meusburger-patient-assistant

# Deploy to Cloud Run
gcloud run deploy dr-meusburger-patient-assistant \
  --image gcr.io/your-project/dr-meusburger-patient-assistant \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,STRIPE_SECRET_KEY=your_key
```

### Deploy to Vercel (Frontend)

```bash
npm install -g vercel
vercel
```

## Testing

### Test Voice Assistant
1. Click "Start Conversation"
2. Grant microphone access
3. Speak naturally
4. Test various intents (refills, appointments, etc.)

### Test Payments
1. Go to Fee Management
2. Create test appointment fees
3. Use Stripe test card: `4242 4242 4242 4242`
4. Verify payment appears in QB

### Test Messaging
1. Create test patient in Updox
2. Send test message
3. Verify in Updox portal
4. Reply from portal
5. Verify reply in app

## Security Considerations

- ✅ HIPAA-compliant architecture
- ✅ End-to-end encryption for messages
- ✅ PCI DSS compliance for payments
- ✅ OAuth 2.0 for authentication
- ✅ Audit logging of all activities
- ✅ Automatic session timeouts
- ✅ Role-based access control
- ✅ Secure password storage

## Troubleshooting

### "Connection Unavailable" Error
```bash
# Ensure GEMINI_API_KEY is set
echo "GEMINI_API_KEY=your_key" >> .env.local
npm run dev
```

### Stripe Payment Fails
- Verify API keys are correct
- Use test keys for development
- Check test card: `4242 4242 4242 4242`

### Updox Messages Not Sending
- Verify credentials in `.env.local`
- Check patient ID exists in Updox
- Verify network connection

### QuickBooks Won't Connect
- Verify Client ID and Secret
- Check Redirect URI matches exactly
- Ensure realm ID is correct

## Support & Documentation

- **Setup Guide**: See `SETUP_GUIDE.md`
- **Updox Integration**: See `UPDOX_INTEGRATION.md`
- **API Documentation**: See inline comments in code
- **Stripe Docs**: https://stripe.com/docs
- **QuickBooks Docs**: https://developer.intuit.com/
- **Updox Docs**: https://developer.updox.com/

## License

Proprietary - Dr. Charles Meusburger Patient Support System

## Contact

For questions or support, contact:
- Email: support@meusburger-patient-system.com
- Phone: +1 (415) 555-0199
- Website: https://dr-meusburger.com

---

**Last Updated**: January 19, 2026
**Version**: 1.0.0
