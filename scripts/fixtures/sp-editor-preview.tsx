import {createRoot} from 'react-dom/client';
import '../../src/index.css';
import {SpReportPages} from '../../src/features/relatorios-institucionais/sp/SpReportPages';
import {buildSpTemporalPreview} from '../../src/features/relatorios-institucionais/sp/temporal';
import {recordedInput} from '../../src/features/relatorios-institucionais/sp/__tests__/recorded';
const report=buildSpTemporalPreview(recordedInput(),'3T2026');
createRoot(document.getElementById('root')!).render(<SpReportPages report={report}/>);
