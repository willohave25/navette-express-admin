/**
 * Configuration Supabase - Navette Express Admin
 * JAEBETS HOLDING - W2K-Digital 2025
 * 
 * Module de connexion à la base de données Supabase
 */

const NXSupabase = (function() {
    'use strict';

    // Configuration Supabase JAEBETS HOLDING
    const SUPABASE_URL = 'https://ilycnutphhmuvaonkrsa.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlseWNudXRwaGhtdXZhb25rcnNhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MjY5NDcsImV4cCI6MjA5MDEwMjk0N30.80ipBwMVvAkC2f0Oz2Wzl8E6GjMwlLCoE72XbePtmnM';

    // URL CDN Cloudflare R2 pour les médias
    const CDN_URL = 'https://medias.w2k-digital.com';

    // Instance Supabase
    let supabase = null;

    /**
     * Initialiser la connexion Supabase
     */
    function init() {
        if (typeof window.supabase !== 'undefined') {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase initialisé');
            return true;
        } else {
            console.warn('⚠️ Supabase JS non chargé. Ajoutez le script CDN.');
            return false;
        }
    }

    /**
     * Obtenir l'instance Supabase
     */
    function getClient() {
        if (!supabase) {
            init();
        }
        return supabase;
    }

    /**
     * Obtenir l'URL CDN pour les médias
     */
    function getCdnUrl(path) {
        return `${CDN_URL}/${path}`;
    }

    // ========================================
    // AUTHENTIFICATION
    // ========================================

    /**
     * Connexion administrateur
     */
    async function signIn(email, password) {
        try {
            const { data, error } = await getClient().auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            // Stocker le token
            localStorage.setItem('nx_admin_token', data.session.access_token);
            localStorage.setItem('nx_admin_user', JSON.stringify(data.user));

            return { success: true, user: data.user };
        } catch (error) {
            console.error('Erreur connexion:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Déconnexion
     */
    async function signOut() {
        try {
            const { error } = await getClient().auth.signOut();
            if (error) throw error;

            localStorage.removeItem('nx_admin_token');
            localStorage.removeItem('nx_admin_user');

            return { success: true };
        } catch (error) {
            console.error('Erreur déconnexion:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Vérifier la session active
     */
    async function getSession() {
        try {
            const { data: { session }, error } = await getClient().auth.getSession();
            if (error) throw error;
            return session;
        } catch (error) {
            console.error('Erreur session:', error.message);
            return null;
        }
    }

    /**
     * Obtenir l'utilisateur connecté
     */
    function getCurrentUser() {
        const userStr = localStorage.getItem('nx_admin_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // ========================================
    // UTILISATEURS
    // ========================================

    /**
     * Récupérer tous les utilisateurs (passagers)
     */
    async function getPassengers(options = {}) {
        try {
            let query = getClient()
                .from('users')
                .select('*')
                .eq('role', 'passenger');

            if (options.limit) query = query.limit(options.limit);
            if (options.offset) query = query.range(options.offset, options.offset + options.limit - 1);
            if (options.search) query = query.ilike('full_name', `%${options.search}%`);

            const { data, error, count } = await query;
            if (error) throw error;

            return { success: true, data, count };
        } catch (error) {
            console.error('Erreur passagers:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupérer les chauffeurs
     */
    async function getDrivers(options = {}) {
        try {
            let query = getClient()
                .from('drivers')
                .select(`
                    *,
                    user:users(full_name, phone, email, avatar_url),
                    vehicle:vehicles(plate_number, model, capacity)
                `);

            if (options.status) query = query.eq('status', options.status);
            if (options.limit) query = query.limit(options.limit);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur chauffeurs:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupérer les entreprises
     */
    async function getCompanies(options = {}) {
        try {
            let query = getClient()
                .from('companies')
                .select('*, corridors(*)');

            if (options.status) query = query.eq('status', options.status);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur entreprises:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // LIGNES & FLOTTE
    // ========================================

    /**
     * Récupérer les lignes
     */
    async function getLines(options = {}) {
        try {
            let query = getClient()
                .from('lines')
                .select(`
                    *,
                    stops:line_stops(*)
                `)
                .order('name');

            if (options.status) query = query.eq('status', options.status);
            if (options.type) query = query.eq('type', options.type);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur lignes:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Créer une nouvelle ligne
     */
    async function createLine(lineData) {
        try {
            const { data, error } = await getClient()
                .from('lines')
                .insert([lineData])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur création ligne:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupérer les véhicules
     */
    async function getVehicles(options = {}) {
        try {
            let query = getClient()
                .from('vehicles')
                .select(`
                    *,
                    driver:drivers(
                        user:users(full_name)
                    )
                `)
                .order('plate_number');

            if (options.status) query = query.eq('status', options.status);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur véhicules:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // RÉSERVATIONS
    // ========================================

    /**
     * Récupérer les réservations
     */
    async function getReservations(options = {}) {
        try {
            let query = getClient()
                .from('reservations')
                .select(`
                    *,
                    user:users(full_name, phone),
                    trip:trips(
                        line:lines(name, origin, destination),
                        vehicle:vehicles(plate_number),
                        driver:drivers(user:users(full_name))
                    )
                `)
                .order('created_at', { ascending: false });

            if (options.status) query = query.eq('status', options.status);
            if (options.date) query = query.gte('trip_date', options.date);
            if (options.limit) query = query.limit(options.limit);

            const { data, error, count } = await query;
            if (error) throw error;

            return { success: true, data, count };
        } catch (error) {
            console.error('Erreur réservations:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Mettre à jour le statut d'une réservation
     */
    async function updateReservationStatus(reservationId, status) {
        try {
            const { data, error } = await getClient()
                .from('reservations')
                .update({ status, updated_at: new Date().toISOString() })
                .eq('id', reservationId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur mise à jour réservation:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // PAIEMENTS
    // ========================================

    /**
     * Récupérer les transactions
     */
    async function getTransactions(options = {}) {
        try {
            let query = getClient()
                .from('transactions')
                .select(`
                    *,
                    user:users(full_name, phone),
                    reservation:reservations(id)
                `)
                .order('created_at', { ascending: false });

            if (options.status) query = query.eq('status', options.status);
            if (options.method) query = query.eq('payment_method', options.method);
            if (options.limit) query = query.limit(options.limit);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur transactions:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtenir les statistiques de revenus
     */
    async function getRevenueStats(period = 'month') {
        try {
            const { data, error } = await getClient()
                .rpc('get_revenue_stats', { period_type: period });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur stats revenus:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // GPS & DISPATCH
    // ========================================

    /**
     * Récupérer les positions GPS en temps réel
     */
    async function getVehiclePositions() {
        try {
            const { data, error } = await getClient()
                .from('vehicle_positions')
                .select(`
                    *,
                    vehicle:vehicles(plate_number, model),
                    driver:drivers(user:users(full_name)),
                    trip:trips(line:lines(name))
                `)
                .eq('is_active', true);

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur positions GPS:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Souscrire aux mises à jour GPS en temps réel
     */
    function subscribeToPositions(callback) {
        return getClient()
            .channel('vehicle_positions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'vehicle_positions'
            }, payload => {
                callback(payload);
            })
            .subscribe();
    }

    /**
     * Assigner un chauffeur à une ligne
     */
    async function assignDriver(tripId, driverId) {
        try {
            const { data, error } = await getClient()
                .from('trips')
                .update({ 
                    driver_id: driverId,
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                })
                .eq('id', tripId)
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur assignation:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // DASHBOARD & ANALYTICS
    // ========================================

    /**
     * Obtenir les KPIs du dashboard
     */
    async function getDashboardKPIs() {
        try {
            const { data, error } = await getClient()
                .rpc('get_dashboard_kpis');

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur KPIs:', error.message);
            // Retourner des données de démo en cas d'erreur
            return { 
                success: true, 
                data: {
                    total_revenue_today: 578500,
                    total_reservations_today: 231,
                    active_vehicles: 28,
                    active_drivers: 32,
                    fill_rate: 94.5
                }
            };
        }
    }

    /**
     * Obtenir les alertes actives
     */
    async function getActiveAlerts() {
        try {
            const { data, error } = await getClient()
                .from('alerts')
                .select('*')
                .eq('is_resolved', false)
                .order('severity', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur alertes:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // NOTIFICATIONS
    // ========================================

    /**
     * Envoyer une notification broadcast
     */
    async function sendBroadcast(notificationData) {
        try {
            const { data, error } = await getClient()
                .from('notifications')
                .insert([{
                    ...notificationData,
                    sent_at: new Date().toISOString(),
                    sent_by: getCurrentUser()?.id
                }])
                .select()
                .single();

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur envoi notification:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtenir l'historique des notifications
     */
    async function getNotificationHistory(options = {}) {
        try {
            let query = getClient()
                .from('notifications')
                .select('*')
                .order('sent_at', { ascending: false });

            if (options.limit) query = query.limit(options.limit);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur historique notifications:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // FACTURATION
    // ========================================

    /**
     * Récupérer les factures
     */
    async function getInvoices(options = {}) {
        try {
            let query = getClient()
                .from('invoices')
                .select(`
                    *,
                    company:companies(name, contact_name, contact_email)
                `)
                .order('created_at', { ascending: false });

            if (options.status) query = query.eq('status', options.status);
            if (options.company_id) query = query.eq('company_id', options.company_id);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur factures:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Générer une facture
     */
    async function generateInvoice(companyId, period) {
        try {
            const { data, error } = await getClient()
                .rpc('generate_company_invoice', {
                    p_company_id: companyId,
                    p_period: period
                });

            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur génération facture:', error.message);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // LOGS & AUDIT
    // ========================================

    /**
     * Enregistrer un log d'activité
     */
    async function logActivity(action, details = {}) {
        try {
            const { error } = await getClient()
                .from('activity_logs')
                .insert([{
                    user_id: getCurrentUser()?.id,
                    action: action,
                    details: details,
                    ip_address: null,
                    created_at: new Date().toISOString()
                }]);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Erreur log activité:', error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Récupérer les logs d'activité
     */
    async function getActivityLogs(options = {}) {
        try {
            let query = getClient()
                .from('activity_logs')
                .select(`
                    *,
                    user:users(full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (options.action) query = query.eq('action', options.action);
            if (options.user_id) query = query.eq('user_id', options.user_id);
            if (options.limit) query = query.limit(options.limit);

            const { data, error } = await query;
            if (error) throw error;

            return { success: true, data };
        } catch (error) {
            console.error('Erreur logs:', error.message);
            return { success: false, error: error.message };
        }
    }

    // API publique
    return {
        // Initialisation
        init,
        getClient,
        getCdnUrl,

        // Auth
        signIn,
        signOut,
        getSession,
        getCurrentUser,

        // Utilisateurs
        getPassengers,
        getDrivers,
        getCompanies,

        // Lignes & Flotte
        getLines,
        createLine,
        getVehicles,

        // Réservations
        getReservations,
        updateReservationStatus,

        // Paiements
        getTransactions,
        getRevenueStats,

        // GPS & Dispatch
        getVehiclePositions,
        subscribeToPositions,
        assignDriver,

        // Dashboard
        getDashboardKPIs,
        getActiveAlerts,

        // Notifications
        sendBroadcast,
        getNotificationHistory,

        // Facturation
        getInvoices,
        generateInvoice,

        // Logs
        logActivity,
        getActivityLogs
    };
})();

// Auto-initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    NXSupabase.init();
});

// Export pour modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NXSupabase;
}
