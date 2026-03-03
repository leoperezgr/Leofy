import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AppDateProvider } from './contexts/AppDateContext';

export default function App() {
  return (
    <AppDateProvider>
      <RouterProvider router={router} />
    </AppDateProvider>
  );
}
