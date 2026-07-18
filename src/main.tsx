import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { store } from './store'
import './index.css'
import App from './App.tsx'

const clerkKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

// Clerk is optional in dev so the app runs before keys are configured;
// the header shows a banner until VITE_CLERK_PUBLISHABLE_KEY is set.
const app = (
  <BrowserRouter>
    <Provider store={store}>
      <App />
    </Provider>
  </BrowserRouter>
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {clerkKey ? (
      <ClerkProvider publishableKey={clerkKey} afterSignOutUrl="/">
        {app}
      </ClerkProvider>
    ) : (
      app
    )}
  </StrictMode>,
)
