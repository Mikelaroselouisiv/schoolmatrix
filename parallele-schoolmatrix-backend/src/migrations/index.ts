import { InitialSchema1739000000000 } from './1739000000000-InitialSchema';
import { InitialBusinessSchema1738000000000 } from './1738000000000-InitialBusinessSchema';
import { FileMetadata1739000000001 } from './1739000000001-FileMetadata';
import { FinanceAndFeeServiceNature1739000000002 } from './1739000000002-FinanceAndFeeServiceNature';

/** Liste des migrations (ordre d’exécution). Utilisée par l’app au démarrage (migrationsRun). */
export const migrations = [
  InitialBusinessSchema1738000000000,
  InitialSchema1739000000000,
  FileMetadata1739000000001,
  FinanceAndFeeServiceNature1739000000002,
];
