import { useState } from 'react';
import { Database, Info } from 'lucide-react';
import { QuantiDashboard } from '@/features/area-quanti/dashboard/QuantiDashboard';
import '@/features/area-quanti/dashboard/dashboard.css';

type Tab = 'banco' | 'sobre';

export default function AreaQuanti() {
  const [tab, setTab] = useState<Tab>('banco');

  return (
    <div className="qd-root flex h-full min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--qd-border)] bg-[var(--qd-area-topbar-bg)] px-4">
        <TabButton active={tab === 'banco'} onClick={() => setTab('banco')} icon={<Database className="h-3.5 w-3.5" />}>
          Banco Quanti
        </TabButton>
        <TabButton active={tab === 'sobre'} onClick={() => setTab('sobre')} icon={<Info className="h-3.5 w-3.5" />}>
          Sobre
        </TabButton>
      </div>

      {tab === 'banco' && <QuantiDashboard />}
      {tab === 'sobre' && (
        <div className="mx-auto max-w-2xl p-6 text-sm text-[var(--qd-text-muted)] space-y-3">
          <h1 className="text-lg font-semibold text-[var(--qd-text)]">Área Quanti</h1>
          <p>
            Ambiente de análise exploratória sobre as bases quantitativas da Brain. A aba <strong className="text-[var(--qd-text)]">Banco Quanti</strong> traz um dashboard 100% interativo sobre a <em>Base Unificada 2020</em>.
          </p>
          <p>
            A arquitetura está preparada para novas bases (2019, 2021, 2022…): basta gerar o JSON com o mesmo esquema e registrá-lo em <code>datasets.ts</code>.
          </p>
        </div>
      )}
    </div>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'border-[var(--qd-tab-active)] text-[var(--qd-tab-active)]'
          : 'border-transparent text-[var(--qd-tab-inactive)] hover:text-[var(--qd-tab-inactive-hover)]'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}
