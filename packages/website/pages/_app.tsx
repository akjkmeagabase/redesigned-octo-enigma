import '../styles/global.scss';
import { useRouter } from 'next/router';
import { QueryClient, QueryClientProvider } from 'react-query';

import CorkscrewBackground from '../assets/illustrations/corkscrewBlurred';
import Metadata from 'components/general/metadata';
import RestrictedRoute from 'components/general/restrictedRoute';
import { AuthorizationProvider } from 'components/contexts/authorizationContext';
import { UserProvider } from 'components/contexts/userContext';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

/**
 * App root Component
 */
const App = ({ Component, pageProps }: any) => {
  const { pathname } = useRouter();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthorizationProvider {...pageProps}>
        <UserProvider>
          <Metadata {...pageProps} />
          {pathname !== '/' && <CorkscrewBackground />}
          <RestrictedRoute {...pageProps}>
            <Component {...pageProps} />
          </RestrictedRoute>
        </UserProvider>
      </AuthorizationProvider>
    </QueryClientProvider>
  );
};

export default App;
