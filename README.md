# Strapi Admin Clone

A Next.js frontend application that clones the Strapi admin panel functionality. This project provides registration, login, content manager, and content builder features with API integration for a future Strapi backend.

## Features

- **Authentication System**
  - User registration and login
  - JWT token management
  - Protected routes

- **Content Manager**
  - List all content types
  - View content items for each type
  - Bulk operations (select, delete)
  - Duplicate content items

- **Content Builder**
  - Dynamic form generation based on content type schema
  - Create new content items
  - Edit existing content items
  - Support for various field types (string, text, richtext, number, boolean, datetime)

- **Dashboard**
  - Overview statistics
  - Recent activity feed
  - Quick action buttons

- **User Management**
  - View user list
  - User roles and permissions

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios
- **State Management**: React Context

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd strapi-admin-clone
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

## Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Your Custom Backend API URL (ALL requests go here)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Next.js Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here
```

**Important:** The frontend only needs `NEXT_PUBLIC_API_URL` pointing to your custom backend. The frontend has NO Strapi references.

## Frontend Architecture

This Next.js frontend is **completely independent** of Strapi. It's a pure UI that:

1. **Calls YOUR custom backend only** - No Strapi API references
2. **Has dummy API calls** - For development and demonstration
3. **Ready for your backend** - When you build your backend, just update the API URLs

### How It Works

```
Frontend (Next.js)  →  Calls Your Custom Backend  →  Your Backend Handles Strapi
```

**Key Points:**
- ✅ **NO Strapi logic in the frontend** - It's completely independent
- ✅ All API calls go to `NEXT_PUBLIC_API_URL` (your custom backend)
- ✅ Currently uses dummy data - Replace with real API calls when backend is ready
- ✅ Clean separation of concerns - Frontend is pure UI

### Setting up the Auth Server

1. **Install dependencies for the auth server:**
```bash
cd strapi-admin-clone
npm install express cors bcryptjs jsonwebtoken uuid nodemon
```

2. **Start the auth server:**
```bash
node auth-server.js
```

The auth server will run on `http://localhost:3001` by default.

### Architecture Flow

```
┌─────────────────┐
│  Next.js App    │
│   (Frontend)    │
└────────┬────────┘
         │
         │ All API calls go to custom backend
         ▼
┌─────────────────┐
│ Custom Backend  │
│  (Auth Server)  │ ────► Handles: Auth, User Management
│   Port 3001     │
└────────┬────────┘
         │
         │ Proxies content requests to Strapi
         ▼
┌─────────────────┐
│   Strapi API    │
│  (CMS Backend)  │ ────► Handles: Content Types, Content Items
│   Port 1337     │
└─────────────────┘
```

**Key Points:**
- Frontend NEVER directly accesses Strapi
- All API calls go through your custom backend
- Your backend handles authentication
- Your backend proxies content requests to Strapi

### Expected API Endpoints (To Be Built)

The frontend expects these endpoints from your custom backend:

**Authentication:**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `GET /api/users` - Get all users

**Content Management:**
- `GET /api/content-types` - Get all content types
- `GET /api/content-types/:slug` - Get specific content type
- `GET /api/:contentType` - Get all items of a content type
- `GET /api/:contentType/:id` - Get specific content item
- `POST /api/:contentType` - Create new content item
- `PUT /api/:contentType/:id` - Update content item
- `DELETE /api/:contentType/:id` - Delete content item
- `POST /api/:contentType/duplicate/:id` - Duplicate content item

**Note:** Currently, the frontend uses dummy data. Replace the dummy implementations in `src/lib/api.ts` with real API calls when your backend is ready.

### Auth Server Features

- **JWT Authentication** - Secure token-based authentication
- **Password Hashing** - Uses bcryptjs for secure password storage
- **User Validation** - Email/username uniqueness checks
- **CORS Support** - Cross-origin requests enabled
- **In-memory Storage** - For demo purposes (replace with database in production)

### Example Registration Request

```json
POST /api/auth/register
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "firstname": "John",
  "lastname": "Doe"
}
```

### Example Login Request

```json
POST /api/auth/login
{
  "identifier": "john@example.com",
  "password": "password123"
}
```

5. **Start the auth server:**
```bash
node auth-server.js
```

6. **Run the development server:**
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Credentials

The application currently uses dummy authentication. You can login with any of these credentials:

**Email/Username Options:**
- `admin@example.com` / `admin123`
- `admin` / `admin123`
- `demo@example.com` / `demo123`
- `demo` / `demo123`
- `test@example.com` / `test123`
- `test` / `test123`

**Registration:**
- You can also register with any email/username combination
- All registrations will work with dummy data

## Running Both Servers

You need to run both servers simultaneously:

1. **Terminal 1 - Auth Server:**
```bash
node auth-server.js
```

2. **Terminal 2 - Next.js App:**
```bash
npm run dev
```

The auth server handles user authentication while the Next.js app handles the frontend and content management.

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── dashboard/         # Dashboard page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   ├── content-manager/  # Content management pages
│   └── content-builder/  # Content editing pages
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── content/         # Content management components
│   └── ui/              # Reusable UI components
├── contexts/            # React contexts
├── hooks/               # Custom React hooks
├── lib/                 # Utility functions and API client
└── types/               # TypeScript type definitions
```

## API Integration

The application is designed to work with a Strapi backend. The API client (`src/lib/api.ts`) includes methods for:

- Authentication (login, register, logout)
- Content type management
- Content item CRUD operations
- Duplicate functionality

### Mock Data

Currently, the application uses mock data for demonstration purposes. To connect to a real Strapi backend:

1. Set up a Strapi instance
2. Update the `NEXT_PUBLIC_STRAPI_URL` environment variable
3. The API client will automatically connect to your Strapi instance

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Features in Detail

### Content Manager
- Displays all available content types
- Shows content items with pagination
- Bulk selection and operations
- Search and filtering capabilities

### Content Builder
- Dynamic form generation based on content type schema
- Support for various field types:
  - String/Text fields
  - Rich text editors
  - Number/Decimal fields
  - Boolean checkboxes
  - Date/Time pickers
- Real-time validation
- Auto-save functionality

### Authentication
- Secure JWT-based authentication
- Protected routes
- Automatic token refresh
- Logout functionality

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.