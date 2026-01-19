# Deployment Checklist

## Pre-Deployment

### 1. Environment Configuration
- [ ] Copy `.env.example` to `.env.local`
- [ ] Add GEMINI_API_KEY
- [ ] Add STRIPE_SECRET_KEY and REACT_APP_STRIPE_PUBLISHABLE_KEY
- [ ] Add QUICKBOOKS credentials (Client ID, Secret, Realm ID)
- [ ] Add UPDOX credentials (Account ID, User ID, Password)
- [ ] Set REACT_APP_API_URL to production URL
- [ ] Verify all environment variables are set

### 2. Security Review
- [ ] Verify no API keys are committed to git
- [ ] Check `.gitignore` includes `.env.local`
- [ ] Review CORS settings for production domain
- [ ] Verify HTTPS is enabled
- [ ] Check authentication mechanisms
- [ ] Review data encryption settings

### 3. Testing
- [ ] Test voice assistant functionality
- [ ] Test payment processing (use Stripe test cards)
- [ ] Test Updox messaging
- [ ] Test QuickBooks sync
- [ ] Test appointment fee management
- [ ] Test error handling
- [ ] Test on multiple browsers
- [ ] Test on mobile devices

### 4. Documentation
- [ ] Update README with production URLs
- [ ] Document API endpoints
- [ ] Create runbook for common issues
- [ ] Document backup procedures
- [ ] Create disaster recovery plan

## Deployment Steps

### 1. Build Application
```bash
npm run build
```
- [ ] Build completes without errors
- [ ] All files generated in `dist/` directory
- [ ] No TypeScript errors
- [ ] No console warnings

### 2. Deploy to Cloud Run
```bash
# Set up gcloud CLI
gcloud config set project YOUR_PROJECT_ID

# Build and push image
docker build -t dr-meusburger-patient-assistant .
docker tag dr-meusburger-patient-assistant \
  gcr.io/YOUR_PROJECT/dr-meusburger-patient-assistant
docker push gcr.io/YOUR_PROJECT/dr-meusburger-patient-assistant

# Deploy
gcloud run deploy dr-meusburger-patient-assistant \
  --image gcr.io/YOUR_PROJECT/dr-meusburger-patient-assistant \
  --platform managed \
  --region us-west1 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY=YOUR_KEY,STRIPE_SECRET_KEY=YOUR_KEY
```

- [ ] Cloud Run deployment successful
- [ ] Service URL accessible
- [ ] Health check passes
- [ ] Logs show no errors

### 3. Configure Domain
- [ ] Set custom domain in Cloud Run
- [ ] Configure SSL certificate
- [ ] Test HTTPS access
- [ ] Verify SSL certificate is valid

### 4. Configure External Services

#### Stripe
- [ ] Webhook endpoints configured
- [ ] Webhook signing secret saved
- [ ] Test mode keys verified
- [ ] Production keys ready

#### QuickBooks
- [ ] OAuth redirect URI updated
- [ ] Realm ID verified
- [ ] Test authorization flow
- [ ] Verify invoice creation

#### Updox
- [ ] API credentials verified
- [ ] Patient portal configured
- [ ] Notification settings enabled
- [ ] Test message sending

#### Google Gemini
- [ ] API key verified
- [ ] Quota limits checked
- [ ] Test voice conversation

### 5. Database Setup (if applicable)
- [ ] Database created
- [ ] Migrations run
- [ ] Backups configured
- [ ] Connection pooling set up

### 6. Monitoring & Logging
- [ ] Application logs configured
- [ ] Error tracking set up (Sentry, etc.)
- [ ] Performance monitoring enabled
- [ ] Alerts configured
- [ ] Uptime monitoring enabled

### 7. Backup & Recovery
- [ ] Backup strategy documented
- [ ] Automated backups configured
- [ ] Restore procedure tested
- [ ] Disaster recovery plan in place

## Post-Deployment

### 1. Verification
- [ ] Application loads without errors
- [ ] All features functional
- [ ] API endpoints responding
- [ ] External services connected
- [ ] Logs show normal operation

### 2. User Testing
- [ ] Conduct user acceptance testing
- [ ] Test on real devices
- [ ] Verify patient experience
- [ ] Test edge cases
- [ ] Collect feedback

### 3. Monitoring
- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify payment processing
- [ ] Monitor API usage
- [ ] Check external service health

### 4. Documentation
- [ ] Update deployment documentation
- [ ] Document any issues encountered
- [ ] Create runbook for operations
- [ ] Document rollback procedure

## Rollback Plan

If deployment fails:

1. [ ] Identify issue from logs
2. [ ] Revert to previous version
3. [ ] Restore from backup if needed
4. [ ] Notify users
5. [ ] Document root cause
6. [ ] Create fix
7. [ ] Test fix thoroughly
8. [ ] Re-deploy

## Production Maintenance

### Daily
- [ ] Check application logs
- [ ] Verify all services operational
- [ ] Monitor error rates

### Weekly
- [ ] Review performance metrics
- [ ] Check backup completion
- [ ] Test disaster recovery

### Monthly
- [ ] Security audit
- [ ] Dependency updates
- [ ] Performance optimization
- [ ] User feedback review

## Contact & Support

**Deployment Issues**: Contact DevOps team
**Application Issues**: Contact Development team
**User Support**: Contact Support team

---

**Deployment Date**: _______________
**Deployed By**: _______________
**Approved By**: _______________
**Notes**: _______________
