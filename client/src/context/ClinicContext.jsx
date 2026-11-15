import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

// Clinic facts (hours, address, policy) come from the API so they stay in sync.
// The fallback keeps the header/footer readable if the API is down.
const FALLBACK = {
  name: 'Smilo',
  legalName: 'Smilo Dental Studio',
  phone: '(415) 555-0142',
  email: 'hello@smilo.clinic',
  address: { line1: '218 Alder Street, Suite 3', city: 'San Francisco', region: 'CA', postal: '94110' },
  hours: [],
  policy: { cancelWindowMin: 120, leadTimeMin: 60, maxDaysAhead: 60 },
};

const ClinicContext = createContext({ clinic: FALLBACK, ready: false });
export const useClinic = () => useContext(ClinicContext);

export function ClinicProvider({ children }) {
  const [state, setState] = useState({ clinic: FALLBACK, ready: false, failed: false });

  useEffect(() => {
    api
      .get('/clinic')
      .then((r) => setState({ clinic: r.data.clinic, ready: true, failed: false }))
      .catch(() => setState({ clinic: FALLBACK, ready: true, failed: true }));
  }, []);

  return <ClinicContext.Provider value={state}>{children}</ClinicContext.Provider>;
}

export const telHref = (phone) => `tel:${phone.replace(/[^\d+]/g, '')}`;
