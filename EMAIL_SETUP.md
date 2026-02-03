# EMAIL SETUP GUIDE

## To enable email notifications, follow these steps:

### Option 1: Gmail (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account:
   - Go to https://myaccount.google.com/security
   - Click "2-Step Verification"
   - Follow the setup steps

2. **Create App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer" (or your device)
   - Google will generate a 16-character password
   - Copy this password

3. **Add to `.env` file**:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
   ```

### Option 2: Other Email Providers

#### SendGrid
```
npm install sendgrid
```
Update `server/services/email.service.js` to use SendGrid API

#### Mailgun
```
npm install mailgun.js
```

#### AWS SES
```
npm install aws-sdk
```

### Option 3: Outlook/Hotmail

```
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password

# In email.service.js, change transporter to:
const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});
```

## After Setup:

1. Restart the server: `node index.js`
2. Check console for: `✅ Email service ready`
3. Go to Settings and enable email notifications
4. Deploy a site to test

## Emails will be sent for:
- ✅ Deployment notifications (success/failure)
- ✅ Deployment alerts
- ✅ Storage limit warnings
- ✅ Account changes
- ✅ Welcome emails

## Troubleshooting:

**"Email service not configured" error**
- Check your EMAIL_USER and EMAIL_PASSWORD in .env
- Make sure you're using app-specific password for Gmail (not your regular password)

**Emails not arriving**
- Check spam/junk folder
- Verify email address in Settings
- Check if email notifications are enabled

**"Less secure app access" error**
- Use App Password instead (recommended)
- Or enable "Less secure apps" on Gmail (not recommended for security)
