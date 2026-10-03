import { browserLocalPersistence, type Persistence } from 'firebase/auth';

/** Persistência da sessão na web (localStorage do navegador). */
export const authPersistence: Persistence = browserLocalPersistence;
