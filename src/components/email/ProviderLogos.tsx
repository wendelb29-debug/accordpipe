// Official provider logos as inline SVGs (brand-accurate)
export function GmailLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Gmail">
      <path fill="#4285F4" d="M3 44h11V22L0 11.5V41a3 3 0 0 0 3 3z"/>
      <path fill="#34A853" d="M50 44h11a3 3 0 0 0 3-3V11.5L50 22z"/>
      <path fill="#FBBC04" d="M50 7v15l14-10.5V8a4 4 0 0 0-6.4-3.2z"/>
      <path fill="#EA4335" d="M14 22V7l18 13.5L50 7v15L32 35.5z"/>
      <path fill="#C5221F" d="M0 8v3.5L14 22V7L6.4 4.8A4 4 0 0 0 0 8z"/>
    </svg>
  );
}

export function OutlookLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} xmlns="http://www.w3.org/2000/svg" aria-label="Outlook">
      <path fill="#0364B8" d="M28 8h16a2 2 0 0 1 2 2v4l-9 6-9-6z"/>
      <path fill="#0078D4" d="M28 14h18v12l-9 6-9-5z"/>
      <path fill="#28A8EA" d="M28 26h18v10a2 2 0 0 1-2 2H28z"/>
      <path fill="#14447D" d="M28 38V8H4a2 2 0 0 0-2 2v28a2 2 0 0 0 2 2z"/>
      <path fill="#0078D4" d="M16 16c-4.4 0-8 3.6-8 8s3.6 8 8 8 8-3.6 8-8-3.6-8-8-8zm0 13c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5z"/>
      <path fill="#50D9FF" d="M46 14v12l-9 6V20z" opacity=".3"/>
    </svg>
  );
}
