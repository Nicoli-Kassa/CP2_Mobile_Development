import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, type Persistence } from 'firebase/auth';

/**
 * Persistência da sessão em iOS/Android.
 *
 * Sem isso o Firebase Auth usaria memória e a pessoa precisaria fazer login
 * toda vez que o app fosse aberto. O arquivo `authPersistence.web.ts` é
 * escolhido automaticamente pelo Metro quando a plataforma é web.
 */
export const authPersistence: Persistence = getReactNativePersistence(AsyncStorage);
