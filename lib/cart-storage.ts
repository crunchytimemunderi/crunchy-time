// Cart item interface - must match the interface in sales/page.tsx
export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  total: number;
}

const CART_STORAGE_KEY = "crunchy-times-cart";

export function saveCart(cartItems: CartItem[]): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify({
        items: cartItems,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.error("Failed to save cart:", error);
  }
}

export function loadCart(): CartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    const data = JSON.parse(stored);
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    const hoursSinceLastSave =
      (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    // Clear cart if it's older than 24 hours
    if (hoursSinceLastSave > 24) {
      clearCart();
      return [];
    }

    return data.items || [];
  } catch (error) {
    console.error("Failed to load cart:", error);
    return [];
  }
}

export function clearCart(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(CART_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear cart:", error);
  }
}
