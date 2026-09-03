import { Building2, Clock3 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/** Contrato visual inerte: não dispara rede, banco ou provider de Empresas. */
export default function CompaniesPlaceholder() {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Building2 className="h-4 w-4" />
          Empresas
          <Badge variant="outline" className="ml-auto">Em preparação</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"><Clock3 className="h-5 w-5" /></span>
        <div>
          <p className="font-medium">Relatório de empresas em preparação</p>
          <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">Esta aba ainda não consulta Receita Federal, banco de dados ou serviços externos.</p>
        </div>
      </CardContent>
    </Card>
  );
}

