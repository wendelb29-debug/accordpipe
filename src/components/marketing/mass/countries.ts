export interface Country {
  code: string;   // ISO2
  name: string;
  dial: string;   // e.g. "55"
  flag: string;   // emoji
}

export const COUNTRIES: Country[] = [
  { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
  { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", dial: "57", flag: "🇨🇴" },
  { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
  { code: "PE", name: "Peru", dial: "51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", dial: "598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguai", dial: "595", flag: "🇵🇾" },
  { code: "BO", name: "Bolívia", dial: "591", flag: "🇧🇴" },
  { code: "VE", name: "Venezuela", dial: "58", flag: "🇻🇪" },
  { code: "EC", name: "Equador", dial: "593", flag: "🇪🇨" },
  { code: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
  { code: "ES", name: "Espanha", dial: "34", flag: "🇪🇸" },
  { code: "IT", name: "Itália", dial: "39", flag: "🇮🇹" },
  { code: "FR", name: "França", dial: "33", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", dial: "49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
  { code: "IE", name: "Irlanda", dial: "353", flag: "🇮🇪" },
  { code: "NL", name: "Países Baixos", dial: "31", flag: "🇳🇱" },
  { code: "BE", name: "Bélgica", dial: "32", flag: "🇧🇪" },
  { code: "CH", name: "Suíça", dial: "41", flag: "🇨🇭" },
  { code: "AT", name: "Áustria", dial: "43", flag: "🇦🇹" },
  { code: "SE", name: "Suécia", dial: "46", flag: "🇸🇪" },
  { code: "NO", name: "Noruega", dial: "47", flag: "🇳🇴" },
  { code: "DK", name: "Dinamarca", dial: "45", flag: "🇩🇰" },
  { code: "FI", name: "Finlândia", dial: "358", flag: "🇫🇮" },
  { code: "PL", name: "Polônia", dial: "48", flag: "🇵🇱" },
  { code: "RU", name: "Rússia", dial: "7", flag: "🇷🇺" },
  { code: "UA", name: "Ucrânia", dial: "380", flag: "🇺🇦" },
  { code: "TR", name: "Turquia", dial: "90", flag: "🇹🇷" },
  { code: "GR", name: "Grécia", dial: "30", flag: "🇬🇷" },
  { code: "IL", name: "Israel", dial: "972", flag: "🇮🇱" },
  { code: "AE", name: "Emirados Árabes", dial: "971", flag: "🇦🇪" },
  { code: "SA", name: "Arábia Saudita", dial: "966", flag: "🇸🇦" },
  { code: "EG", name: "Egito", dial: "20", flag: "🇪🇬" },
  { code: "ZA", name: "África do Sul", dial: "27", flag: "🇿🇦" },
  { code: "NG", name: "Nigéria", dial: "234", flag: "🇳🇬" },
  { code: "MA", name: "Marrocos", dial: "212", flag: "🇲🇦" },
  { code: "AO", name: "Angola", dial: "244", flag: "🇦🇴" },
  { code: "MZ", name: "Moçambique", dial: "258", flag: "🇲🇿" },
  { code: "CV", name: "Cabo Verde", dial: "238", flag: "🇨🇻" },
  { code: "IN", name: "Índia", dial: "91", flag: "🇮🇳" },
  { code: "PK", name: "Paquistão", dial: "92", flag: "🇵🇰" },
  { code: "BD", name: "Bangladesh", dial: "880", flag: "🇧🇩" },
  { code: "CN", name: "China", dial: "86", flag: "🇨🇳" },
  { code: "HK", name: "Hong Kong", dial: "852", flag: "🇭🇰" },
  { code: "TW", name: "Taiwan", dial: "886", flag: "🇹🇼" },
  { code: "JP", name: "Japão", dial: "81", flag: "🇯🇵" },
  { code: "KR", name: "Coreia do Sul", dial: "82", flag: "🇰🇷" },
  { code: "TH", name: "Tailândia", dial: "66", flag: "🇹🇭" },
  { code: "VN", name: "Vietnã", dial: "84", flag: "🇻🇳" },
  { code: "PH", name: "Filipinas", dial: "63", flag: "🇵🇭" },
  { code: "ID", name: "Indonésia", dial: "62", flag: "🇮🇩" },
  { code: "MY", name: "Malásia", dial: "60", flag: "🇲🇾" },
  { code: "SG", name: "Singapura", dial: "65", flag: "🇸🇬" },
  { code: "AU", name: "Austrália", dial: "61", flag: "🇦🇺" },
  { code: "NZ", name: "Nova Zelândia", dial: "64", flag: "🇳🇿" },
];

export const DEFAULT_COUNTRY = COUNTRIES[0];

export function findCountryByDial(dial: string): Country | undefined {
  if (!dial) return undefined;
  const digits = dial.replace(/\D/g, "");
  // Try longest match first
  const sorted = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
  return sorted.find(c => digits.startsWith(c.dial));
}
