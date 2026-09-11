import { useEffect, useRef } from 'react';
import { AUTH_MODE, setToken, parseCognitoCallbackHash, redirectToCognito } from '../../shared/api';
import type { LoginResult } from '../../shared/api';

/**
 * On mount (Cognito mode only): parses the token from the URL hash after
 * the Hosted UI redirect, stores it, and calls `onAuthenticated`.
 * If no token is present in the hash, redirects the user to Cognito.
 */
export function useCognitoAuth(onAuthenticated: (result: LoginResult) => void): void {
  const checked = useRef(false);

  useEffect(() => {
    if (AUTH_MODE !== 'cognito' || checked.current) return;
    checked.current = true;

    const result = parseCognitoCallbackHash();
    if (result) {
      setToken(result.accessToken);
      onAuthenticated(result);
    } else {
      redirectToCognito();
    }
  }, [onAuthenticated]);
}
