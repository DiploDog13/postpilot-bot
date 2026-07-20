# PostPilot Bot 🚀

A Telegram AI assistant that transforms forwarded messages, voice notes, and links into ready-to-publish posts in your custom brand voice.

## Features

- **Smart Content Generation**: Transform any message into viral, professional, funny, sales, or educational posts
- **Voice Note Support**: Auto-transcribe voice messages with Whisper and generate posts
- **Brand Voice Training**: Upload your past posts to teach the AI your unique style
- **Freemium Model**: 10 free transforms/day, Pro subscription for unlimited access
- **Telegram Mini App**: Beautiful dashboard for managing drafts, analytics, and settings
- **Inline Mode**: Use @PostPilotBot in any chat to generate quick drafts
- **Telegram Stars Payments**: Built-in payment system for Pro subscriptions
- **Analytics**: Track your content generation and performance

## Tech Stack

### Backend
- **Runtime**: Node.js + TypeScript
- **Framework**: Hono (lightweight HTTP framework)
- **Bot Library**: grammy (Telegram bot framework)
- **AI**: OpenAI API (GPT-4 Turbo for text, Whisper for voice)
- **Database**: PostgreSQL (Supabase compatible)
- **Auth**: JWT with Telegram init data validation

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Integration**: Telegram WebApp SDK
- **Styling**: CSS with Telegram theme variables

## Project Structure

```
postpilot-bot/
├── backend/
│   ├── src/
│   │   ├── main.ts              # Server entry point
│   │   ├── bot.ts               # Grammy bot handlers
│   │   ├── api.ts               # REST API endpoints
│   │   ├── services/
│   │   │   ├── database.ts      # PostgreSQL operations
│   │   │   ├── openai.ts        # GPT-4 & Whisper integration
│   │   │   ├── telegram.ts      # Telegram helpers
│   │   │   └── auth.ts          # JWT & validation
│   │   └── middleware/
│   │       ├── auth.ts          # Auth middleware
│   │       └── logger.ts        # Request logging
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx             # React entry
│   │   ├── App.tsx              # Main app component
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx    # Drafts & analytics
│   │   │   └── Settings.tsx     # Brand voice & subscription
│   │   ├── hooks/
│   │   │   ├── useTelegram.ts   # WebApp integration
│   │   │   ├── useAuth.ts       # Auth state
│   │   │   └── useDrafts.ts     # Draft CRUD
│   │   ├── utils/
│   │   │   ├── api.ts           # API client
│   │   │   └── telegram.ts      # Telegram helpers
│   │   └── index.css            # Global styles
│   ├── public/
│   │   └── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── .env.example
│   ├── Dockerfile
│   └── nginx.conf
│
├── .github/
│   └── workflows/
│       └── deploy.yml           # CI/CD pipeline
├── docker-compose.yml
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Telegram Bot Token (from @BotFather)
- OpenAI API Key

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd postpilot-bot
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your values:
# TELEGRAM_BOT_TOKEN=your_bot_token
# OPENAI_API_KEY=your_openai_key
# DATABASE_URL=postgresql://user:password@host:5432/postpilot
# WEBHOOK_URL=https://your-backend-domain.com/webhook
# MINI_APP_URL=https://your-frontend-domain.com
# JWT_SECRET=your_secret_key

# Build TypeScript
npm run build

# Run in development
npm run dev

# Run in production
npm start
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your backend URL:
# VITE_API_URL=http://localhost:3000

# Run in development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### 4. Database Setup

The database schema is automatically initialized on first run. Tables include:

- `users` - User accounts and subscription status
- `drafts` - Generated posts and drafts
- `brand_voices` - Custom voice presets
- `analytics` - Usage tracking
- `payments` - Payment records

### 5. Bot Configuration

1. Create a bot via @BotFather
2. Get your bot token and add to `.env`
3. Set up your Mini App URL in @BotFather
4. Enable inline mode if desired
5. Set up payments (Telegram Stars) in @BotFather

## Deployment

### Option 1: Docker Compose (Local Development)

```bash
# Create .env file in root directory
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 2: Railway (Backend)

