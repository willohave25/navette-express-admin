/**
 * NAVETTE EXPRESS — Client API
 * Wrapper fetch pour toutes les requêtes vers le backend
 */

class NavetteAPI {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.tokenKey = TOKEN_KEY;
  }

  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  setToken(token) {
    localStorage.setItem(this.tokenKey, token);
  }

  removeToken() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(USER_KEY);
  }

  getHeaders(withAuth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (withAuth) {
      const token = this.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  }

  async request(method, path, body = null, withAuth = true) {
    const url = `${this.baseUrl}${path}`;
    const options = {
      method,
      headers: this.getHeaders(withAuth),
    };
    if (body) options.body = JSON.stringify(body);

    try {
      const response = await fetch(url, options);
      const data = await response.json();

      if (response.status === 401) {
        this.removeToken();
        window.location.href = '/index.html';
        return;
      }

      if (!response.ok && !data.success) {
        throw { status: response.status, ...data.error };
      }

      return data;
    } catch (err) {
      if (err.code) throw err;
      throw { code: 'NETWORK_ERROR', message: 'Erreur de connexion au serveur' };
    }
  }

  get(path, withAuth = true) { return this.request('GET', path, null, withAuth); }
  post(path, body, withAuth = true) { return this.request('POST', path, body, withAuth); }
  put(path, body, withAuth = true) { return this.request('PUT', path, body, withAuth); }
  delete(path, withAuth = true) { return this.request('DELETE', path, null, withAuth); }

  // =============================================
  // AUTH
  // =============================================
  async login(email, password) {
    const res = await this.post('/api/auth/login', { email, password }, false);
    if (res.success) {
      this.setToken(res.data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    }
    return res;
  }

  logout() {
    this.removeToken();
    window.location.href = '/index.html';
  }

  getUser() {
    const u = localStorage.getItem(USER_KEY);
    return u ? JSON.parse(u) : null;
  }

  isLoggedIn() {
    return !!this.getToken();
  }

  requireAuth(allowedRoles = ['super_admin', 'admin']) {
    if (!this.isLoggedIn()) {
      window.location.href = '/index.html';
      return false;
    }
    const user = this.getUser();
    if (allowedRoles.length && !allowedRoles.includes(user?.role)) {
      window.location.href = '/erreur.html';
      return false;
    }
    return true;
  }

  // =============================================
  // DASHBOARD
  // =============================================
  getKPIs() { return this.get('/api/dashboard/kpis'); }
  getRevenue(period = 'month') { return this.get(`/api/dashboard/revenue?period=${period}`); }
  getLineStats() { return this.get('/api/dashboard/lines'); }
  getAlerts() { return this.get('/api/dashboard/alerts'); }

  // =============================================
  // LIGNES
  // =============================================
  getLines(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/lines${q ? '?' + q : ''}`);
  }
  getLine(id) { return this.get(`/api/lines/${id}`); }
  createLine(data) { return this.post('/api/lines', data); }
  updateLine(id, data) { return this.put(`/api/lines/${id}`, data); }
  setLineStatus(id, status) { return this.put(`/api/lines/${id}/status`, { status }); }
  deleteLine(id) { return this.delete(`/api/lines/${id}`); }

  // =============================================
  // VÉHICULES
  // =============================================
  getVehicles(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/vehicles${q ? '?' + q : ''}`);
  }
  getVehicle(id) { return this.get(`/api/vehicles/${id}`); }
  createVehicle(data) { return this.post('/api/vehicles', data); }
  updateVehicle(id, data) { return this.put(`/api/vehicles/${id}`, data); }
  setVehicleStatus(id, status) { return this.put(`/api/vehicles/${id}/status`, { status }); }
  deleteVehicle(id) { return this.delete(`/api/vehicles/${id}`); }

  // =============================================
  // CHAUFFEURS
  // =============================================
  getDrivers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/drivers${q ? '?' + q : ''}`);
  }
  getDriver(id) { return this.get(`/api/drivers/${id}`); }
  createDriver(data) { return this.post('/api/drivers', data); }
  updateDriver(id, data) { return this.put(`/api/drivers/${id}`, data); }
  setDriverStatus(id, status) { return this.put(`/api/drivers/${id}/status`, { status }); }
  assignDriverVehicle(driverId, vehicleId) { return this.put(`/api/drivers/${driverId}/assign`, { vehicle_id: vehicleId }); }

  // =============================================
  // TRAJETS
  // =============================================
  getTrips(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/trips${q ? '?' + q : ''}`);
  }
  getTrip(id) { return this.get(`/api/trips/${id}`); }
  createTrip(data) { return this.post('/api/trips', data); }
  assignTrip(id, driverId, vehicleId) { return this.put(`/api/trips/${id}/assign`, { driver_id: driverId, vehicle_id: vehicleId }); }
  cancelTrip(id, reason) { return this.delete(`/api/trips/${id}`, { cancellation_reason: reason }); }
  getTripPassengers(id) { return this.get(`/api/trips/${id}/passengers`); }

  // =============================================
  // ABONNEMENTS
  // =============================================
  getSubscriptions(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/subscriptions${q ? '?' + q : ''}`);
  }

  // =============================================
  // ENTREPRISES
  // =============================================
  getCompanies(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/companies${q ? '?' + q : ''}`);
  }
  getCompany(id) { return this.get(`/api/companies/${id}`); }
  createCompany(data) { return this.post('/api/companies', data); }
  updateCompany(id, data) { return this.put(`/api/companies/${id}`, data); }
  getCompanyEmployees(id) { return this.get(`/api/companies/${id}/employees`); }
  getCompanyInvoices(id) { return this.get(`/api/companies/${id}/invoices`); }

  // =============================================
  // UTILISATEURS
  // =============================================
  getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    return this.get(`/api/users${q ? '?' + q : ''}`);
  }
  getUser(id) { return this.get(`/api/users/${id}`); }
  createUser(data) { return this.post('/api/users', data); }
  updateUser(id, data) { return this.put(`/api/users/${id}`, data); }

  // =============================================
  // NOTIFICATIONS
  // =============================================
  getNotifications() { return this.get('/api/notifications'); }
  broadcast(data) { return this.post('/api/notifications/broadcast', data); }

  // =============================================
  // TRACKING GPS
  // =============================================
  getLivePositions() { return this.get('/api/tracking/live'); }
  getVehiclePosition(vehicleId) { return this.get(`/api/tracking/vehicle/${vehicleId}`); }
}

// Instance globale
const API = new NavetteAPI();
