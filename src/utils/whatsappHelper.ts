/**
 * Utilitário de normalização e formatação inteligente de links de WhatsApp.
 * Suporta tanto URLs diretas completas (ex: https://wa.me/..., https://api.whatsapp.com/send?...)
 * quanto números puros (com ou sem DDD, com ou sem formatação de máscara).
 */

export function formatWhatsAppUrl(input?: string, customMessage?: string): string {
  if (!input || !input.trim()) {
    // Fallback padrão oficial da House Land (21) 99731-3305
    return customMessage
      ? `https://wa.me/5521997313305?text=${encodeURIComponent(customMessage)}`
      : 'https://wa.me/5521997313305';
  }

  const trimmed = input.trim();

  // 1. Caso o administrador já tenha inserido um link completo web (http ou https)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (customMessage) {
      // Se a URL já possui mensagem configurada no link, respeita o link do usuário;
      // se não possuir, anexa a mensagem respeitando query params existentes
      if (!trimmed.includes('text=') && !trimmed.includes('&text=')) {
        const separator = trimmed.includes('?') ? '&' : '?';
        return `${trimmed}${separator}text=${encodeURIComponent(customMessage)}`;
      }
    }
    return trimmed;
  }

  // 2. Caso comece com wa.me/ ou api.whatsapp.com/ sem protocolo https
  if (trimmed.startsWith('wa.me/') || trimmed.startsWith('api.whatsapp.com/')) {
    const fullUrl = `https://${trimmed}`;
    if (customMessage && !fullUrl.includes('text=')) {
      const separator = fullUrl.includes('?') ? '&' : '?';
      return `${fullUrl}${separator}text=${encodeURIComponent(customMessage)}`;
    }
    return fullUrl;
  }

  // 3. Caso seja apenas números com ou sem máscara: (21) 99731-3305 ou 21997313305
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) {
    return customMessage
      ? `https://wa.me/5521997313305?text=${encodeURIComponent(customMessage)}`
      : 'https://wa.me/5521997313305';
  }

  // Se tem 10 ou 11 dígitos, é um número nacional brasileiro sem DDI -> prefixa com 55
  const fullNumber = (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;

  const base = `https://wa.me/${fullNumber}`;
  if (customMessage) {
    return `${base}?text=${encodeURIComponent(customMessage)}`;
  }
  return base;
}
