# Deployment & Change Management Guide
## Ministry of Fisheries and Aquaculture - HR Portal

This document outlines the process for implementing changes to the MoFA HR Staff Leave Portal.

## Overview

The application is a Next.js-based HR management system with:
- **Frontend**: Next.js 15 with React 19
- **Backend**: Next.js API Routes
- **Database**: Neon PostgreSQL (via Prisma ORM)
- **Deployment**: Vercel (recommended) or any Node.js hosting platform

## When Changes Can Be Implemented

### Development Environment
Changes can be implemented **immediately** in the development environment:
- Local development server: `npm run dev`
- Changes are hot-reloaded automatically
- No approval process required for local testing

### Staging Environment (If Configured)
- Changes require **code review** and **testing**
- Deploy to staging for stakeholder review
- Changes should be tested before production deployment

### Production Environment
Changes should follow this process:
1. **Development** → Code changes in feature branch
2. **Testing** → Local and staging testing
3. **Code Review** → Peer review of changes
4. **Approval** → Stakeholder/manager approval for significant changes
5. **Deployment** → Deploy to production
6. **Verification** → Post-deployment testing

## Implementation Workflow

### 1. Making Code Changes

```bash
# Create a new feature branch
git checkout -b feature/your-feature-name

# Make your changes
# ... edit files ...

# Test locally
npm run dev

# Commit changes
git add .
git commit -m "Description of changes"

# Push to repository
git push origin feature/your-feature-name
```

### 2. Database Changes

If your changes require database schema modifications:

```bash
# Create a new migration
npm run db:migrate

# Or push schema changes directly (development only)
npm run db:push

# Generate Prisma client
npm run db:generate
```

**Important**: Database migrations should be:
- Tested in development first
- Reviewed before production deployment
- Backed up before applying to production

### 3. Testing Changes

Before deploying, ensure:
- [ ] Code compiles without errors: `npm run build`
- [ ] Linting passes: `npm run lint`
- [ ] Database migrations work correctly
- [ ] All features function as expected
- [ ] No breaking changes to existing functionality

### 4. Building for Production

```bash
# Build the application
npm run build

# This will:
# 1. Generate Prisma client
# 2. Build Next.js application
# 3. Optimize assets
```

### 5. Deployment Options

#### Option A: Vercel (Recommended for Next.js)

1. **Connect Repository**:
   - Push code to GitHub/GitLab/Bitbucket
   - Connect repository to Vercel

2. **Configure Environment Variables**:
   - Add `DATABASE_URL` in Vercel dashboard
   - Add any other required environment variables

3. **Deploy**:
   - Automatic deployment on push to main branch
   - Or manually trigger deployment from Vercel dashboard

#### Option B: Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start

# Or use PM2 for process management
pm2 start npm --name "mofa-hr-portal" -- start
```

#### Option C: Docker Deployment

Create a `Dockerfile`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Change Types & Approval Requirements

### Low-Risk Changes (Can be implemented immediately)
- UI/UX improvements
- Bug fixes
- Documentation updates
- Performance optimizations (non-breaking)
- Adding new features (non-breaking)

### Medium-Risk Changes (Require testing)
- Database schema changes
- API endpoint modifications
- Authentication/authorization changes
- Third-party integration updates

### High-Risk Changes (Require approval)
- Security-related changes
- Data migration scripts
- Breaking API changes
- Infrastructure changes
- Changes affecting payroll/leave calculations

## Pre-Deployment Checklist

Before deploying to production:

- [ ] All tests pass
- [ ] Code review completed
- [ ] Database migrations tested
- [ ] Environment variables configured
- [ ] Backup of production database created
- [ ] Rollback plan prepared
- [ ] Stakeholders notified (for significant changes)
- [ ] Documentation updated

## Post-Deployment Steps

1. **Verify Deployment**:
   - Check application is accessible
   - Test critical user flows
   - Monitor error logs

2. **Monitor**:
   - Application performance
   - Database connections
   - Error rates
   - User feedback

3. **Rollback Plan** (if needed):
   ```bash
   # Revert to previous deployment
   # Or restore database backup if needed
   ```

## Environment Configuration

### Development
- Local database or development Neon instance
- `NODE_ENV=development`
- Debug logging enabled

### Production
- Production Neon database
- `NODE_ENV=production`
- Error logging only
- Analytics enabled

## Database Migration Strategy

### For Schema Changes:

1. **Development**:
   ```bash
   npm run db:migrate
   ```

2. **Review Migration Files**:
   - Check `prisma/migrations/` folder
   - Verify SQL changes are correct

3. **Production**:
   ```bash
   # Apply migrations
   npx prisma migrate deploy
   
   # Or use Prisma Migrate in production
   npx prisma migrate deploy
   ```

**⚠️ Warning**: Always backup production database before migrations!

## Emergency Changes

For critical fixes that need immediate deployment:

1. Create hotfix branch: `git checkout -b hotfix/critical-fix`
2. Make minimal necessary changes
3. Test thoroughly
4. Get expedited approval
5. Deploy immediately
6. Follow up with proper documentation

## Best Practices

1. **Version Control**:
   - Use meaningful commit messages
   - Create feature branches for all changes
   - Never commit directly to main/master

2. **Testing**:
   - Test locally before committing
   - Test database changes in development
   - Verify all user roles work correctly

3. **Documentation**:
   - Document breaking changes
   - Update API documentation if needed
   - Keep deployment notes

4. **Communication**:
   - Notify team of significant changes
   - Document deployment schedule
   - Share post-deployment status

## Troubleshooting

### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Verify network/firewall settings

### Deployment Issues
- Check build logs
- Verify environment variables
- Review error logs in hosting platform

## Support & Contacts

For deployment issues or questions:
- Review this documentation
- Check application logs
- Contact development team lead
- Review GitHub issues (if applicable)

---

**Last Updated**: 2024
**Application Version**: 0.1.0
**Next.js Version**: 15.5.6

