const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem('token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(response.status, data.message || 'An error occurred');
  }

  return data;
}

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    request<{ success: boolean; token: string; data: unknown }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  
  register: (name: string, email: string, password: string, role?: string) =>
    request<{ success: boolean; token: string; data: unknown }>('/auth/register', {
      method: 'POST',
      body: { name, email, password, role },
    }),
  
  getMe: () => request<{ success: boolean; data: unknown }>('/auth/me'),
  
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message: string }>('/auth/update-password', {
      method: 'PUT',
      body: { currentPassword, newPassword },
    }),
  
  logout: () => request<{ success: boolean }>('/auth/logout', { method: 'POST' }),
};

// Dashboard API
export const dashboardApi = {
  getStats: () => request<{ success: boolean; data: unknown }>('/dashboard/stats'),
  getRecentActivities: (params?: { limit?: number }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/dashboard/recent-activities${query ? `?${query}` : ''}`);
  },
  getLowStockAlerts: () => request<{ success: boolean; data: unknown }>('/dashboard/low-stock-alerts'),
  getTopSellingProducts: (params?: { limit?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/dashboard/top-selling-products${query ? `?${query}` : ''}`);
  },
  getTopClients: (params?: { limit?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/dashboard/top-clients${query ? `?${query}` : ''}`);
  },
  getSalesChart: (params?: { period?: 'week' | 'month' | 'year' }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/dashboard/sales-chart${query ? `?${query}` : ''}`);
  },
  getStockMovementChart: (params?: { period?: 'week' | 'month' | 'year' }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/dashboard/stock-movement-chart${query ? `?${query}` : ''}`);
  },
};

// Products API
export const productsApi = {
  getAll: (params?: { 
    search?: string; 
    category?: string;
    supplier?: string;
    status?: string;
    page?: number; 
    limit?: number;
    isArchived?: boolean;
    sortBy?: string;
    order?: 'asc' | 'desc';
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown; pagination?: unknown }>(`/products${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}`),
  create: (product: unknown) => request<{ success: boolean; data: unknown }>('/products', { method: 'POST', body: product }),
  update: (id: string, product: unknown) => request<{ success: boolean; data: unknown }>(`/products/${id}`, { method: 'PUT', body: product }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/products/${id}`, { method: 'DELETE' }),
  archive: (id: string, notes?: string) => request<{ success: boolean }>(`/products/${id}/archive`, { method: 'PUT', body: { notes } }),
  restore: (id: string, notes?: string) => request<{ success: boolean }>(`/products/${id}/restore`, { method: 'PUT', body: { notes } }),
  getLowStock: () => request<{ success: boolean; data: unknown }>('/products/low-stock'),
  getHistory: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}/history`),
  getLifecycle: (id: string) => request<{ success: boolean; data: unknown }>(`/products/${id}/lifecycle`),
};

// Categories API
export const categoriesApi = {
  getAll: () => request<{ success: boolean; data: unknown }>('/categories'),
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/categories/${id}`),
  create: (category: unknown) => request<{ success: boolean; data: unknown }>('/categories', { method: 'POST', body: category }),
  update: (id: string, category: unknown) => request<{ success: boolean; data: unknown }>(`/categories/${id}`, { method: 'PUT', body: category }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/categories/${id}`, { method: 'DELETE' }),
};

// Suppliers API
export const suppliersApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number; isActive?: boolean }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/suppliers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}`),
  create: (supplier: unknown) => request<{ success: boolean; data: unknown }>('/suppliers', { method: 'POST', body: supplier }),
  update: (id: string, supplier: unknown) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}`, { method: 'PUT', body: supplier }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/suppliers/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => request<{ success: boolean; data: unknown }>(`/suppliers/${id}/toggle-status`, { method: 'PUT' }),
  getPurchaseHistory: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/suppliers/${id}/purchase-history${query ? `?${query}` : ''}`);
  },
};

