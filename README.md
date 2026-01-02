# HR Leave Portal

HR Leave Portal Desktop Application for the Ministry of Fisheries and Aquaculture (MOFA).

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- PostgreSQL database
- SMTP server for email notifications

## Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the root directory with the required environment variables (see [Environment Variables](#environment-variables) section below).

3. **Run Database Migration**:
   ```bash
   npm run db:migrate
   npm run db:generate
   ```

4. **Seed Initial Data**:
   ```bash
   npm run db:seed
   npm run setup:initial
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## Environment Variables

The following environment variables are required for the application to function properly:

### Database Configuration

- `DATABASE_URL` - PostgreSQL connection string (pooled connection for application use)
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Used for: Application database queries

- `DIRECT_URL` - PostgreSQL direct connection string (required for Prisma migrations)
  - Format: `postgresql://user:password@host:port/database?sslmode=require`
  - Note: Should be the same as DATABASE_URL but without the pooler suffix in the hostname
  - Used for: Database migrations and direct connections

### Application Configuration

- `NEXT_PUBLIC_APP_URL` - Public URL of the application
  - Example: `http://localhost:3000` (development) or `https://your-domain.com` (production)
  - Used for: Generating absolute URLs in emails and notifications

- `NEXT_PUBLIC_API_URL` - API base URL (optional, for Electron builds)
  - Used for: Electron desktop application API routing
  - Defaults to: `NEXT_PUBLIC_APP_URL` if not specified

- `ELECTRON_API_URL` - API URL for Electron builds (optional)
  - Used for: Overriding API URL in Electron desktop builds
  - Takes precedence over `NEXT_PUBLIC_API_URL` when set

- `ELECTRON_DEFAULT_API_URL` - Default API URL for Electron production builds (optional)
  - Used for: Setting the default Vercel/production URL used when other API URL variables are not set
  - Defaults to: `https://hr-leave-portal.vercel.app` if not specified
  - Note: This allows you to change the default production URL without modifying code
  - Priority order: `ELECTRON_API_URL` > `NEXT_PUBLIC_API_URL` > `ELECTRON_DEFAULT_API_URL` > hardcoded default

- `DEBUG_IPC` - Enable debug logging for IPC handlers (optional)
  - Values: `true` or `false`
  - Defaults to: `true` in development mode, `false` in production
  - Used for: Enabling detailed request/response logging in Electron IPC handlers
  - Note: Automatically enabled when `NODE_ENV=development`

### Email Configuration (SMTP)

- `SMTP_HOST` - SMTP server hostname
  - Example: `smtp.office365.com` or `smtp.gmail.com`

- `SMTP_PORT` - SMTP server port
  - Common values: `587` (TLS) or `465` (SSL)

- `SMTP_SECURE` - Whether to use secure connection
  - Values: `true` or `false`
  - Note: Automatically set to `true` if `SMTP_PORT` is `465`

- `SMTP_USER` - SMTP authentication username (email address)
  - Example: `your-email@yourdomain.com`

- `SMTP_PASS` - SMTP authentication password or app password
  - Note: For Office 365/Gmail, you may need to use an app-specific password

- `SMTP_FROM` - Email address to send emails from
  - Defaults to: `SMTP_USER` if not specified

- `SMTP_FROM_NAME` - Display name for email sender
  - Defaults to: `HR Leave Portal` if not specified

### Push Notifications (Web Push)

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - VAPID public key for web push notifications
  - Used for: Client-side push notification subscription

- `VAPID_PRIVATE_KEY` - VAPID private key for web push notifications
  - Used for: Server-side push notification sending
  - **Security**: Keep this secret and never commit to version control

- `VAPID_EMAIL` - Contact email for VAPID key pair
  - Format: `mailto:your-email@example.com`

### Authentication

- `JWT_SECRET` - Secret key for JWT token signing and verification
  - **Security**: Must be a secure random string. Keep this secret and never commit to version control
  - Used for: User authentication tokens
  - Generate a secure key: `openssl rand -base64 32`

### Example `.env` File

```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database?sslmode=require"
DIRECT_URL="postgresql://user:password@host:port/database?sslmode=require"

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email
SMTP_HOST="smtp.office365.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-email@yourdomain.com"
SMTP_PASS="your-password-or-app-password"
SMTP_FROM="your-email@yourdomain.com"
SMTP_FROM_NAME="HR Leave Portal"

# Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY="your-vapid-public-key"
VAPID_PRIVATE_KEY="your-vapid-private-key"
VAPID_EMAIL="mailto:your-email@example.com"

# Authentication
JWT_SECRET="your-secure-random-jwt-secret"
```

## Available Scripts

### Development
- `npm run dev` - Start development server
- `npm run electron:dev` - Start Electron app in development mode

### Building
- `npm run build` - Build Next.js application
- `npm run build:electron` - Build with Electron configuration
- `npm run electron:build` - Build Electron application
- `npm run electron:build:win` - Build Windows installer
- `npm run electron:build:mac` - Build macOS application
- `npm run electron:build:linux` - Build Linux application

### Database
- `npm run db:generate` - Generate Prisma client
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed database with initial data
- `npm run db:studio` - Open Prisma Studio

### Utilities
- `npm run lint` - Run ESLint
- `npm run clean:cache` - Clear application cache
- `npm run clean:all` - Clear all caches and temporary files

For a complete list of available scripts, see `package.json`.

## Documentation

Additional documentation is available in the `docs/` directory:
- System Administration Guide
- API Documentation
- Deployment Guides

## License

Private - Ministry of Fisheries and Aquaculture (MOFA)

