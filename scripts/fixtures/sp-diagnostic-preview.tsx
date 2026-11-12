import { createRoot } from 'react-dom/client';
import { SpDiagnosticExport } from '../../src/features/relatorios-institucionais/sp/SpDiagnosticExport';
import { buildSpTemporalPreview } from '../../src/features/relatorios-institucionais/sp/temporal';
import { recordedInput } from '../../src/features/relatorios-institucionais/sp/__tests__/recorded';
import '../../src/index.css';

// Offline UI check only. No token, API call or real market generation.
const report = buildSpTemporalPreview(recordedInput(), '3T2026');
createRoot(document.getElementById('root')!).render(<main className="p-6"><SpDiagnosticExport report={report}/></main>);
