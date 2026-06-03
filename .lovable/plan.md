Implementarei a integração de autenticação do Outlook (Microsoft Graph API) seguindo o padrão já existente do Gmail. Isso inclui a atualização das Edge Functions de OAuth e o ajuste do formulário no frontend para suportar o fluxo real do Outlook.

### Mudanças Técnicas

1.  **Configuração de Segredos (Secrets):**
    *   Será necessário adicionar `MICROSOFT_OAUTH_CLIENT_ID`, `MICROSOFT_OAUTH_CLIENT_SECRET` e `MICROSOFT_OAUTH_REDIRECT_URI` via ferramenta de secrets.

2.  **Edge Functions:**
    *   **`email-oauth-start`**: Atualizada para suportar `provider: "outlook"`, gerando a URL de autorização da Microsoft com os escopos: `offline_access openid profile User.Read Mail.Read Mail.ReadWrite Mail.Send`.
    *   **`email-oauth-callback`**: Atualizada para identificar o provider vindo do `state`, realizar a troca do `code` pelo token na Microsoft e buscar o perfil do usuário via Graph API (`/me`).

3.  **Frontend (`EmailProviderDialog.tsx`):**
    *   Habilitar o fluxo real para `providerId === "outlook"`.
    *   Remover avisos de "em construção" para o Outlook.
    *   Ajustar a interface para refletir que o redirecionamento será para a Microsoft.

4.  **Página de Listagem (`Email.tsx`):**
    *   Atualizar as mensagens de sucesso/erro para serem genéricas ou específicas por provedor.
    *   Habilitar o botão "Abrir" para contas Outlook, já que elas usarão o mesmo layout de Inbox.

### Próximos Passos
Após aprovação do plano, solicitarei os segredos e farei a implementação simultânea dos arquivos.

````text
Fluxo:
Usuário clica em Outlook -> Abre Dialog -> Clica em Autorizar -> Vai para Microsoft
-> Volta para Callback -> Salva no Banco -> Redireciona para Inbox
````
