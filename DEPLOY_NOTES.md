Vercel / Render Connection Notes
===============================

- Frontend is deployed to Vercel at: https://stock-frontend-topaz-alpha.vercel.app
- Backend is deployed to Render at: https://stock-management-v3rl.onrender.com/

Steps to ensure they work together:

1. Vercel environment variable
   - Set `VITE_API_URL` to `https://stock-management-v3rl.onrender.com/api` in your Vercel project settings (Environment Variables) for the appropriate environment (Production).
   - Redeploy the Vercel project after saving the variable.

2. Backend CORS
   - The backend's CORS configuration has been updated to allow `https://stock-frontend-topaz-alpha.vercel.app`.
   - If you use a different frontend URL, add it to the backend's allowed origins in `stock-backend/server.js`.

3. Testing
   - Visit your Vercel frontend URL and perform an action that calls the API (e.g., login). Open browser DevTools → Network to confirm requests go to `https://stock-management-v3rl.onrender.com/api/...` and return 2xx.

4. Local development
   - To run the frontend locally against the Render backend, set a local `.env` with:

```
VITE_API_URL=https://stock-management-v3rl.onrender.com/api
```

5. Notes
   - `src/lib/api.ts` now falls back to the Render API URL when `VITE_API_URL` is not set.
