# MoFA HR Staff Leave Portal
## Ministry of Fisheries and Aquaculture Development

A comprehensive HR management system for staff leave management, payroll, and performance reviews.

## 🚀 Quick Start

### Prerequisites
- Node.js 20+ and npm
- Neon PostgreSQL database account
- Git (for version control)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hr-staff-leave-portal
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your DATABASE_URL
   ```

4. **Set up the database**
   ```bash
   # Generate Prisma client
   npm run db:generate
   
   # Run migrations
   npm run db:migrate
   
   # (Optional) Seed initial data
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:3000`

## 📚 Documentation

- **[DEPLOYMENT.md](./DEPLOYMENT.md)** - Complete guide on when and how to implement changes
- **[README-DATABASE.md](./README-DATABASE.md)** - Database setup and configuration
- **[prisma/SEED_README.md](./prisma/SEED_README.md)** - Database seeding guide

## 🔄 Implementing Changes

### When Changes Can Be Implemented

**Development Environment**: Changes can be implemented immediately
- Local development: `npm run dev`
- Hot-reload enabled
- No approval required for local testing

**Production Environment**: Follow the deployment workflow
- See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete process
- Requires testing and approval for significant changes
- Database migrations need careful planning

### Quick Change Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make changes and test**
   ```bash
   npm run dev  # Test locally
   npm run build  # Verify build succeeds
   ```

3. **For database changes**
   ```bash
   npm run db:migrate  # Create migration
   npm run db:generate  # Update Prisma client
   ```

4. **Commit and deploy**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin feature/your-feature-name
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 🏗️ Project Structure

```
hr-staff-leave-portal/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # UI component library
│   └── ...               # Feature components
├── lib/                   # Utility libraries
│   ├── prisma.ts         # Prisma client
│   ├── permissions.ts    # Role-based permissions
│   └── data-store.ts     # Data management
├── prisma/                # Database schema and migrations
│   ├── schema.prisma     # Database schema
│   ├── migrations/       # Migration files
│   └── seed.ts           # Seed script
└── public/               # Static assets
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes (dev only)
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with sample data

## 🔐 User Roles

The system supports multiple user roles:
- **Employee** - View own leave, payslips, performance reviews
- **Manager** - Approve leave requests, view team data
- **HR** - Full access to staff management and leave policies
- **Admin** - Complete system access

## 📊 Features

- **Staff Management** - Employee profiles and information
- **Leave Management** - Leave requests, approvals, and balances
- **Leave Policies** - Configurable leave policies and rules
- **Holiday Calendar** - Public and company holidays
- **Payslips** - Employee salary information
- **Performance Reviews** - Employee performance tracking
- **Audit Logs** - Complete activity tracking
- **Role-Based Access** - Secure permission system

## 🗄️ Database

The application uses **Neon PostgreSQL** with Prisma ORM:
- See [README-DATABASE.md](./README-DATABASE.md) for setup
- Schema defined in `prisma/schema.prisma`
- Migrations in `prisma/migrations/`

## 🚢 Deployment

### Recommended: Vercel
- Automatic deployments from Git
- Built-in Next.js optimization
- Easy environment variable management

### Other Options
- Any Node.js hosting platform
- Docker containerization
- Manual server deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

## 🔧 Configuration

### Environment Variables

Required:
- `DATABASE_URL` - Neon PostgreSQL connection string

Optional:
- `NODE_ENV` - Environment (development/production)
- Other platform-specific variables

### Database Configuration

The application uses:
- **Neon PostgreSQL** for production
- **Prisma ORM** for database access
- Connection pooling for serverless environments

## 📝 Change Management

### Types of Changes

**Low-Risk** (Can implement immediately):
- UI/UX improvements
- Bug fixes
- Documentation

**Medium-Risk** (Require testing):
- Database schema changes
- API modifications
- Authentication changes

**High-Risk** (Require approval):
- Security changes
- Data migrations
- Breaking changes

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete change management process.

## 🐛 Troubleshooting

### Build Issues
```bash
rm -rf .next node_modules
npm install
npm run build
```

### Database Issues
- Verify `DATABASE_URL` in `.env`
- Check database connectivity
- Run `npm run db:generate`

### Type Errors
```bash
npm run db:generate  # Regenerate Prisma client
```

## 📞 Support

For issues or questions:
1. Check documentation in this README
2. Review [DEPLOYMENT.md](./DEPLOYMENT.md)
3. Check [README-DATABASE.md](./README-DATABASE.md)
4. Contact development team

## 📄 License

Private project for Ministry of Fisheries and Aquaculture Development

---

**Version**: 0.1.0  
**Last Updated**: 2024  
**Framework**: Next.js 15.5.6  
**Database**: Neon PostgreSQL