1. Connect your GitHub repository to Railway
2. Create a new project
3. Add PostgreSQL service
4. Add backend service with build command: `npm install && npm run build`
5. Set environment variables in Railway dashboard
6. Deploy!

### Option 3: Vercel (Frontend)

1. Connect your GitHub repository to Vercel
2. Import the `frontend` directory
3. Set `VITE_API_URL` environment variable
4. Deploy!

### Option 4: GitHub Actions (CI/CD)

1. Add secrets to your GitHub repository:
   - `RAILWAY_TOKEN`
   - `RAILWAY_SERVICE_ID`
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
2. Push to `main` branch
3. Automatic deployment triggers

## Environment Variables

### Backend (.env)
```
TELEGRAM_BOT_TOKEN=your_bot_token_from_botfather
OPENAI_API_KEY=your_openai_api_key
DATABASE_URL=postgresql://user:password@host:5432/postpilot
WEBHOOK_URL=https://your-backend-domain.com/webhook
MINI_APP_URL=https://your-frontend-domain.com
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3000
```

## Usage

### Bot Commands

- `/start` - Initialize bot and open dashboard
- Forward any message to generate post options
- Send voice notes for transcription
- Use @PostPilotBot in any chat for inline mode

### Mini App Features

- **Dashboard**: View all drafts, create new posts, check usage
- **Settings**: Configure brand voice, manage subscription
- **Analytics**: Track your content generation stats

## API Endpoints

### Auth
- `POST /api/auth/validate` - Validate Telegram init data
- `GET /api/user` - Get current user info

### Drafts
- `GET /api/drafts` - Get all user drafts
- `GET /api/drafts/:id` - Get single draft
- `POST /api/drafts` - Create new draft
- `PUT /api/drafts/:id` - Update draft
- `DELETE /api/drafts/:id` - Delete draft

### Generation
- `POST /api/generate` - Generate post from text

### Brand Voice
- `GET /api/brand-voices` - Get all brand voices
- `POST /api/brand-voices` - Create brand voice

### Analytics
- `GET /api/analytics` - Get user analytics

### Payments
- `POST /api/upgrade` - Initiate Pro upgrade

## Testing Checklist

- [ ] `/start` opens Mini App without errors
- [ ] Forward a message → bot replies with 3 styles
- [ ] Click a style → post generated in <3s
- [ ] Save draft → appears in dashboard
- [ ] 10th transform on free tier → paywall appears
- [ ] Pay 500 Stars → tier upgrades in DB
- [ ] Pro user can generate unlimited
- [ ] @PostPilotBot query → inline results show
- [ ] Voice note forwarding → transcribed + post generated
- [ ] Settings page loads → brand voice form works

## Launch Checklist

- [ ] Bot registered with @BotFather, description set
- [ ] TELEGRAM_BOT_TOKEN, OPENAI_API_KEY in production env
- [ ] Database backed up daily
- [ ] Error logging configured
- [ ] Rate-limit header responses (429)
- [ ] Onboarding completes in <1min
- [ ] First-run user can generate a post in <10sec
- [ ] Share a draft inline → receives referral credit

## Troubleshooting

### Bot not responding
- Check TELEGRAM_BOT_TOKEN is correct
- Verify webhook URL is accessible
- Check server logs for errors

### Database connection failed
- Verify DATABASE_URL format
- Check PostgreSQL service is running
- Ensure database credentials are correct

### OpenAI API errors
- Verify OPENAI_API_KEY is valid
- Check API quota/billing
- Review rate limits

### Mini App not loading
- Verify MINI_APP_URL is correct
- Check frontend is deployed
- Ensure HTTPS is enabled (required by Telegram)

## License

MIT

## Support

For issues and questions, please open a GitHub issue.
