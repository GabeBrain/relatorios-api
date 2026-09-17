CREATE TABLE public.empresas_materialize_pedido (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  id_municipio CHAR(7) NOT NULL,
  competencia DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT ALL ON public.empresas_materialize_pedido TO service_role;

ALTER TABLE public.empresas_materialize_pedido ENABLE ROW LEVEL SECURITY;

CREATE INDEX empresas_materialize_pedido_ip_idx ON public.empresas_materialize_pedido (ip_hash, created_at DESC);
CREATE INDEX empresas_materialize_pedido_recent_idx ON public.empresas_materialize_pedido (created_at DESC);
CREATE INDEX empresas_materialize_pedido_municipio_idx ON public.empresas_materialize_pedido (id_municipio, competencia, created_at DESC);

CREATE OR REPLACE FUNCTION public.empresas_pedido_touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_empresas_materialize_pedido_updated_at
BEFORE UPDATE ON public.empresas_materialize_pedido
FOR EACH ROW EXECUTE FUNCTION public.empresas_pedido_touch_updated_at();