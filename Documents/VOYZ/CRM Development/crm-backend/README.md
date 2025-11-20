# CRM Backend

Internal CRM system with modular integrations built with NestJS, PostgreSQL, and Prisma.

## Features

- **User Management** - Authentication with JWT (access + refresh tokens)
- **Deals Management** - Full CRUD with pipeline stages
- **Tasks** - Task assignment and tracking
- **Comments** - Deal comments
- **Activity Logs** - Automatic activity tracking
- **Messages** - Unified message system across all integrations
- **Calls** - Telephony integration with call history
- **Analytics** - Comprehensive analytics and reporting
- **Real-time Updates** - WebSocket support for live updates

## Integrations

- **WhatsApp Business API** - Send/receive messages
- **Telegram Bot API** - Telegram integration
- **VK Messages API** - VKontakte integration
- **Email (IMAP/SMTP)** - Email integration
- **Telephony** - Call tracking and recording

## Tech Stack

- Node.js + TypeScript
- NestJS
- PostgreSQL
- Prisma ORM
- WebSockets (Socket.IO)
- JWT Authentication

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Set up the database:
```bash
npx prisma migrate dev
npx prisma generate
```

5. Start the development server:
```bash
npm run start:dev
```

### Docker

```bash
docker-compose up -d
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login
- `POST /auth/refresh` - Refresh token

### Deals
- `GET /deals` - List all deals
- `POST /deals` - Create deal
- `GET /deals/:id` - Get deal details
- `PATCH /deals/:id` - Update deal
- `DELETE /deals/:id` - Delete deal

### Messages
- `GET /messages` - List all messages
- `POST /messages` - Create message
- `GET /messages/deal/:dealId` - Get messages for deal

### Webhooks
- `POST /integrations/whatsapp/webhook` - WhatsApp webhook
- `POST /integrations/telegram/webhook/:token` - Telegram webhook
- `POST /integrations/vk/webhook` - VK webhook
- `POST /integrations/email/webhook` - Email webhook
- `POST /integrations/telephony/webhook` - Telephony webhook

## WebSocket Events

- `message:new` - New message received
- `call:new` - New call received
- `deal:update` - Deal updated
- `activity:new` - New activity
- `task:update` - Task updated

## Project Structure

```
src/
  /auth          - Authentication module
  /users         - User management
  /deals         - Deal management
  /tasks         - Task management
  /messages      - Message management
  /calls         - Call management
  /integrations  - Integration modules
    /common      - Base integration classes
    /whatsapp    - WhatsApp integration
    /telegram    - Telegram integration
    /vk          - VK integration
    /email       - Email integration
    /telephony   - Telephony integration
  /ws            - WebSocket gateway
  /common        - Shared services
```

## License

Private - Internal use only

