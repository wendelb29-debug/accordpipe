---
name: Reseller Panel Auto-Enable
description: Painel da Revenda habilitado automaticamente quando modo revendedor é ativado no tenant, com rota /minha-revenda e sidebar dinâmica
type: feature
---
- Campo `reseller_panel_enabled` (boolean) adicionado à tabela `companies`
- Ao ativar modo revenda no ResellerTab, `reseller_panel_enabled` é setado automaticamente para true
- Rota `/minha-revenda` → página MinhaRevenda com KPIs, tabela de tenants filhos, ações
- Sidebar (desktop e mobile) exibe "Painel da Revenda" apenas quando `is_reseller = true` E `reseller_panel_enabled = true`
- Página MinhaRevenda faz check próprio de acesso e exibe "Acesso Negado" se não autorizado
- Rota `/meus-tenants` permanece como alternativa legada
- Tradução i18n: `nav.resellerPanel` em pt-BR, en, es, pt-PT
