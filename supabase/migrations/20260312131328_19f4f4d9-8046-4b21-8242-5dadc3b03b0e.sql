
CREATE TABLE public.vendas_orbit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id TEXT NOT NULL,
    mentor_nome TEXT NOT NULL,
    aluno_nome TEXT NOT NULL,
    aluno_email TEXT NOT NULL,
    produto TEXT NOT NULL,
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0,
    transacao_id TEXT UNIQUE NOT NULL,
    gateway TEXT NOT NULL DEFAULT 'webhook',
    data_venda TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vendas_orbit_mentor_id ON public.vendas_orbit (mentor_id);
CREATE INDEX idx_vendas_orbit_data_venda ON public.vendas_orbit (data_venda);
CREATE INDEX idx_vendas_orbit_transacao_id ON public.vendas_orbit (transacao_id);

ALTER TABLE public.vendas_orbit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage orbit sales" ON public.vendas_orbit
FOR ALL TO authenticated
USING (is_admin(auth.uid()) OR is_master(auth.uid()))
WITH CHECK (is_admin(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Admins can view orbit sales" ON public.vendas_orbit
FOR SELECT TO authenticated
USING (is_admin(auth.uid()) OR is_master(auth.uid()));

CREATE POLICY "Service can insert orbit sales" ON public.vendas_orbit
FOR INSERT TO anon
WITH CHECK (true);
