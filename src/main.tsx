import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { createRouter } from '@ciderjs/city-gas';
import { RouterProvider } from '@ciderjs/city-gas/react';
import { ThemeProvider } from '@/components/theme-provider';
import { dynamicRoutes, pages, specialPages } from '@/generated/routes';

const router = createRouter(pages, { specialPages, dynamicRoutes });

// biome-ignore lint/style/noNonNullAssertion: root is not null
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
    </ThemeProvider>
  </StrictMode>,
);
