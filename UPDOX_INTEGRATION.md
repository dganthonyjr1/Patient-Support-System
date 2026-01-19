# Updox Integration Guide

## Overview

This guide explains how to integrate Updox secure messaging into the Dr. Meusburger Patient Support System. Updox provides HIPAA-compliant secure messaging, appointment notifications, and prescription refill management.

## What is Updox?

Updox is a cloud-based patient engagement platform that enables:
- **Secure patient messaging** - HIPAA-compliant communication
- **Appointment notifications** - Automated reminders and confirmations
- **Prescription management** - Refill requests and tracking
- **Patient portal** - Secure access to medical information
- **Integration** - Works with EHR systems and other healthcare platforms

## Setup Instructions

### Step 1: Create Updox Account

1. Visit https://www.updox.com/
2. Click "Get Started" or "Sign Up"
3. Create your practice account
4. Verify your email and set up your profile

### Step 2: Get API Credentials

1. Log in to your Updox account
2. Navigate to **Settings > API & Integrations**
3. Click **Generate API Credentials**
4. You'll receive:
   - **Account ID** - Your unique account identifier
   - **User ID** - Your API user ID
   - **Password** - Your API password

### Step 3: Configure Environment Variables

Add your Updox credentials to `.env.local`:

```env
REACT_APP_UPDOX_ACCOUNT_ID=your_account_id_here
REACT_APP_UPDOX_USER_ID=your_user_id_here
REACT_APP_UPDOX_PASSWORD=your_password_here
```

### Step 4: Set Up Patient Portal

1. In Updox settings, configure your **Patient Portal**
2. Set your practice name and branding
3. Enable messaging features
4. Configure notification preferences
5. Set up appointment reminders

## Features

### 1. Secure Patient Messaging

**Frontend Component**: `UpdoxMessaging.tsx`

Allows real-time secure communication with patients:

```typescript
import { UpdoxMessaging } from './components/UpdoxMessaging';

<UpdoxMessaging 
  patientId="patient-123"
  patientName="John Doe"
  onClose={() => {}}
/>
```

**Features:**
- Send/receive encrypted messages
- File attachments (PDF, images, documents)
- Message history
- Read receipts
- HIPAA-compliant encryption

### 2. Conversation Management

**Frontend Component**: `UpdoxConversations.tsx`

Manage all patient conversations:

```typescript
import { UpdoxConversations } from './components/UpdoxConversations';

<UpdoxConversations 
  onSelectConversation={(patientId, patientName) => {
    // Handle conversation selection
  }}
/>
```

**Features:**
- View all active conversations
- Unread message count
- Last message preview
- Quick reply button
- Send notifications

### 3. Appointment Notifications

Send automated appointment reminders:

