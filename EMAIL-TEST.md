# Email Configuration Test

## ✅ Your Configuration Status

Your `.env` file configuration looks **complete**! Here's what you have:

```env
SMTP_HOST=smtp.gmail.com          ✅
SMTP_PORT=587                     ✅
SMTP_SECURE=false                 ✅
SMTP_USER=dawgme13@gmail.com      ✅
SMTP_PASS="dsej oscp tllb xbei"   ✅ (quoted for spaces)
SMTP_FROM=dawgme13@gmail.com      ✅
SMTP_FROM_NAME=HR Leave Portal    ✅
NEXT_PUBLIC_APP_URL=http://localhost:3000  ✅
```

## ⚠️ Next Steps Required

### 1. Install Nodemailer

The email service requires `nodemailer` to be installed:

```bash
npm install nodemailer @types/nodemailer
```

### 2. Fix Password Format (Optional but Recommended)

Gmail app passwords have spaces. I've updated your `.env` to quote the password, which should work. If you still have issues, you can remove the spaces:

**Option A (Current - with quotes):**
```env
SMTP_PASS="dsej oscp tllb xbei"
```

**Option B (Without spaces):**
```env
SMTP_PASS=dsejoscptllbxbei
```

Both should work, but Option A (quoted) is safer.

### 3. Test the Configuration

After installing nodemailer, test the email:

1. **Start your dev server:**
   ```bash
   npm run dev
   ```

2. **Test password reset:**
   - Go to login page
   - Click "Forgot Password?"
   - Enter: `dawgme13@gmail.com`
   - Check your Gmail inbox (and spam folder)

3. **Check server logs:**
   - Look for "Email sent: [messageId]" in console
   - If you see errors, check the error message

## 🔍 Troubleshooting

### If emails don't send:

1. **Verify App Password:**
   - Make sure 2-Step Verification is enabled
   - Regenerate app password if needed: https://myaccount.google.com/apppasswords

2. **Check Gmail Settings:**
   - Make sure "Less secure app access" is not blocking (shouldn't be needed with App Password)
   - Check if Gmail account is locked or restricted

3. **Check Server Logs:**
   - Look for SMTP connection errors
   - Verify all environment variables are loaded

4. **Test SMTP Connection:**
   - The email service will log errors if connection fails
   - Check console for detailed error messages

## ✅ Configuration Checklist

- [x] All SMTP variables set in `.env`
- [x] Gmail app password generated
- [ ] Nodemailer installed (`npm install nodemailer @types/nodemailer`)
- [ ] Server restarted after `.env` changes
- [ ] Password reset tested
- [ ] Email received in inbox

## 🎯 Quick Test Command

After installing nodemailer, you can test by:
1. Starting the server: `npm run dev`
2. Going to login page
3. Clicking "Forgot Password?"
4. Entering your email
5. Checking inbox

If everything is configured correctly, you should receive the password reset email within seconds!

---

**Your configuration is complete!** Just need to install nodemailer and test it. 🚀











