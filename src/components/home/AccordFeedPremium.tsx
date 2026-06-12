/**
 * Accord Feed Social Premium
 * Reprodução fiel do preview HTML (preview-feed-social-premium.html).
 * Todos os estilos usam prefixo `afp-` para evitar conflito com o restante do app.
 */
export function AccordFeedPremium() {
  return (
    <div className="afp-root">
      <style>{CSS}</style>

      <div className="afp-shell">
        {/* ═══════ COLUNA FEED ═══════ */}
        <div className="afp-feed-col">
          {/* HERO */}
          <div className="afp-hero">
            <div className="afp-hero-content">
              <div className="afp-hero-greeting">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                </svg>
                Sexta-feira · 12 de junho
              </div>
              <h1 className="afp-hero-title">Bom dia, Wendel 👋</h1>
              <p className="afp-hero-sub">
                A equipe fechou <strong>R$ 47.5k</strong> esta semana e há 8 colegas conectados agora. Compartilhe uma novidade.
              </p>

              <div className="afp-hero-actions">
                <button className="afp-hero-btn afp-hero-btn-primary">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}>
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  Novo post
                </button>
                <button className="afp-hero-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                  Agendar evento
                </button>
              </div>

              <div className="afp-hero-stats">
                {[
                  ["14", "Posts hoje"],
                  ["8", "Online agora"],
                  ["3", "Eventos esta semana"],
                  ["R$ 47k", "Faturamento semana"],
                ].map(([v, l]) => (
                  <div className="afp-hero-stat" key={l}>
                    <span className="afp-hero-stat-value">{v}</span>
                    <span className="afp-hero-stat-label">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* STORIES */}
          <div className="afp-stories">
            <div className="afp-story">
              <div className="afp-story-ring afp-create">
                <div className="afp-story-pic">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
              </div>
              <span className="afp-story-name" style={{ color: "#a5b4fc", fontWeight: 600 }}>Adicionar</span>
            </div>

            {[
              { initials: "WS", cls: "", name: "Você", checked: true },
              { initials: "MC", cls: "b", name: "Marina" },
              { initials: "PS", cls: "p", name: "Pedro" },
              { initials: "JP", cls: "a", name: "João" },
              { initials: "RA", cls: "c", name: "Rafa" },
              { initials: "LM", cls: "v", name: "Lucas", viewed: true },
              { initials: "AT", cls: "", name: "Ana", viewed: true },
            ].map((s) => (
              <div className="afp-story" key={s.name}>
                <div className={`afp-story-ring ${s.viewed ? "afp-viewed" : ""}`}>
                  <div className="afp-story-inner">
                    <div className={`afp-story-pic ${s.cls}`}>{s.initials}</div>
                  </div>
                  {s.checked && (
                    <div className="afp-story-badge">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="afp-story-name">{s.name}</span>
              </div>
            ))}
          </div>

          {/* FILTROS */}
          <div className="afp-filters">
            {[
              { label: "Tudo", count: 42, active: true, icon: <><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /></> },
              { label: "Posts", count: 28, icon: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /> },
              { label: "Eventos", count: 3, icon: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></> },
              { label: "Conquistas", count: 7, icon: <path d="M12 2 9 9l-7 1 5 5-1 7 6-3 6 3-1-7 5-5-7-1-3-7z" /> },
              { label: "Anúncios", count: 4, icon: <><path d="m3 11 18-5v12L3 14v-3z" /><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" /></> },
            ].map((f) => (
              <button key={f.label} className={`afp-filter-pill ${f.active ? "afp-active" : ""}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">{f.icon}</svg>
                {f.label}
                <span className="afp-filter-pill-count">{f.count}</span>
              </button>
            ))}
          </div>

          {/* COMPOSER */}
          <div className="afp-composer">
            <div className="afp-composer-top">
              <div className="afp-composer-avatar">WS</div>
              <div className="afp-composer-input">No que está pensando, Wendel?</div>
            </div>
            <div className="afp-composer-tabs">
              <button className="afp-composer-tab">
                <svg className="afp-t-msg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Mensagem
              </button>
              <button className="afp-composer-tab">
                <svg className="afp-t-fil" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></svg>
                Foto
              </button>
              <button className="afp-composer-tab">
                <svg className="afp-t-evt" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
                Evento
              </button>
              <button className="afp-composer-tab">
                <svg className="afp-t-pol" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" /></svg>
                Enquete
              </button>
              <button className="afp-composer-tab">
                <svg className="afp-t-vid" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                Vídeo
              </button>
            </div>
          </div>

          {/* MILESTONE */}
          <div className="afp-milestone-card">
            <div className="afp-milestone-header">
              <div className="afp-milestone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2Z" />
                </svg>
              </div>
              <div>
                <div className="afp-milestone-title">🎉 CONQUISTA · NOVO RECORD</div>
                <div className="afp-milestone-headline">Marina bateu meta com 142% e fechou a maior venda do mês</div>
              </div>
            </div>

            <div className="afp-milestone-body">
              <div className="afp-milestone-protag">MC</div>
              <div className="afp-milestone-protag-info">
                <div className="afp-milestone-protag-name">Marina Costa</div>
                <div className="afp-milestone-protag-role">Executiva de Contas · Vendas Comercial</div>
                <div className="afp-milestone-value">R$ 47.500,00</div>
              </div>
            </div>

            <div className="afp-milestone-celebrate">
              <div className="afp-celebrate-stack">
                <div className="afp-celebrate-emoji">🎉</div>
                <div className="afp-celebrate-emoji">👏</div>
                <div className="afp-celebrate-emoji">🔥</div>
                <div className="afp-celebrate-emoji">🚀</div>
              </div>
              <span className="afp-celebrate-text">Você + 23 colegas celebraram</span>
              <button className="afp-celebrate-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}>
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Celebrar
              </button>
            </div>
          </div>

          {/* ANÚNCIO */}
          <div className="afp-announce-card">
            <div className="afp-announce-header">
              <div className="afp-announce-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z" />
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
                </svg>
              </div>
              <div className="afp-announce-info">
                <span className="afp-announce-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" width={9} height={9}>
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  ANÚNCIO OFICIAL · DIRETORIA
                </span>
                <div className="afp-announce-title">Festa de fim de ano confirmada para 14 de dezembro 🥂</div>
                <div className="afp-announce-body">
                  Reservamos o salão do <strong>Hotel Tivoli</strong> a partir das 19h. Open bar, jantar, sorteios e premiação dos colaboradores destaque de 2026. Convites individuais serão enviados por e-mail até dia 30/11.
                </div>
              </div>
            </div>
          </div>

          {/* POST com imagem */}
          <div className="afp-post-card">
            <div className="afp-post-header">
              <div className="afp-av-ring afp-pink">
                <div className="afp-av-inner"><div className="afp-av-pic afp-pink">JP</div></div>
                <div className="afp-av-online" />
              </div>
              <div className="afp-post-author-info">
                <div className="afp-post-author-line1">
                  João Pereira
                  <span className="afp-post-role-tag">Marketing</span>
                </div>
                <div className="afp-post-author-line2">
                  <span>Para todos os colaboradores</span>
                  <span className="afp-post-time-dot">·</span>
                  <span>há 2 horas</span>
                </div>
              </div>
              <span className="afp-post-pin">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="17" x2="12" y2="22" />
                  <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z" />
                </svg>
                FIXADO
              </span>
              <button className="afp-post-menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
              </button>
            </div>

            <div className="afp-post-content">
              Pessoal, lançamos a campanha de <span className="afp-hashtag">#BlackFriday2026</span> 🛍️ — material visual já disponível na pasta compartilhada do <span className="afp-mention">@time-marketing</span>. Quem puder revisar os assets até quinta às 17h, super agradecemos!
            </div>

            <div className="afp-post-media">
              <span className="afp-post-media-watermark">BLACK FRIDAY</span>
            </div>

            <div className="afp-post-tags">
              <span className="afp-post-tag">#BlackFriday2026</span>
              <span className="afp-post-tag">#Marketing</span>
              <span className="afp-post-tag">#Campanhas</span>
            </div>

            <div className="afp-post-reactions-summary">
              <div className="afp-reactions-stack">
                <div className="afp-reaction-pill afp-r-bg-red">❤️</div>
                <div className="afp-reaction-pill afp-r-bg-amber">🔥</div>
                <div className="afp-reaction-pill afp-r-bg-blue">👏</div>
              </div>
              <span>Você + 47 reações · 12 comentários · 5 compartilhamentos</span>
            </div>

            <div className="afp-post-actions">
              <button className="afp-action-btn afp-liked">
                <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                Curtir
                <div className="afp-reactions-popup">
                  {["❤️","😀","🎉","👏","🔥","🚀","💯"].map(e => <div key={e} className="afp-reaction-emoji">{e}</div>)}
                </div>
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Comentar
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Compartilhar
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                Salvar
              </button>
            </div>

            <div className="afp-post-comments">
              <div className="afp-comment">
                <div className="afp-comment-av">MC</div>
                <div style={{ flex: 1 }}>
                  <div className="afp-comment-bubble">
                    <div className="afp-comment-author">Marina Costa</div>
                    <div className="afp-comment-text">Boa! Os materiais ficaram lindos 🔥 Já comecei a revisão.</div>
                  </div>
                  <div className="afp-comment-actions">
                    <span>Curtir · 4</span>
                    <span>Responder</span>
                    <span>há 38min</span>
                  </div>
                </div>
              </div>

              <div className="afp-comment">
                <div className="afp-comment-av" style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)" }}>PS</div>
                <div style={{ flex: 1 }}>
                  <div className="afp-comment-bubble">
                    <div className="afp-comment-author">Pedro Santos</div>
                    <div className="afp-comment-text">Mando o relatório de performance até 6ª. Boa, time!</div>
                  </div>
                  <div className="afp-comment-actions">
                    <span>Curtir · 2</span>
                    <span>Responder</span>
                    <span>há 1h</span>
                  </div>
                </div>
              </div>

              <div className="afp-comment-input-row">
                <div className="afp-comment-av" style={{ background: "linear-gradient(135deg,#10b981,#059669)", width: 30, height: 30, borderRadius: 10 }}>WS</div>
                <input className="afp-comment-input" placeholder="Escrever comentário..." />
              </div>
            </div>
          </div>

          {/* EVENTO */}
          <div className="afp-event-card">
            <div className="afp-event-banner">
              <div className="afp-event-date-block">
                <div className="afp-event-date-month">Jun</div>
                <div className="afp-event-date-day">18</div>
                <div className="afp-event-date-time">15h</div>
              </div>
              <div className="afp-event-banner-text">
                <div className="afp-event-banner-title">All Hands · Q2 2026</div>
                <div className="afp-event-banner-sub">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></svg>
                  Google Meet · 60 min
                </div>
              </div>
            </div>

            <div className="afp-event-body">
              <div className="afp-event-attendees">
                <div className="afp-attendee-stack">
                  <div className="afp-attendee">WS</div>
                  <div className="afp-attendee afp-g">MC</div>
                  <div className="afp-attendee afp-b">JP</div>
                  <div className="afp-attendee afp-p">PS</div>
                  <div className="afp-attendee afp-more">+18</div>
                </div>
                <span className="afp-event-attendees-text">
                  <strong>22 confirmados</strong> · 5 talvez · 3 não vão
                </span>
              </div>

              <div className="afp-event-actions">
                <button className="afp-event-btn afp-confirm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><polyline points="20 6 9 17 4 12" /></svg>
                  Vou participar
                </button>
                <button className="afp-event-btn afp-maybe">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01" /></svg>
                  Talvez
                </button>
                <button className="afp-event-btn afp-maybe">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  Não vou
                </button>
              </div>
            </div>
          </div>

          {/* POST simples */}
          <div className="afp-post-card">
            <div className="afp-post-header">
              <div className="afp-av-ring afp-blue">
                <div className="afp-av-inner"><div className="afp-av-pic afp-blue">MC</div></div>
                <div className="afp-av-online" />
              </div>
              <div className="afp-post-author-info">
                <div className="afp-post-author-line1">
                  Marina Costa
                  <span className="afp-post-role-tag" style={{ background: "rgba(16,185,129,.15)", color: "#34d399" }}>Vendas</span>
                </div>
                <div className="afp-post-author-line2">
                  <span>Pra time-vendas</span>
                  <span className="afp-post-time-dot">·</span>
                  <span>há 4 horas</span>
                </div>
              </div>
              <button className="afp-post-menu">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>
              </button>
            </div>

            <div className="afp-post-content">
              Galera, dica top: usem o filtro de <strong>"Sem atividade há 7 dias"</strong> no pipeline. Achei 12 leads esquecidos esta manhã e já agendei follow-up com todos. <span className="afp-mention">@equipe-comercial</span>
            </div>

            <div className="afp-post-reactions-summary">
              <div className="afp-reactions-stack">
                <div className="afp-reaction-pill afp-r-bg-red">💡</div>
                <div className="afp-reaction-pill afp-r-bg-amber">🔥</div>
              </div>
              <span>18 reações · 4 comentários</span>
            </div>

            <div className="afp-post-actions">
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                Curtir
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                Comentar
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></svg>
                Compartilhar
              </button>
              <button className="afp-action-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>
                Salvar
              </button>
            </div>
          </div>
        </div>

        {/* ═══════ SIDEBAR ═══════ */}
        <div className="afp-side-col">
          {/* QUICK STATS */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>
              Você esta semana
            </div>
            <div className="afp-quick-stats">
              {[
                ["12", "Posts"],
                ["147", "Reações"],
                ["34", "Comentários"],
                ["8", "Compart."],
              ].map(([v, l]) => (
                <div className="afp-quick-stat" key={l}>
                  <div className="afp-quick-stat-value">{v}</div>
                  <div className="afp-quick-stat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ONLINE AGORA */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" fill="currentColor" /></svg>
              Online agora · 8
            </div>
            {[
              { name: "Marina Costa", initials: "MC", status: "Disponível", bg: "linear-gradient(135deg,#3b82f6,#1d4ed8)" },
              { name: "Pedro Santos", initials: "PS", status: "Disponível", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
              { name: "João Pereira", initials: "JP", status: "Em reunião", bg: "linear-gradient(135deg,#f59e0b,#d97706)" },
              { name: "Rafa Almeida", initials: "RA", status: "Disponível", bg: "linear-gradient(135deg,#06b6d4,#0891b2)" },
            ].map((p) => (
              <div className="afp-online-row" key={p.name}>
                <div className="afp-online-av" style={{ background: p.bg }}>{p.initials}</div>
                <div className="afp-online-info">
                  <div className="afp-online-name">{p.name}</div>
                  <div className="afp-online-status"><span className="afp-online-dot" /> {p.status}</div>
                </div>
                <button className="afp-msg-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </button>
              </div>
            ))}
          </div>

          {/* SUGGESTIONS */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" /></svg>
              Colegas pra conhecer
              <span className="afp-side-title-action">Ver todos</span>
            </div>
            {[
              { name: "Lucas Martins", initials: "LM", role: "Engenheiro · TI", bg: "linear-gradient(135deg,#8b5cf6,#6d28d9)" },
              { name: "Ana Tavares", initials: "AT", role: "Design · UX", bg: "linear-gradient(135deg,#ec4899,#be185d)" },
              { name: "Ricardo Barbosa", initials: "RB", role: "Financeiro · CFO", bg: "linear-gradient(135deg,#06b6d4,#0891b2)" },
            ].map((p) => (
              <div className="afp-suggest-row" key={p.name}>
                <div className="afp-suggest-av" style={{ background: p.bg }}>{p.initials}</div>
                <div className="afp-suggest-info">
                  <div className="afp-suggest-name">{p.name}</div>
                  <div className="afp-suggest-role">{p.role}</div>
                </div>
                <button className="afp-follow-btn">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="M12 5v14M5 12h14" /></svg>
                  Seguir
                </button>
              </div>
            ))}
          </div>

          {/* TRENDING */}
          <div className="afp-side-card">
            <div className="afp-side-title">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></svg>
              Em alta no Accord
            </div>
            {[
              ["#BlackFriday2026", "28 posts · esta semana", "+124%"],
              ["#MetaBatida", "17 posts · esta semana", "+47%"],
              ["#OnboardingNovo", "9 posts · esta semana", "+18%"],
              ["#ClienteSatisfeito", "7 posts · esta semana", "+12%"],
            ].map(([name, meta, trend]) => (
              <div className="afp-tag-row" key={name}>
                <div className="afp-tag-info">
                  <div className="afp-tag-name">{name}</div>
                  <div className="afp-tag-meta">{meta}</div>
                </div>
                <span className="afp-tag-trend">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}><path d="m6 9 6-6 6 6" /></svg>
                  {trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const CSS = `
.afp-root{
  font-family:'Inter',system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;
  letter-spacing:-.011em;
  background:hsl(var(--background));color:hsl(var(--foreground));
  min-height:100vh;
  position:relative;
  overflow-x:hidden;
}
.afp-root *{box-sizing:border-box}
.afp-root svg{stroke-width:2;flex-shrink:0}
.afp-root::before{
  content:'';position:absolute;inset:0;pointer-events:none;z-index:0;
  background:
    radial-gradient(900px 600px at 90% -5%, rgba(91,63,212,0.14), transparent 60%),
    radial-gradient(700px 500px at 5% 80%, rgba(45,75,212,0.12), transparent 60%);
}

.afp-shell{
  position:relative;z-index:1;
  max-width:1320px;margin:0 auto;
  display:grid;grid-template-columns:1fr 340px;gap:28px;
  padding:24px 28px 80px;
}
@media(max-width:1100px){.afp-shell{grid-template-columns:1fr;max-width:680px}}
.afp-feed-col{min-width:0}
.afp-side-col{min-width:0}
@media(max-width:1100px){.afp-side-col{display:none}}

/* HERO */
.afp-hero{
  position:relative;overflow:hidden;border-radius:24px;
  background:linear-gradient(135deg,#2d4bd4 0%,#5b3fd4 60%,#7c3aed 100%);
  padding:28px 30px 30px;margin-bottom:20px;
  box-shadow:0 20px 50px -20px rgba(91,63,212,.55);
}
.afp-hero::after{
  content:'';position:absolute;top:-50%;right:-20%;width:60%;height:200%;
  background:radial-gradient(circle,rgba(255,255,255,.15),transparent 70%);
  pointer-events:none;
}
.afp-hero-content{position:relative;z-index:1}
.afp-hero-greeting{
  font-size:11px;font-weight:700;letter-spacing:.10em;
  color:hsl(var(--foreground));text-transform:uppercase;margin-bottom:8px;
  display:inline-flex;align-items:center;gap:6px;
}
.afp-hero-greeting svg{width:11px;height:11px}
.afp-hero-title{font-size:28px;font-weight:800;letter-spacing:-.025em;color:#fff;line-height:1.15;margin-bottom:6px}
.afp-hero-sub{font-size:13.5px;color:rgba(255,255,255,.78);max-width:480px;line-height:1.5}
.afp-hero-actions{display:flex;align-items:center;gap:10px;margin-top:16px}
.afp-hero-btn{
  height:38px;padding:0 16px;border-radius:11px;
  background:rgba(255,255,255,.18);backdrop-filter:blur(10px);
  border:1px solid rgba(255,255,255,.25);color:hsl(var(--foreground));
  font-size:12.5px;font-weight:700;cursor:pointer;
  display:inline-flex;align-items:center;gap:6px;font-family:inherit;
}
.afp-hero-btn svg{width:13px;height:13px}
.afp-hero-btn-primary{background:#fff;color:#2d4bd4;border-color:hsl(var(--foreground))}
.afp-hero-stats{
  display:flex;align-items:center;gap:18px;margin-top:14px;
  padding-top:14px;border-top:1px solid rgba(255,255,255,.18);
}
.afp-hero-stat{display:flex;flex-direction:column}
.afp-hero-stat-value{font-size:18px;font-weight:800;color:#fff;letter-spacing:-.02em}
.afp-hero-stat-label{font-size:10.5px;font-weight:600;color:#fff;text-transform:uppercase;letter-spacing:.05em}

/* STORIES */
.afp-stories{display:flex;gap:11px;padding:14px 4px;overflow-x:auto;margin-bottom:18px;scrollbar-width:none}
.afp-stories::-webkit-scrollbar{display:none}
.afp-story{flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:5px;cursor:pointer}
.afp-story-ring{width:62px;height:62px;border-radius:99px;padding:2.5px;background:linear-gradient(135deg,#f59e0b,#ec4899,#5b3fd4);position:relative}
.afp-story-ring.afp-viewed{background:hsl(var(--muted))}
.afp-story-ring.afp-create{background:transparent;border:2px dashed hsl(var(--border))}
.afp-story-inner{width:100%;height:100%;border-radius:99px;background:hsl(var(--background));padding:2.5px}
.afp-story-pic{width:100%;height:100%;border-radius:99px;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:18px}
.afp-story-pic.b{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.afp-story-pic.p{background:linear-gradient(135deg,#ec4899,#be185d)}
.afp-story-pic.a{background:linear-gradient(135deg,#f59e0b,#d97706)}
.afp-story-pic.c{background:linear-gradient(135deg,#06b6d4,#0891b2)}
.afp-story-pic.v{background:linear-gradient(135deg,#8b5cf6,#6d28d9)}
.afp-story-ring.afp-create .afp-story-pic{background:hsl(var(--muted));color:hsl(var(--muted-foreground));display:flex;align-items:center;justify-content:center}
.afp-story-ring.afp-create .afp-story-pic svg{width:24px;height:24px;stroke-width:2.5}
.afp-story-name{font-size:10.5px;color:hsl(var(--muted-foreground));max-width:70px;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-story-badge{position:absolute;bottom:0;right:0;width:18px;height:18px;border-radius:99px;background:#10b981;border:2.5px solid hsl(var(--background));display:flex;align-items:center;justify-content:center;color:#fff;font-size:8px}
.afp-story-badge svg{width:8px;height:8px;stroke-width:3}

/* FILTROS */
.afp-filters{display:flex;align-items:center;gap:6px;padding:5px;border-radius:12px;background:hsl(var(--muted) / 0.4);border:1px solid hsl(var(--border));margin-bottom:18px;overflow-x:auto}
.afp-filter-pill{height:32px;padding:0 12px;border-radius:8px;font-size:12px;font-weight:600;color:hsl(var(--muted-foreground));cursor:pointer;border:none;background:transparent;display:inline-flex;align-items:center;gap:5px;font-family:inherit;white-space:nowrap;flex-shrink:0}
.afp-filter-pill svg{width:13px;height:13px}
.afp-filter-pill.afp-active{background:linear-gradient(135deg,#2d4bd4,#5b3fd4);color:#fff;box-shadow:0 4px 12px -4px rgba(91,63,212,.5)}
.afp-filter-pill-count{background:rgba(255,255,255,.18);font-size:9.5px;font-weight:800;padding:1px 5px;border-radius:99px}

/* COMPOSER */
.afp-composer{background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:18px;padding:14px;margin-bottom:20px}
.afp-composer-top{display:flex;gap:12px;align-items:flex-start}
.afp-composer-avatar{width:42px;height:42px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,#10b981,#059669);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:14px}
.afp-composer-input{flex:1;background:hsl(var(--card));border:1px solid hsl(var(--border));border-radius:14px;padding:12px 14px;font-size:13.5px;color:hsl(var(--muted-foreground));cursor:text;min-height:42px;display:flex;align-items:center}
.afp-composer-tabs{display:flex;align-items:center;gap:2px;margin-top:14px;padding-top:14px;border-top:1px solid hsl(var(--muted))}
.afp-composer-tab{flex:1;height:38px;border-radius:10px;background:transparent;border:none;cursor:pointer;font-family:inherit;font-size:11.5px;font-weight:600;color:hsl(var(--muted-foreground));display:inline-flex;align-items:center;justify-content:center;gap:5px;transition:.12s}
.afp-composer-tab:hover{background:hsl(var(--card));color:hsl(var(--foreground))}
.afp-composer-tab svg{width:14px;height:14px}
.afp-t-msg{color:#60a5fa}.afp-t-evt{color:#f59e0b}.afp-t-pol{color:#ec4899}.afp-t-fil{color:#10b981}.afp-t-vid{color:#f43f5e}

/* POST */
.afp-post-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:20px;overflow:hidden;margin-bottom:16px}
.afp-post-header{display:flex;align-items:center;gap:11px;padding:14px 16px}
.afp-av-ring{width:42px;height:42px;border-radius:99px;padding:2px;background:linear-gradient(135deg,#5b3fd4,#7c3aed);flex-shrink:0;position:relative}
.afp-av-ring.afp-gold{background:linear-gradient(135deg,#fbbf24,#f59e0b)}
.afp-av-ring.afp-green{background:linear-gradient(135deg,#10b981,#059669)}
.afp-av-ring.afp-pink{background:linear-gradient(135deg,#ec4899,#be185d)}
.afp-av-ring.afp-blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.afp-av-ring.afp-cyan{background:linear-gradient(135deg,#06b6d4,#0891b2)}
.afp-av-inner{width:100%;height:100%;border-radius:99px;background:hsl(var(--background));padding:2px}
.afp-av-pic{width:100%;height:100%;border-radius:99px;background:linear-gradient(135deg,#5b3fd4,#7c3aed);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px}
.afp-av-pic.afp-gold{background:linear-gradient(135deg,#fbbf24,#f59e0b)}
.afp-av-pic.afp-green{background:linear-gradient(135deg,#10b981,#059669)}
.afp-av-pic.afp-pink{background:linear-gradient(135deg,#ec4899,#be185d)}
.afp-av-pic.afp-blue{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.afp-av-pic.afp-cyan{background:linear-gradient(135deg,#06b6d4,#0891b2)}
.afp-av-online{position:absolute;bottom:-1px;right:-1px;width:13px;height:13px;border-radius:99px;background:#10b981;border:2.5px solid hsl(var(--background))}
.afp-post-author-info{flex:1;min-width:0}
.afp-post-author-line1{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:700;color:hsl(var(--foreground))}
.afp-post-role-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;padding:2px 6px;border-radius:5px;background:rgba(91,63,212,.18);color:#a5b4fc}
.afp-post-author-line2{display:flex;align-items:center;gap:5px;font-size:11px;color:hsl(var(--muted-foreground));margin-top:1px}
.afp-post-time-dot{font-size:8px}
.afp-post-pin{background:rgba(245,158,11,.15);color:#fbbf24;font-size:9px;font-weight:800;padding:3px 7px;border-radius:5px;display:inline-flex;align-items:center;gap:3px;letter-spacing:.05em;text-transform:uppercase}
.afp-post-pin svg{width:9px;height:9px}
.afp-post-menu{background:transparent;border:none;cursor:pointer;width:32px;height:32px;border-radius:8px;color:hsl(var(--muted-foreground));display:flex;align-items:center;justify-content:center}
.afp-post-menu:hover{background:hsl(var(--muted));color:hsl(var(--foreground))}
.afp-post-content{padding:0 16px 14px;font-size:13.5px;line-height:1.6;color:hsl(var(--foreground))}
.afp-mention{color:#a5b4fc;font-weight:600;cursor:pointer}
.afp-hashtag{color:#60a5fa;font-weight:500;cursor:pointer}
.afp-post-media{width:100%;height:340px;background:linear-gradient(135deg,#1e1b4b,#3730a3,#5b3fd4);display:flex;align-items:center;justify-content:center;position:relative}
.afp-post-media-watermark{color:rgba(255,255,255,.18);font-size:60px;font-weight:900;letter-spacing:-.03em}
.afp-post-tags{display:flex;flex-wrap:wrap;gap:5px;padding:0 16px 14px}
.afp-post-tag{background:rgba(91,63,212,.12);color:#a5b4fc;font-size:10.5px;font-weight:600;padding:3px 9px;border-radius:99px;cursor:pointer}
.afp-post-reactions-summary{display:flex;align-items:center;gap:10px;padding:0 16px 10px;font-size:11.5px;color:hsl(var(--muted-foreground))}
.afp-reactions-stack{display:flex;align-items:center}
.afp-reaction-pill{width:22px;height:22px;border-radius:99px;background:hsl(var(--background));border:2px solid hsl(var(--background));display:flex;align-items:center;justify-content:center;font-size:11px;margin-left:-6px}
.afp-reaction-pill:first-child{margin-left:0}
.afp-r-bg-red{background:#fef2f2}.afp-r-bg-amber{background:#fffbeb}.afp-r-bg-blue{background:#eff6ff}

.afp-post-actions{display:flex;align-items:center;gap:2px;padding:6px 8px;border-top:1px solid hsl(var(--muted))}
.afp-action-btn{flex:1;height:36px;border-radius:9px;background:transparent;border:none;cursor:pointer;font-family:inherit;font-size:12px;font-weight:600;color:hsl(var(--muted-foreground));display:inline-flex;align-items:center;justify-content:center;gap:6px;position:relative}
.afp-action-btn:hover{background:hsl(var(--card));color:hsl(var(--foreground))}
.afp-action-btn svg{width:15px;height:15px}
.afp-action-btn.afp-liked{color:#f43f5e}

.afp-reactions-popup{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(8px);background:rgba(15,23,42,0.96);backdrop-filter:blur(14px);border:1px solid hsl(var(--border));border-radius:99px;padding:5px;display:flex;align-items:center;gap:2px;opacity:0;pointer-events:none;transition:.18s;box-shadow:0 16px 40px -12px rgba(0,0,0,.5)}
.afp-action-btn:hover .afp-reactions-popup{opacity:1;pointer-events:auto;transform:translateX(-50%) translateY(0)}
.afp-reaction-emoji{width:36px;height:36px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:22px;cursor:pointer;transition:.14s}
.afp-reaction-emoji:hover{transform:scale(1.4) translateY(-3px)}

.afp-post-comments{padding:10px 14px 14px;border-top:1px solid hsl(var(--muted))}
.afp-comment{display:flex;gap:9px;margin-bottom:10px}
.afp-comment-av{width:30px;height:30px;border-radius:10px;flex-shrink:0;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:10.5px}
.afp-comment-bubble{background:hsl(var(--muted));padding:8px 12px;border-radius:14px;border-top-left-radius:4px;max-width:80%}
.afp-comment-author{font-size:11.5px;font-weight:700;color:hsl(var(--foreground));margin-bottom:1px}
.afp-comment-text{font-size:12px;color:hsl(var(--foreground));line-height:1.45}
.afp-comment-actions{display:flex;gap:12px;font-size:10.5px;color:hsl(var(--muted-foreground));margin-top:3px;font-weight:600}
.afp-comment-actions span{cursor:pointer}
.afp-comment-actions span:hover{color:hsl(var(--foreground))}
.afp-comment-input-row{display:flex;gap:9px;align-items:center;margin-top:8px}
.afp-comment-input{flex:1;height:36px;padding:0 14px;border-radius:18px;background:hsl(var(--card));border:1px solid hsl(var(--border));color:hsl(var(--foreground));font-size:12.5px;font-family:inherit;outline:none}
.afp-comment-input::placeholder{color:hsl(var(--muted-foreground))}

/* MILESTONE */
.afp-milestone-card{background:linear-gradient(135deg,rgba(251,191,36,.10),rgba(245,158,11,.05));border:1px solid rgba(251,191,36,.25);border-radius:20px;padding:18px 18px 14px;margin-bottom:16px;position:relative;overflow:hidden}
.afp-milestone-card::before{content:'';position:absolute;top:-30%;right:-15%;width:50%;height:160%;background:radial-gradient(circle,rgba(251,191,36,.18),transparent 60%);pointer-events:none}
.afp-milestone-header{display:flex;align-items:center;gap:11px;margin-bottom:14px;position:relative}
.afp-milestone-icon{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#fbbf24,#f59e0b);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 22px -6px rgba(245,158,11,.6);flex-shrink:0}
.afp-milestone-icon svg{width:22px;height:22px;color:#fff}
.afp-milestone-title{font-size:11px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:#d97706;margin-bottom:2px}
.afp-milestone-headline{font-size:16px;font-weight:800;color:hsl(var(--foreground));letter-spacing:-.015em}
.afp-milestone-body{display:flex;gap:14px;align-items:center;position:relative}
.afp-milestone-protag{width:60px;height:60px;border-radius:18px;flex-shrink:0;background:linear-gradient(135deg,#ec4899,#be185d);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:20px;box-shadow:0 8px 22px -6px rgba(236,72,153,.5)}
.afp-milestone-protag-info{flex:1;min-width:0}
.afp-milestone-protag-name{font-size:14px;font-weight:800;color:hsl(var(--foreground));letter-spacing:-.01em}
.afp-milestone-protag-role{font-size:11px;color:hsl(var(--muted-foreground));margin-top:1px}
.afp-milestone-value{font-size:24px;font-weight:900;color:#fbbf24;letter-spacing:-.02em;line-height:1;margin-top:6px;font-variant-numeric:tabular-nums}
.afp-milestone-celebrate{display:flex;align-items:center;gap:6px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(251,191,36,.2);position:relative}
.afp-celebrate-stack{display:flex;align-items:center;margin-right:8px}
.afp-celebrate-emoji{width:24px;height:24px;border-radius:99px;background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;font-size:13px;margin-left:-6px;border:2px solid #1c1407}
.afp-celebrate-emoji:first-child{margin-left:0}
.afp-celebrate-text{font-size:11px;color:hsl(var(--foreground));font-weight:600;flex:1}
.afp-celebrate-btn{background:rgba(251,191,36,.18);color:#fbbf24;font-size:11px;font-weight:700;padding:6px 12px;border-radius:99px;border:1px solid rgba(251,191,36,.3);cursor:pointer;display:inline-flex;align-items:center;gap:4px;font-family:inherit}
.afp-celebrate-btn svg{width:11px;height:11px}

/* EVENT */
.afp-event-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:20px;overflow:hidden;margin-bottom:16px}
.afp-event-banner{height:120px;background:linear-gradient(135deg,#0c4a6e 0%,#0369a1 60%,#0ea5e9 100%);position:relative;display:flex;align-items:center;padding:0 18px}
.afp-event-date-block{background:#fff;border-radius:12px;padding:8px 12px;text-align:center;min-width:60px;box-shadow:0 6px 18px -4px rgba(0,0,0,.3)}
.afp-event-date-month{font-size:10px;font-weight:800;color:#dc2626;letter-spacing:.08em;text-transform:uppercase}
.afp-event-date-day{font-size:24px;font-weight:900;color:#0f172a;letter-spacing:-.025em;line-height:1;margin-top:1px}
.afp-event-date-time{font-size:9px;font-weight:700;color:#64748b;margin-top:2px}
.afp-event-banner-text{margin-left:14px;flex:1;min-width:0}
.afp-event-banner-title{font-size:16px;font-weight:800;color:hsl(var(--foreground));letter-spacing:-.015em}
.afp-event-banner-sub{font-size:11.5px;color:hsl(var(--foreground));margin-top:2px;display:inline-flex;align-items:center;gap:5px}
.afp-event-banner-sub svg{width:11px;height:11px}
.afp-event-body{padding:14px 16px}
.afp-event-attendees{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.afp-attendee-stack{display:flex;align-items:center}
.afp-attendee{width:26px;height:26px;border-radius:99px;background:linear-gradient(135deg,#5b3fd4,#7c3aed);border:2px solid hsl(var(--background));display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:9.5px;margin-left:-7px}
.afp-attendee:first-child{margin-left:0}
.afp-attendee.afp-g{background:linear-gradient(135deg,#10b981,#059669)}
.afp-attendee.afp-b{background:linear-gradient(135deg,#3b82f6,#1d4ed8)}
.afp-attendee.afp-p{background:linear-gradient(135deg,#ec4899,#be185d)}
.afp-attendee.afp-more{background:hsl(var(--border));color:#fff;font-size:9px}
.afp-event-attendees-text{font-size:11.5px;color:hsl(var(--muted-foreground));font-weight:500}
.afp-event-attendees-text strong{color:hsl(var(--foreground));font-weight:700}
.afp-event-actions{display:flex;gap:8px}
.afp-event-btn{flex:1;height:36px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:5px;font-family:inherit;border:1px solid}
.afp-event-btn svg{width:13px;height:13px}
.afp-event-btn.afp-confirm{background:linear-gradient(135deg,#10b981,#059669);color:#fff;border-color:transparent;box-shadow:0 6px 16px -4px rgba(16,185,129,.5)}
.afp-event-btn.afp-maybe{background:hsl(var(--card));color:hsl(var(--foreground));border-color:hsl(var(--border))}

/* ANNOUNCE */
.afp-announce-card{background:linear-gradient(135deg,rgba(91,63,212,.12),rgba(45,75,212,.06));border:1px solid rgba(91,63,212,.3);border-radius:20px;padding:16px 18px;margin-bottom:16px;position:relative;overflow:hidden}
.afp-announce-header{display:flex;align-items:flex-start;gap:11px}
.afp-announce-icon{width:42px;height:42px;border-radius:13px;flex-shrink:0;background:linear-gradient(135deg,#2d4bd4,#5b3fd4);display:flex;align-items:center;justify-content:center;box-shadow:0 8px 20px -6px rgba(91,63,212,.5)}
.afp-announce-icon svg{width:20px;height:20px;color:#fff}
.afp-announce-info{flex:1;min-width:0}
.afp-announce-tag{display:inline-flex;align-items:center;gap:4px;background:rgba(91,63,212,.2);color:#a5b4fc;font-size:9.5px;font-weight:800;letter-spacing:.10em;padding:2px 7px;border-radius:5px;text-transform:uppercase;margin-bottom:4px}
.afp-announce-title{font-size:15px;font-weight:800;color:hsl(var(--foreground));letter-spacing:-.015em;line-height:1.3}
.afp-announce-body{font-size:12.5px;color:hsl(var(--foreground));line-height:1.5;margin-top:5px}

/* SIDEBAR */
.afp-side-card{background:hsl(var(--card) / 0.5);border:1px solid hsl(var(--border));border-radius:18px;padding:14px;margin-bottom:14px}
.afp-side-title{display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;letter-spacing:.10em;text-transform:uppercase;color:hsl(var(--muted-foreground));margin-bottom:11px}
.afp-side-title svg{width:11px;height:11px}
.afp-side-title-action{margin-left:auto;font-size:10px;color:#a5b4fc;cursor:pointer;letter-spacing:0;text-transform:none;font-weight:600}

.afp-online-row{display:flex;align-items:center;gap:10px;padding:6px 0}
.afp-online-av{width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11.5px;position:relative}
.afp-online-info{flex:1;min-width:0}
.afp-online-name{font-size:12.5px;font-weight:600;color:hsl(var(--foreground));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-online-status{font-size:10.5px;color:#10b981;font-weight:600;display:inline-flex;align-items:center;gap:4px}
.afp-online-dot{width:6px;height:6px;border-radius:99px;background:#10b981;box-shadow:0 0 0 0 rgba(16,185,129,.6);animation:afp-pulse 1.6s infinite}
@keyframes afp-pulse{0%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}70%{box-shadow:0 0 0 6px rgba(16,185,129,0)}100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}}
.afp-msg-btn{width:32px;height:32px;border-radius:9px;background:rgba(91,63,212,.15);color:#a5b4fc;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center}
.afp-msg-btn svg{width:14px;height:14px}

.afp-suggest-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid hsl(var(--card))}
.afp-suggest-row:last-child{border-bottom:none}
.afp-suggest-av{width:36px;height:36px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:12.5px}
.afp-suggest-info{flex:1;min-width:0}
.afp-suggest-name{font-size:12.5px;font-weight:700;color:hsl(var(--foreground));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-suggest-role{font-size:10.5px;color:hsl(var(--muted-foreground));overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.afp-follow-btn{height:30px;padding:0 11px;border-radius:8px;background:linear-gradient(135deg,#2d4bd4,#5b3fd4);color:#fff;font-size:11px;font-weight:700;border:none;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:4px}
.afp-follow-btn svg{width:11px;height:11px}

.afp-tag-row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;cursor:pointer}
.afp-tag-info{flex:1}
.afp-tag-name{font-size:12.5px;font-weight:700;color:#a5b4fc}
.afp-tag-meta{font-size:10px;color:hsl(var(--muted-foreground));margin-top:1px}
.afp-tag-trend{font-size:10px;font-weight:700;color:#34d399;display:inline-flex;align-items:center;gap:2px}
.afp-tag-trend svg{width:9px;height:9px}

.afp-quick-stats{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.afp-quick-stat{background:hsl(var(--muted) / 0.4);border:1px solid hsl(var(--muted));border-radius:11px;padding:10px}
.afp-quick-stat-value{font-size:18px;font-weight:800;letter-spacing:-.02em;color:hsl(var(--foreground));line-height:1;font-variant-numeric:tabular-nums}
.afp-quick-stat-label{font-size:10px;font-weight:600;color:hsl(var(--muted-foreground));margin-top:4px;display:inline-flex;align-items:center;gap:3px}
`;
