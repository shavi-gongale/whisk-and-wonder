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
  resetPassword: (token: string, password: string) =>
    api.post<{ message: string }>('/auth/reset-password', { token, password }),
  verifyEmail: (token: string) =>
    api.post<{ message: string }>('/auth/verify-email', { token }),
  logout: () => api.post<{ success: boolean }>('/auth/logout'),
  me:             () => api.get<{ user: AuthUser }>('/auth/me'),
};

// ── Products ──────────────────────────────────────────────────────────────────
export const productsApi = {
  getAll:   (params?: { category?: string; search?: string }) => {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([,v])=>!!v) as string[][]).toString() : '';
    return api.get<Product[]>(`/products${qs}`);
  },
  getById:  (id: string) => api.get<Product>(`/products/${id}`),
  getManage: () => api.get<Product[]>('/products/manage/all'),
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
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post<{ success: boolean }>('/users/change-password', { currentPassword, newPassword }),
  getPaymentMethods: () => api.get<SavedPaymentMethod[]>('/users/payment-methods'),
  addPaymentMethod: (method: Omit<SavedPaymentMethod, 'id'>) => api.post<SavedPaymentMethod>('/users/payment-methods', method),
  deletePaymentMethod: (id: string) => api.delete<{ success: boolean }>(`/users/payment-methods/${id}`),
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
    api.patch<Review>(`/reviews/${id}`, patch),
  remove: (id: string) => api.delete<{ success: boolean }>(`/reviews/${id}`),
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
  available: () => api.get<CouponRecord[]>('/coupons/available'),
  validate: (code: string, total: number) =>
    api.post<{ valid: boolean; discount: number; code: string; description: string }>('/coupons/validate', { code, total }),
  list: () => api.get<CouponRecord[]>('/coupons'),
  create: (coupon: Partial<CouponRecord>) => api.post<CouponRecord>('/coupons', coupon),
  update: (id: string, patch: Partial<CouponRecord>) => api.patch<CouponRecord>(`/coupons/${id}`, patch),
  remove: (id: string) => api.delete<{ success: boolean }>(`/coupons/${id}`),
};

export const notificationsApi = {
  list: () => api.get<NotificationRecord[]>('/notifications'),
  markRead: (id: string) => api.patch<NotificationRecord>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ success: boolean }>('/notifications/read-all'),
  remove: (id: string) => api.delete<{ success: boolean }>(`/notifications/${id}`),
};

export const loyaltyApi = {
  get: () => api.get<{ points: number; transactions: LoyaltyTransaction[] }>('/loyalty'),
  redeem: (points: number) => api.post<{ points: number }>('/loyalty/redeem', { points }),
};

export const cakeStudioApi = {
  listDesigns: () => api.get<CakeDesign[]>('/cake-studio/designs'),
  createDesign: (data: { name: string; configuration: unknown; referenceImageUrl?: string }) =>
    api.post<CakeDesign>('/cake-studio/designs', data),
  updateDesign: (id: string, data: Partial<CakeDesign>) => api.patch<CakeDesign>(`/cake-studio/designs/${id}`, data),
  deleteDesign: (id: string) => api.delete<{ success: boolean }>(`/cake-studio/designs/${id}`),
};

export const paymentApi = {
  config: () => api.get<{ provider: string; configured: boolean; keyId: string | null }>('/payments/config'),
  createOrder: (orderId: string, amount: number) => api.post<{ id: string; amount: number; currency: string; keyId: string }>('/payments/create-order', { orderId, amount }),
  verify: (payload: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }) => api.post<{ success: boolean }>('/payments/verify', payload),
};

export const deliveryApi = {
  zones: (pincode?: string) => api.get<DeliveryZone[]>(`/delivery/zones${pincode ? `?pincode=${encodeURIComponent(pincode)}` : ''}`),
};

export interface CouponRecord {
  id?: string; code: string; type?: 'percent'|'flat'; value?: number; discount?: number; description: string;
  minOrder: number; maxDiscount?: number; maxUses?: number; usesCount?: number; expiresAt?: string; active?: boolean; isActive?: boolean;
}
export interface NotificationRecord { id: string; type: string; title: string; message: string; data?: Record<string, unknown>; date: string; isRead: boolean; }
export interface LoyaltyTransaction { id: string; points: number; type: string; description: string; order_id?: string; created_at: string; }
export interface CakeDesign { id: string; name: string; configuration: unknown; referenceImageUrl?: string; createdAt: string; updatedAt: string; }
export interface DeliveryZone { id: string; name: string; optionKey: string; fee: number; minOrder: number; estimatedTime: string; }

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  get: () => api.get<Analytics>('/analytics'),
};

// ── Type re-exports (subset used by contexts) ─────────────────────────────────
export interface AuthUser {
  id: string; name: string; email: string; initials: string;
  memberSince: string; points: number; orders: number;
  isOwner?: boolean; phone?: string; avatar?: string; emailVerified?: boolean;
}
export interface SavedAddress {
  id: string; label: 'Home'|'Work'|'Other'; name: string; phone: string;
  line1: string; line2?: string; city: string; state: string; pincode: string;
  isDefault: boolean; lat?: number; lng?: number;
}
export interface SavedPaymentMethod {
  id: string; provider?: string; last4: string; brand: 'Visa'|'Mastercard'|'RuPay'|'AmEx'; expiry: string; name: string;
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
  paymentStatus?: string; orderNum?: string; customer?: { name: string; email: string; phone?: string };
}
export interface OrderItem {
  id: string; productId?: number; name: string; imgId: string; price: number; quantity: number; qty?: number; size?: string; category?: string;
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