// Clients API
export const clientsApi = {
  getAll: (params?: { search?: string; page?: number; limit?: number; type?: string; isActive?: boolean }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/clients${query ? `?${query}` : ''}`);
  },
  getWithStats: (params?: { search?: string; page?: number; limit?: number; type?: string; isActive?: boolean }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/clients/with-stats${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}`),
  create: (client: unknown) => request<{ success: boolean; data: unknown }>('/clients', { method: 'POST', body: client }),
  update: (id: string, client: unknown) => request<{ success: boolean; data: unknown }>(`/clients/${id}`, { method: 'PUT', body: client }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/clients/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}/toggle-status`, { method: 'PUT' }),
  getPurchaseHistory: (id: string, params?: { page?: number; limit?: number; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/clients/${id}/purchase-history${query ? `?${query}` : ''}`);
  },
  getOutstandingInvoices: (id: string) => request<{ success: boolean; data: unknown }>(`/clients/${id}/outstanding-invoices`),
  exportPDF: (params?: { type?: string; isActive?: boolean }) => {
    const token = localStorage.getItem('token');
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return fetch(`${API_BASE_URL}/clients/export/pdf${query ? `?${query}` : ''}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export PDF');
      return res.blob();
    });
  },
};

// Stock API
export const stockApi = {
  getMovements: (params?: { 
    productId?: string; 
    type?: 'in' | 'out' | 'adjustment';
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/stock/movements${query ? `?${query}` : ''}`);
  },
  receiveStock: (data: {
    product: string;
    quantity: number;
    unitCost: number;
    supplier?: string;
    batchNumber?: string;
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>('/stock/movements', { method: 'POST', body: data }),
  adjustStock: (data: {
    product: string;
    quantity: number;
    type: 'in' | 'out';
    reason: 'damage' | 'loss' | 'theft' | 'expired' | 'correction' | 'transfer';
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>('/stock/adjust', { method: 'POST', body: data }),
  getSummary: () => request<{ success: boolean; data: unknown }>('/stock/summary'),
  deleteMovement: (id: string) => request<{ success: boolean; message: string }>(`/stock/movements/${id}`, { method: 'DELETE' }),
  updateMovement: (id: string, data: unknown) => request<{ success: boolean; data: unknown }>(`/stock/movements/${id}`, { method: 'PUT', body: data }),
};

// Invoices API
export const invoicesApi = {
  getAll: (params?: { 
    clientId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/invoices${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}`),
  create: (invoice: unknown) => request<{ success: boolean; data: unknown }>('/invoices', { method: 'POST', body: invoice }),
  update: (id: string, invoice: unknown) => request<{ success: boolean; data: unknown }>(`/invoices/${id}`, { method: 'PUT', body: invoice }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/invoices/${id}`, { method: 'DELETE' }),
  confirm: (id: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/confirm`, { method: 'PUT' }),
  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money';
    reference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/payment`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/cancel`, { method: 'PUT', body: { reason } }),
  saveReceiptMetadata: (id: string, data: {
    sdcId?: string;
    receiptNumber?: string;
    receiptSignature?: string;
    internalData?: string;
    mrcCode?: string;
  }) => request<{ success: boolean; data: unknown }>(`/invoices/${id}/receipt-metadata`, { method: 'POST', body: data }),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/invoices/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
  getClientInvoices: (clientId: string) => request<{ success: boolean; data: unknown }>(`/invoices/client/${clientId}`),
  getProductInvoices: (productId: string) => request<{ success: boolean; data: unknown }>(`/invoices/product/${productId}`),
};

// Quotations API
export const quotationsApi = {
  getAll: (params?: { 
    clientId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/quotations${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}`),
  create: (quotation: unknown) => request<{ success: boolean; data: unknown }>('/quotations', { method: 'POST', body: quotation }),
  update: (id: string, quotation: unknown) => request<{ success: boolean; data: unknown }>(`/quotations/${id}`, { method: 'PUT', body: quotation }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/quotations/${id}`, { method: 'DELETE' }),
  approve: (id: string) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/approve`, { method: 'PUT' }),
  convertToInvoice: (id: string, data: { dueDate?: string }) => request<{ success: boolean; data: unknown }>(`/quotations/${id}/convert-to-invoice`, { method: 'POST', body: data }),
  getClientQuotations: (clientId: string) => request<{ success: boolean; data: unknown }>(`/quotations/client/${clientId}`),
  getProductQuotations: (productId: string) => request<{ success: boolean; data: unknown }>(`/quotations/product/${productId}`),
};

// Purchases API
export const purchasesApi = {
  getAll: (params?: { 
    supplierId?: string; 
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number; 
    limit?: number;
    search?: string;
  }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/purchases${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}`),
  create: (purchase: unknown) => request<{ success: boolean; data: unknown }>('/purchases', { method: 'POST', body: purchase }),
  update: (id: string, purchase: unknown) => request<{ success: boolean; data: unknown }>(`/purchases/${id}`, { method: 'PUT', body: purchase }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/purchases/${id}`, { method: 'DELETE' }),
  receive: (id: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/receive`, { method: 'PUT' }),
  recordPayment: (id: string, data: {
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'cheque' | 'mobile_money' | 'credit';
    reference?: string;
    notes?: string;
  }) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/payment`, { method: 'POST', body: data }),
  cancel: (id: string, reason?: string) => request<{ success: boolean; data: unknown }>(`/purchases/${id}/cancel`, { method: 'PUT', body: { reason } }),
  getPDF: (id: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/purchases/${id}/pdf`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to download PDF');
      return res.blob();
    });
  },
  getSupplierPurchases: (supplierId: string) => request<{ success: boolean; data: unknown }>(`/purchases/supplier/${supplierId}`),
};

// Reports API
export const reportsApi = {
  getStockValuation: (params?: { categoryId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/reports/stock-valuation${query ? `?${query}` : ''}`);
  },
  getSalesSummary: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/reports/sales-summary${query ? `?${query}` : ''}`);
  },
  getProductMovement: (params?: { productId?: string; type?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/reports/product-movement${query ? `?${query}` : ''}`);
  },
  exportExcel: (reportType: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/reports/export/excel/${reportType}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export Excel');
      return res.blob();
    });
  },
  exportPDF: (reportType: string) => {
    const token = localStorage.getItem('token');
    return fetch(`${API_BASE_URL}/reports/export/pdf/${reportType}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    }).then(res => {
      if (!res.ok) throw new Error('Failed to export PDF');
      return res.blob();
    });
  },
};

// Users API
export const usersApi = {
  getAll: (params?: { page?: number; limit?: number; role?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/users${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => request<{ success: boolean; data: unknown }>(`/users/${id}`),
  create: (user: unknown) => request<{ success: boolean; data: unknown }>('/users', { method: 'POST', body: user }),
  update: (id: string, user: unknown) => request<{ success: boolean; data: unknown }>(`/users/${id}`, { method: 'PUT', body: user }),
  delete: (id: string) => request<{ success: boolean; message: string }>(`/users/${id}`, { method: 'DELETE' }),
  getActionLogs: (userId: string, params?: { page?: number; limit?: number; module?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ success: boolean; data: unknown }>(`/users/${userId}/action-logs${query ? `?${query}` : ''}`);
  },
};

export { ApiError };
export default request;
