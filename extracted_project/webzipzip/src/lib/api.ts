// Central API client — all fetch calls go through here
const BASE = '/api';

function getToken(): string | null {
  return localStorage.getItem('ww_token');
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = getToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ error: 'Invalid response' }));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get:    <T>(path: string) => request<T>('GET', path),
  post:   <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  patch:  <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
};

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  signup:         (name: string, email: string, password: string) =>
    api.post<{ user: AuthUser; token: string }>('/auth/signup', { name, email, password }),
  login:          (email: string, password: string) =>
    api.post<{ user: AuthUser; token: string }>('/auth/login', { email, password }),
  forgotPassword: (email: string) =>
    api.post<{ message: string }>('/auth/forgot-password', { email }),
  me:             () => api.get<{ user: AuthUser }>('/auth/me'),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:   (params?: { category?: string; search?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v])=>!!v) as string[][]).toString() : '';
    return api.get<Product[]>(`/products${qs}`);
  },
  getById:  (id: string) => api.get<Product>(`/products/${id}`),
  create:   (p: Partial<Product>) => api.post<Product>('/products', p),
  update:   (id: string, patch: Partial<Product>) => api.patch<Product>(`/products/${id}`, patch),
  remove:   (id: string) => api.delete<{ success: boolean }>(`/products/${id}`),
};

// ── Orders ────────────────────────────────────────────────────────────────────
export const ordersApi = {
  create: (order: Partial<Order>) => api.post<Order>('/orders', order),
  getAll: () => api.get<Order[]>('/orders'),
  getById: (id: string) => api.get<Order>(`/orders/${id}`),
  updateStatus: (id: string, status: string) => api.patch<Order>(`/orders/${id}/status`, { status }),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const usersApi = {
  updateProfile:  (data: Partial<AuthUser>) => api.patch<AuthUser>('/users/profile', data),
  getAddresses:   () => api.get<SavedAddress[]>('/users/addresses'),
  addAddress:     (a: Partial<SavedAddress>) => api.post<SavedAddress>('/users/addresses', a),
  updateAddress:  (id: string, patch: Partial<SavedAddress>) => api.patch<SavedAddress>(`/users/addresses/${id}`, patch),
  deleteAddress:  (id: string) => api.delete<{ success: boolean }>(`/users/addresses/${id}`),
};

// ── Reviews ───────────────────────────────────────────────────────────────────
export const reviewsApi = {
  getAll:     (productId?: string) => {
    const qs = productId ? `?productId=${productId}` : '';
    return api.get<Review[]>(`/reviews${qs}`);
  },
  create:     (r: { productId: string; rating: number; text: string; imgId?: string }) =>
    api.post<Review>('/reviews', r),
  markHelpful:(id: string) => api.post<{ likes: number }>(`/reviews/${id}/helpful`),
  ownerPatch: (id: string, patch: { ownerReply?: string; isHidden?: boolean }) =>
    api.patch<{ success: boolean }>(`/reviews/${id}`, patch),
};

// ── Newsletter ────────────────────────────────────────────────────────────────
export const newsletterApi = {
  subscribe: (email: string) => api.post<{ success: boolean }>('/newsletter', { email }),
};

// ── Contact ───────────────────────────────────────────────────────────────────
export const contactApi = {
  send: (form: { name: string; email: string; subject?: string; message: string }) =>
    api.post<{ success: boolean }>('/contact', form),
};

// ── Wishlist ──────────────────────────────────────────────────────────────────
export const wishlistApi = {
  get:    () => api.get<string[]>('/wishlist'),
  add:    (productId: string) => api.post<{ success: boolean }>(`/wishlist/${productId}`),
  remove: (productId: string) => api.delete<{ success: boolean }>(`/wishlist/${productId}`),
  sync:   (productIds: string[]) => api.post<string[]>('/wishlist/sync', { productIds }),
};

// ── Coupons ───────────────────────────────────────────────────────────────────
export const couponsApi = {
  validate: (code: string, total: number) =>
    api.post<{ valid: boolean; discount: number; code: string; description: string }>('/coupons/validate', { code, total }),
  use:      (code: string) => api.post<{ success: boolean }>('/coupons/use', { code }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: () => api.get<Analytics>('/analytics'),
};

// ── Type re-exports (subset used by contexts) ─────────────────────────────────
export interface AuthUser {
  id: string; name: string; email: string; initials: string;
  memberSince: string; points: number; orders: number;
  isOwner?: boolean; phone?: string; avatar?: string;
}
export interface SavedAddress {
  id: string; label: 'Home'|'Work'|'Other'; name: string; phone: string;
  line1: string; line2?: string; city: string; state: string; pincode: string;
  isDefault: boolean; lat?: number; lng?: number;
}
export interface Product {
  id: string; name: string; desc: string; longDesc: string;
  price: number; originalPrice?: number; discount?: number;
  rating: number; reviewCount: number; tag: string; imgId: string;
  galleryImgIds: string[]; category: string; ingredients: string[];
  allergens: string[]; calories: number; sizes: { label: string; price: number }[];
  relatedIds: string[]; availability: string; prepTime: string;
  deliveryTime: string; tags: string[];
  isNew?: boolean; isBestSeller?: boolean; isFeatured?: boolean;
  isEggless?: boolean; isVegetarian?: boolean; isPremium?: boolean;
  isSeasonal?: boolean; isHidden?: boolean; stock: number;
}
export interface Order {
  id: string; items: OrderItem[]; subtotal: number; deliveryFee: number;
  discount: number; total: number; date: string; status: string;
  statusUpdatedAt: string; address: string; paymentMethod: string;
  trackingSteps: { step: string; completedAt?: string }[];
  estimatedDelivery: string; couponCode?: string; notes?: string;
}
export interface OrderItem {
  id: string; name: string; imgId: string; price: number; quantity: number; size?: string;
}
export interface Review {
  id: string; userId: string; userName: string; userInitials: string;
  rating: number; text: string; date: string; likes: number;
  isVerified: boolean; imgId?: string; ownerReply?: string; isHidden?: boolean;
  productId?: string;
}
export interface Analytics {
  totalOrders: number; totalRevenue: number; totalCustomers: number;
  totalProducts: number; totalReviews: number; newsletterSubscribers: number;
  todayOrders: number; todayRevenue: number; recentOrders: unknown[];
}
