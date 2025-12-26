# Quick Email Setup - No Domain Required 🚀

**Need email working NOW without a domain?** Here are the fastest free options:

---

## ⚡ Fastest Option: Gmail (5 minutes)

### Why Gmail?
- ✅ Completely free
- ✅ No domain needed
- ✅ Works immediately
- ✅ 500 emails/day (enough for HR portal)

### Quick Setup:

1. **Use any Gmail account** (or create: `yourorg.hr@gmail.com`)

2. **Enable 2-Step Verification:**
   - Visit: https://myaccount.google.com/security
   - Turn on "2-Step Verification"

3. **Create App Password:**
   - Visit: https://myaccount.google.com/apppasswords
   - Select "Mail" → "Other" → Name it "HR Portal"
   - Copy the 16-character password; dsej oscp tllb xbei

4. **Add to `.env` file:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-char-app-password
SMTP_FROM=your-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. **Done!** Test password reset now.

---

## 🎯 Best for Production: SendGrid (10 minutes)

### Why SendGrid?
- ✅ Free tier: 100 emails/day
- ✅ Better deliverability
- ✅ Professional service
- ✅ Analytics included

### Quick Setup:

1. **Sign up:** https://signup.sendgrid.com/ (free)

2. **Verify email** (check inbox)

3. **Create API Key:**
   - Settings → API Keys → Create API Key
   - Name: "HR Portal"
   - Copy the key!

4. **Verify sender:**
   - Settings → Sender Authentication
   - Verify Single Sender
   - Use your Gmail or any email

5. **Add to `.env`:**
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your-api-key-here
SMTP_FROM=your-verified-email@gmail.com
SMTP_FROM_NAME=HR Leave Portal
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📊 Comparison

| Service | Setup Time | Free Limit | Best For |
|---------|-----------|------------|----------|
| **Gmail** | 5 min | 500/day | Quick start, testing |
| **SendGrid** | 10 min | 100/day | Production, better delivery |
| **Resend** | 10 min | 3,000/month | Modern apps |
| **Brevo** | 10 min | 300/day | Higher volume |

---

## 🎓 Recommendation

**For now (no domain):**
→ Use **Gmail** - it's free, works immediately, and 500 emails/day is plenty for an HR portal.

**When you can afford a domain later:**
→ Switch to **SendGrid** or use your domain's email service for better branding.

---

## ✅ Testing

After setup, test the password reset:

1. Go to login page
2. Click "Forgot Password?"
3. Enter your email
4. Check inbox (and spam folder)
5. Click reset link
6. Set new password

If emails don't arrive:
- Check spam folder
- Verify SMTP credentials
- Check server logs for errors

---

## 💡 Pro Tips

1. **Gmail App Password:** Never use your regular Gmail password. Always use an App Password.

2. **Email Limits:** 
   - Gmail: 500/day (usually enough)
   - SendGrid: 100/day (enough for small orgs)
   - If you hit limits, upgrade or use multiple accounts

3. **From Address:** 
   - Gmail: Will show your Gmail address (fine for internal use)
   - SendGrid: Can use verified email (looks more professional)

4. **Later Upgrade:** When you get a domain, you can:
   - Use domain email (e.g., `noreply@mofa.gov.gh`)
   - Set up SPF/DKIM records
   - Improve deliverability

---

**Need help?** Check the full `EMAIL-SETUP.md` guide for detailed instructions.

