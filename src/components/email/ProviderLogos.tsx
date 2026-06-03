/**
 * Logos oficiais dos provedores de e-mail.
 * SVGs inline pra renderizar sem dependência externa.
 */
import type { SVGProps } from "react";

export function GmailLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22 5.46v13.08c0 .7-.46 1.16-1.16 1.16h-3.06V10.5l-5.78 4.16L6.22 10.5v9.2H3.16C2.46 19.7 2 19.24 2 18.54V5.46c0-.35.12-.65.35-.88s.53-.35.81-.35h.99l6.85 5.13L17.85 4.23h.99c.35 0 .65.12.81.35.23.23.35.53.35.88z" fill="#4285F4"/>
      <path d="M22 5.46c0-.35-.12-.65-.35-.88-.16-.23-.46-.35-.81-.35h-.99l-6.85 5.13L6.15 4.23h-.99c-.28 0-.58.12-.81.35-.23.23-.35.53-.35.88l.06.93L11 11.04l6.94-4.65.06-.93z" fill="#EA4335"/>
      <path d="M17.78 4.23 11 9.39 4.22 4.23h13.56z" fill="none"/>
      <path d="M2 5.46v13.08c0 .7.46 1.16 1.16 1.16h3.06V10.5L2 7.34V5.46z" fill="#34A853"/>
      <path d="M22 5.46v1.88L17.78 10.5v9.2h3.06c.7 0 1.16-.46 1.16-1.16V5.46z" fill="#FBBC04"/>
      <path d="M22 5.46 11 13.5 0 5.46c.05-.74.46-1.23 1.16-1.23h.93l8.91 6.5 8.91-6.5h.93c.7 0 1.11.49 1.16 1.23z" fill="#C5221F" opacity=".1"/>
    </svg>
  );
}

export function OutlookLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M21.6 4H10.4c-.22 0-.4.18-.4.4v2.4H4.4c-.22 0-.4.18-.4.4v12.8c0 .22.18.4.4.4h17.2c.22 0 .4-.18.4-.4V4.4c0-.22-.18-.4-.4-.4z" fill="#0078D4"/>
      <path d="M9.5 8.4c-1.8 0-3.3 1.5-3.3 3.3s1.5 3.3 3.3 3.3 3.3-1.5 3.3-3.3-1.5-3.3-3.3-3.3zm0 5.3c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="#fff"/>
      <path d="M14 7v9.7c0 .3.2.5.4.6l5.6 1.7c.4.1.8-.2.8-.6V7.4c0-.4-.3-.7-.7-.7H14z" fill="#50D9FF" opacity=".4"/>
      <path d="M14 7v9.7c0 .3.2.5.4.6l5.6 1.7V7.7c0-.4-.3-.7-.7-.7H14z" fill="#28A8EA"/>
    </svg>
  );
}

export function MicrosoftLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <rect x="2" y="2" width="9.5" height="9.5" fill="#F25022"/>
      <rect x="12.5" y="2" width="9.5" height="9.5" fill="#7FBA00"/>
      <rect x="2" y="12.5" width="9.5" height="9.5" fill="#00A4EF"/>
      <rect x="12.5" y="12.5" width="9.5" height="9.5" fill="#FFB900"/>
    </svg>
  );
}

export function GoogleLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}
