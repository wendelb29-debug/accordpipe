---
name: Accord Academy EAD Module
description: Module de treinamento EAD multi-tenant com cursos globais e do tenant, categorias, aulas com vídeo, progresso do usuário e área administrativa
type: feature
---

O Accord Academy é o módulo de EAD/treinamento integrado ao sistema com suporte multi-tenant.

**Estrutura de dados:**
- `academy_categories` — categorias com scope global/tenant
- `academy_courses` — cursos vinculados a categorias, com nível, duração, thumbnail
- `academy_lessons` — aulas com vídeo (YouTube/Vimeo/direto), conteúdo HTML, anexo PDF
- `academy_progress` — progresso individual por usuário (unique: user_id + lesson_id)

**Regras de escopo:**
- `scope_type = 'global'`: conteúdo da plataforma Accord, criado apenas por master
- `scope_type = 'tenant'`: conteúdo interno do tenant, isolado por tenant_id
- Conteúdos globais publicados são visíveis por todos os tenants
- Progresso é exclusivo do usuário (RLS: user_id = auth.uid())

**Telas:**
- Home da Academy (`/academy`): banner, busca, filtros por categoria, "continuar assistindo", cursos globais/tenant
- Detalhe do curso: capa, progresso, lista de aulas, CTA continuar
- Visualizador de aula: player de vídeo, conteúdo, anexo, marcar como concluída, navegação prev/next
- Admin (aba Gestão): CRUD de categorias, cursos e aulas (master/CEO)

**Fases pendentes (Fase 2 e 3):**
- Cursos obrigatórios
- Filtros avançados
- Relatórios de progresso
- Notificações de curso pendente
