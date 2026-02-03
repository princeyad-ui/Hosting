# 📧 Email System - Setup & Features

Your hosting platform now supports **email notifications** for deployments and alerts!

## ✅ What's Implemented

### Email Features:
- ✅ **Deployment Notifications** - Success/failure emails when you deploy
- ✅ **Deployment Alerts** - Alerts for issues or important events
- ✅ **Welcome Emails** - Automatic welcome message for new users
- ✅ **Storage Warnings** - Alerts when you're using too much storage
- ✅ **Preference Control** - Enable/disable in Settings page

### Email Service Providers Supported:
- **Gmail** (recommended - easiest setup)
- **Outlook/Hotmail**
- **SendGrid**
- **Mailgun**
- **AWS SES**
- Any SMTP provider

## 🚀 Quick Setup (Gmail)

### Step 1: Enable 2FA on Gmail
1. Go to https://myaccount.google.com/security
2. Scroll to "2-Step Verification"
3. Click "Get started" and follow the steps

### Step 2: Create App Password
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and your device
3. Google generates a 16-character password
4. **Copy this password**

### Step 3: Add to `.env` file
```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
```

### Step 4: Restart Server
```bash
npm install
node index.js
```

Check console for: `✅ Email service ready`

### Step 5: Enable in Settings
1. Go to http://localhost:5000/settings
2. Turn on "Email notifications" 
3. Turn on "Deployment alerts"
4. Deploy a site to test!

## 📝 Email Types

### 1. Deployment Notifications
Sent after each deployment (success or failure)
- **When:** After you deploy a site
- **Contains:** Site name, status, deployment time, link to dashboard

### 2. Deployment Alerts
Sent for important warnings
- **When:** Build fails, storage limit reached, etc.
- **Contains:** Alert details, site ID, action links

### 3. Storage Warnings
Sent when approaching storage limit
- **When:** Using 80%+ of free tier
- **Contains:** Current usage, upgrade options

### 4. Welcome Email
Sent on account creation
- **When:** First time setting up account
- **Contains:** Getting started guide, feature overview

## 🔧 For Other Email Providers

### Outlook/Hotmail
```env
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### SendGrid
Install: `npm install @sendgrid/mail`
Update `email.service.js` to use SendGrid API

### AWS SES
Install: `npm install aws-sdk`
Configure AWS credentials in `.env`

See `EMAIL_SETUP.md` for detailed instructions.

## 🐛 Troubleshooting

| Problem | Solution |
|---------|----------|
| "Email service not configured" | Check EMAIL_USER and EMAIL_PASSWORD in .env |
| Emails not arriving | Check spam folder, verify email in Settings |
| "Less secure app" error | Use App Password instead of regular password |
| Gmail not sending | Make sure 2FA is enabled and App Password is used |

## 📂 Files Added/Modified

### New Files:
- `server/services/email.service.js` - Email sending logic
- `EMAIL_SETUP.md` - Setup guide

### Modified Files:
- `server/package.json` - Added nodemailer dependency
- `server/controllers/deploy.controller.js` - Added email notifications
- `server/controllers/reactDeploy.controller.js` - Added email notifications

## 🧪 Testing Emails

1. Set your email in Settings page
2. Enable email notifications
3. Deploy any project
4. Check your email inbox (and spam folder)
5. You should receive a deployment notification!

## 🔒 Security Notes

- ✅ App passwords are safer than regular passwords
- ✅ Emails are only sent if user enabled notifications
- ✅ No sensitive data in email logs
- ✅ Email service runs asynchronously (doesn't block deployment)

## 💡 Next Steps

1. **Verify email works**: Deploy a test site
2. **Customize emails**: Edit HTML templates in `email.service.js`
3. **Add more notifications**: Create custom email functions
4. **Production setup**: Use professional email service for larger scale

---

Questions or issues? Check the console logs for detailed error messages.
