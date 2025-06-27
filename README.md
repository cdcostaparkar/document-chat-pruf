## 🖥️ Next.js Frontend Setup Instructions

Follow these steps to set up your Next.js frontend and connect it to your FastAPI backend.

### 1. Prerequisites

- Ensure **Node.js v18+** is installed on your system.
- Have a JavaScript runtime/package manager installed: **npm**, **pnpm**, or **bun**.

### 2. Install Dependencies

Choose your preferred package manager and run the appropriate command in your Next.js project directory:

```bash
npm install
# or
pnpm install
# or
bun install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the root of your Next.js project (if it doesn’t exist) and add the following line:

```env
NEXT_PUBLIC_API_BASE_URL='http://localhost:8000'
```

- Adjust the URL if your FastAPI server is running elsewhere or on a different port.

### 4. Run the Next.js Development Server

Use your chosen package manager to start the development server:

```bash
npm run dev
# or
pnpm run dev
# or
bun run dev
```

- The frontend will be available at [http://localhost:3000](http://localhost:3000) by default

### 5. Connect to FastAPI Backend

- Ensure your FastAPI server is running at the URL specified in `NEXT_PUBLIC_API_BASE_URL`.
- The frontend will make API requests to your backend using this environment variable.

**Tip:**  
If you change the backend URL or port, update the `NEXT_PUBLIC_API_BASE_URL` accordingly.

Your Next.js frontend is now ready to communicate with your FastAPI backend!
