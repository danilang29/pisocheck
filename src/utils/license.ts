// Desbloqueo del informe completo.
// El código de desbloqueo no aparece en el código fuente: solo su hash SHA-256.
// El cliente recibe el código en la página de confirmación de Stripe tras pagar.
// Para rotarlo: cambia UNLOCK_HASH (node -e "crypto.subtle.digest(...)" con el
// código nuevo) y actualiza el mensaje de confirmación del Payment Link.

const UNLOCK_HASH = '6fce84e5cedf62318c60f61c4e20d997bb8d41193a3566e49f337270b53284b8'

export const STRIPE_PAYMENT_LINK = 'https://buy.stripe.com/bJecN7fsZ9Wb56t29obfO00'

export const REPORT_PRICE = '8,99 €'

const STORAGE_KEY = 'pisocheck_license'

async function sha256Text(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function isUnlocked(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === UNLOCK_HASH
  } catch {
    return false
  }
}

export async function tryUnlock(code: string): Promise<boolean> {
  const hash = await sha256Text(code.trim().toUpperCase())
  if (hash !== UNLOCK_HASH) return false
  try {
    localStorage.setItem(STORAGE_KEY, hash)
  } catch {
    // Sin almacenamiento (modo privado): el desbloqueo vale solo para esta sesión,
    // pero devolvemos true para no bloquear al cliente que acaba de pagar.
  }
  return true
}