```typescript
const updoxService = new UpdoxService();

await updoxService.sendAppointmentNotification({
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

**Notification Types:**
- Initial appointment confirmation
- 24-hour reminder
- 1-hour reminder

### 4. Prescription Refill Notifications

Send refill requests to patients:

```typescript
await updoxService.sendRefillNotification(
  'patient-123',
  'Sertraline 50mg',
  3 // refills remaining
);
```

### 5. Patient Portal

Patients can access their portal at:

```
https://api.updoxhq.com/portal/{patientId}
```

Portal features:
- View appointment schedule
- Send messages
- Request prescription refills
- View medical records
- Download documents

## API Endpoints

### Authentication

**POST** `/api/updox/authenticate`
```json
{
  "accountId": "your_account_id",
  "userId": "your_user_id",
  "password": "your_password"
}
```

### Patients

**POST** `/api/updox/patients`
```json
{
  "sessionId": "session-123",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "phone": "555-0123",
  "dateOfBirth": "1990-01-15"
}
```

### Messaging

**POST** `/api/updox/messages/send`
```json
{
  "sessionId": "session-123",
  "patientId": "patient-123",
  "messageText": "Your appointment is confirmed...",
  "attachmentUrl": "https://..."
}
```

**GET** `/api/updox/conversations/{patientId}`
- Parameters: `sessionId`, `limit`, `offset`

**GET** `/api/updox/conversations`
- Parameters: `sessionId`, `limit`, `offset`

### Notifications

**POST** `/api/updox/notifications/appointment`
```json
{
  "sessionId": "session-123",
  "patientId": "patient-123",
  "appointmentDate": "2026-02-15",
  "appointmentTime": "14:00",
  "appointmentType": "Initial Consultation",
  "location": "Dr. Meusburger's Office",
  "confirmationCode": "APT-12345"
}
```

**POST** `/api/updox/notifications/refill`
```json
{
  "sessionId": "session-123",
  "patientId": "patient-123",
  "medicationName": "Sertraline 50mg",
  "refillsRemaining": 3
}
```

## Integration with Other Features

### With Payment System

When a patient makes a payment, send a confirmation:

```typescript
// After successful payment
await updoxService.sendMessage(
  patientId,
  `Payment received: $${amount}. Thank you!`
);
```

### With Voice Assistant

When the voice assistant handles a refill request:

```typescript
// In geminiLiveService.ts
if (intent === 'refill_request') {
  await updoxService.sendRefillNotification(
    patientId,
    medicationName,
    refillsRemaining
  );
}
```

### With QuickBooks

Sync patient communications to QuickBooks notes:

```typescript
// After sending message
await quickbooksService.addCustomerNote(
  customerId,
  `Updox message sent: ${messageText}`
);
```

## Security & Compliance

### HIPAA Compliance

- All messages are encrypted end-to-end
- Audit logs track all access
- Automatic session timeouts
- Role-based access control
- Secure password storage

### Best Practices

1. **Never log credentials** - Don't store API keys in logs
2. **Use HTTPS** - Always use secure connections
3. **Validate inputs** - Sanitize all user input
4. **Rotate credentials** - Change API passwords regularly
5. **Monitor access** - Review audit logs weekly
6. **Limit permissions** - Use least privilege principle

## Troubleshooting

### "Invalid Session" Error

**Solution**: Re-authenticate with Updox
```typescript
const accessToken = await updoxService.authenticate();
```

### Messages Not Sending

**Solution**: Check:
1. Patient ID is correct
2. API credentials are valid
3. Network connection is working
4. Message text is not empty

### Patient Portal Not Loading

**Solution**:
1. Verify patient ID exists in Updox
2. Check portal is enabled in settings
3. Clear browser cache
4. Try different browser

### Notifications Not Received

**Solution**:
1. Verify patient phone/email is correct
2. Check notification settings in Updox
3. Verify patient opted in to notifications
4. Check spam folder for emails

## Testing

### Test Messaging

1. Create a test patient in Updox
2. Send a test message
3. Verify message appears in portal
4. Reply from portal
5. Verify reply appears in app

### Test Notifications

1. Send test appointment notification
2. Verify patient receives message
3. Check message content is correct
4. Verify confirmation code is included

### Test Integration

```bash
# Start the server
npm run dev:all

# Test authentication
curl -X POST http://localhost:3001/api/updox/authenticate \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "your_id",
    "userId": "your_user",
    "password": "your_pass"
  }'

# Test sending message
curl -X POST http://localhost:3001/api/updox/messages/send \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session-123",
    "patientId": "patient-123",
    "messageText": "Test message"
  }'
```

## Support

For Updox support:
- Visit: https://www.updox.com/support
- Email: support@updox.com
- Phone: 1-855-UPDOX-99

For integration support:
- Check the troubleshooting section above
- Review API documentation
- Contact your system administrator

## Additional Resources

- [Updox API Documentation](https://developer.updox.com/)
- [HIPAA Compliance Guide](https://www.updox.com/hipaa)
- [Patient Portal Setup](https://www.updox.com/patient-portal)
- [Security Best Practices](https://www.updox.com/security)
