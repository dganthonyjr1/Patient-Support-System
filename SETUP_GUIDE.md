# Dr. Meusburger Patient Support System - Setup Guide

## Overview

This is a comprehensive patient support system that includes:
- **Voice AI Assistant** powered by Google Gemini Live API
- **Payment Processing** with Stripe integration
- **QuickBooks Online Sync** for automatic payment recording
- **Custom Fee Management** for appointment pricing
- **Patient Portal** for secure access

## Prerequisites

- Node.js 18+ and npm
- Gemini API key
- Stripe account (for payment processing)
- QuickBooks Online account (for payment syncing)
- Git

## Step 1: Get Your API Keys

### 1.1 Gemini API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated key

### 1.2 Stripe API Keys

1. Go to https://dashboard.stripe.com/
2. Sign in or create an account
3. Navigate to Developers > API Keys
4. Copy your **Publishable Key** (starts with `pk_test_` or `pk_live_`)
5. Copy your **Secret Key** (starts with `sk_test_` or `sk_live_`)

### 1.3 QuickBooks Online Setup

1. Go to https://developer.intuit.com/
2. Create an app or use existing one
3. Get your **Client ID** and **Client Secret**
4. Set Redirect URI to: `http://localhost:3001/api/quickbooks/callback`
5. Note your **Realm ID** (Company ID)

## Step 2: Clone and Setup Project

```bash
# Clone the repository
git clone https://github.com/dganthonyjr1/Patient-Support-System.git
cd Patient-Support-System

# Install dependencies
npm install --legacy-peer-deps

# Copy environment template
cp .env.example .env.local
```

## Step 3: Configure Environment Variables

Edit `.env.local` with your API keys:

```env
# Gemini API
GEMINI_API_KEY=gen-lang-client-0281892177

# Stripe
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# API
REACT_APP_API_URL=http://localhost:3001

# QuickBooks
REACT_APP_QUICKBOOKS_CLIENT_ID=your_client_id
REACT_APP_QUICKBOOKS_CLIENT_SECRET=your_client_secret
REACT_APP_QUICKBOOKS_REDIRECT_URI=http://localhost:3000/quickbooks-callback
QUICKBOOKS_CLIENT_ID=your_client_id
QUICKBOOKS_CLIENT_SECRET=your_client_secret
QUICKBOOKS_REDIRECT_URI=http://localhost:3001/api/quickbooks/callback

# Server
PORT=3001
NODE_ENV=development
```

## Step 4: Run Locally

### Option A: Run Frontend Only (Gemini Voice Assistant)

```bash
npm run dev
```

Visit http://localhost:3000

### Option B: Run Full Stack (Frontend + Payment Backend)

```bash
npm run dev:all
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Step 5: Test the Application

### Test Voice Assistant

1. Click "Start Conversation"
2. Grant microphone access
3. Speak to the AI assistant
4. Test various intents (refills, appointments, etc.)

### Test Payment System

1. Go to Fee Management (Settings)
2. Create appointment fees:
   - **Initial Consultation**: $150 base fee
   - **Follow-up**: $100 base fee
3. Test payment flow (use Stripe test card: 4242 4242 4242 4242)

### Test QuickBooks Integration

1. Click "Connect QuickBooks"
2. Authorize the application
3. Make a test payment
4. Verify it appears in QuickBooks

## Step 6: Deploy to Production

### Deploy to Google Cloud Run

```bash
# Build the application
npm run build

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --legacy-peer-deps
COPY . .
RUN npm run build
EXPOSE 3000 3001
CMD ["npm", "run", "dev:all"]
EOF

# Deploy to Cloud Run
gcloud run deploy dr-meusburger-patient-assistant \
  --source . \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=your_key,STRIPE_SECRET_KEY=your_key
```

### Deploy to Vercel (Frontend Only)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel
```

## Architecture

### Frontend (React + TypeScript)

- **App.tsx**: Main application component
- **components/VoiceVisualizer.tsx**: Audio visualization
- **components/TelehealthSession.tsx**: Video call component
- **components/PaymentCheckout.tsx**: Stripe payment UI
- **components/FeeManagement.tsx**: Doctor fee configuration
- **services/geminiLiveService.ts**: Gemini Live API integration
- **services/paymentService.ts**: Payment API client

### Backend (Express.js)

- **server.ts**: Express server with API endpoints
- **Appointment Fees API**: CRUD operations for fee management
- **Payment API**: Stripe payment intent creation and confirmation
- **QuickBooks API**: OAuth and transaction syncing

## API Endpoints

### Appointment Fees
- `GET /api/appointment-fees` - Get all fees
- `POST /api/appointment-fees` - Create new fee
- `PUT /api/appointment-fees/:id` - Update fee
- `DELETE /api/appointment-fees/:id` - Delete fee

### Payments
- `POST /api/payments/create-intent` - Create Stripe payment intent
- `POST /api/payments/confirm` - Confirm payment and sync to QB
- `GET /api/payments/history` - Get payment history

### QuickBooks
- `POST /api/quickbooks/authorize` - OAuth authorization
- `GET /api/quickbooks/status` - Check connection status
- `POST /api/quickbooks/disconnect` - Disconnect account

## Troubleshooting

### "Connection Unavailable" Error

**Solution**: Ensure `GEMINI_API_KEY` is set in `.env.local`

```bash
echo "GEMINI_API_KEY=your_key" >> .env.local
npm run dev
```

### Stripe Payment Fails

**Solution**: Verify Stripe keys are correct and use test keys for development:
- Test Publishable: `pk_test_...`
- Test Secret: `sk_test_...`
- Test Card: `4242 4242 4242 4242`

### QuickBooks Won't Connect

**Solution**: 
1. Verify Client ID and Secret are correct
2. Check Redirect URI matches exactly
3. Ensure realm ID is set correctly
4. Try disconnecting and reconnecting

### Microphone Permission Denied

**Solution**: 
1. Check browser permissions
2. Clear site data and refresh
3. Try a different browser
4. Ensure HTTPS in production

## Security Considerations

1. **Never commit `.env.local`** - Use `.env.example` as template
2. **Use environment variables** for all secrets
3. **Enable HTTPS** in production
4. **Validate all inputs** on backend
5. **Use Stripe's PCI compliance** - never handle raw card data
6. **Rotate API keys** regularly
7. **Monitor payment logs** for suspicious activity

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check Stripe dashboard for payment errors
4. Check QuickBooks logs for sync issues

## License

Proprietary - Dr. Charles Meusburger Patient Support System
