/**
 * NAVETTE EXPRESS - Configuration Supabase
 * Backend-as-a-Service pour la plateforme admin
 * W2K-Digital 2025
 * 
 * IMPORTANT: Remplacer les valeurs placeholder par les vraies clés en production
 */

const SupabaseConfig = (function() {
    'use strict';

    // Configuration Supabase
    // TODO: Remplacer par les vraies valeurs du projet Supabase
    const CONFIG = {
        url: 'https://VOTRE_PROJECT_ID.supabase.co',
        anonKey: 'VOTRE_ANON_KEY_PUBLIQUE',
        serviceRoleKey: null, // Ne jamais exposer côté client
        
        // Options de connexion
        options: {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            },
            realtime: {
                params: {
                    eventsPerSecond: 10
                }
            }
        }
    };

    // Instance Supabase
    let supabase = null;

    /**
     * Initialiser la connexion Supabase
     */
    function init() {
        if (supabase) return supabase;

        // Vérifier si la bibliothèque Supabase est chargée
        if (typeof window.supabase === 'undefined') {
            console.error('[Supabase] Bibliothèque non chargée. Ajouter le script CDN.');
            return null;
        }

        try {
            supabase = window.supabase.createClient(
                CONFIG.url,
                CONFIG.anonKey,
                CONFIG.options
            );
            console.log('[Supabase] Connexion initialisée');
            return supabase;
        } catch (error) {
            console.error('[Supabase] Erreur initialisation:', error);
            return null;
        }
    }

    /**
     * Obtenir l'instance Supabase
     */
    function getClient() {
        if (!supabase) {
            return init();
        }
        return supabase;
    }

    // ========================================
    // AUTHENTIFICATION
    // ========================================

    const Auth = {
        /**
         * Connexion par email/mot de passe
         */
        async signIn(email, password) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data, error } = await client.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;
            return data;
        },

        /**
         * Déconnexion
         */
        async signOut() {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { error } = await client.auth.signOut();
            if (error) throw error;
        },

        /**
         * Obtenir la session actuelle
         */
        async getSession() {
            const client = getClient();
            if (!client) return null;

            const { data: { session } } = await client.auth.getSession();
            return session;
        },

        /**
         * Obtenir l'utilisateur actuel
         */
        async getUser() {
            const client = getClient();
            if (!client) return null;

            const { data: { user } } = await client.auth.getUser();
            return user;
        },

        /**
         * Écouter les changements d'authentification
         */
        onAuthStateChange(callback) {
            const client = getClient();
            if (!client) return null;

            return client.auth.onAuthStateChange((event, session) => {
                callback(event, session);
            });
        },

        /**
         * Réinitialiser le mot de passe
         */
        async resetPassword(email) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { error } = await client.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;
        }
    };

    // ========================================
    // BASE DE DONNÉES
    // ========================================

    const Database = {
        /**
         * Lire des données d'une table
         */
        async select(table, options = {}) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            let query = client.from(table).select(options.columns || '*');

            // Filtres
            if (options.filters) {
                Object.entries(options.filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
            }

            // Recherche texte
            if (options.search) {
                query = query.ilike(options.search.column, `%${options.search.value}%`);
            }

            // Tri
            if (options.orderBy) {
                query = query.order(options.orderBy.column, { 
                    ascending: options.orderBy.ascending ?? true 
                });
            }

            // Pagination
            if (options.limit) {
                query = query.limit(options.limit);
            }
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error, count } = await query;
            if (error) throw error;
            
            return { data, count };
        },

        /**
         * Insérer des données
         */
        async insert(table, data) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data: result, error } = await client
                .from(table)
                .insert(data)
                .select();

            if (error) throw error;
            return result;
        },

        /**
         * Mettre à jour des données
         */
        async update(table, id, data) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data: result, error } = await client
                .from(table)
                .update(data)
                .eq('id', id)
                .select();

            if (error) throw error;
            return result;
        },

        /**
         * Supprimer des données
         */
        async delete(table, id) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { error } = await client
                .from(table)
                .delete()
                .eq('id', id);

            if (error) throw error;
        },

        /**
         * Appeler une fonction RPC
         */
        async rpc(functionName, params = {}) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data, error } = await client.rpc(functionName, params);
            if (error) throw error;
            return data;
        }
    };

    // ========================================
    // TEMPS RÉEL
    // ========================================

    const Realtime = {
        channels: new Map(),

        /**
         * S'abonner aux changements d'une table
         */
        subscribe(table, callback, options = {}) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const channelName = options.channel || `${table}-changes`;
            
            const channel = client
                .channel(channelName)
                .on(
                    'postgres_changes',
                    { 
                        event: options.event || '*', 
                        schema: 'public', 
                        table: table,
                        filter: options.filter
                    },
                    (payload) => {
                        callback(payload);
                    }
                )
                .subscribe();

            this.channels.set(channelName, channel);
            return channel;
        },

        /**
         * Se désabonner d'un canal
         */
        unsubscribe(channelName) {
            const client = getClient();
            if (!client) return;

            const channel = this.channels.get(channelName);
            if (channel) {
                client.removeChannel(channel);
                this.channels.delete(channelName);
            }
        },

        /**
         * Se désabonner de tous les canaux
         */
        unsubscribeAll() {
            const client = getClient();
            if (!client) return;

            this.channels.forEach((channel, name) => {
                client.removeChannel(channel);
            });
            this.channels.clear();
        }
    };

    // ========================================
    // STOCKAGE
    // ========================================

    const Storage = {
        /**
         * Uploader un fichier
         */
        async upload(bucket, path, file, options = {}) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data, error } = await client.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: options.cacheControl || '3600',
                    upsert: options.upsert || false
                });

            if (error) throw error;
            return data;
        },

        /**
         * Obtenir l'URL publique d'un fichier
         */
        getPublicUrl(bucket, path) {
            const client = getClient();
            if (!client) return null;

            const { data } = client.storage
                .from(bucket)
                .getPublicUrl(path);

            return data.publicUrl;
        },

        /**
         * Supprimer un fichier
         */
        async delete(bucket, paths) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { error } = await client.storage
                .from(bucket)
                .remove(Array.isArray(paths) ? paths : [paths]);

            if (error) throw error;
        },

        /**
         * Lister les fichiers d'un bucket
         */
        async list(bucket, folder = '', options = {}) {
            const client = getClient();
            if (!client) throw new Error('Supabase non initialisé');

            const { data, error } = await client.storage
                .from(bucket)
                .list(folder, {
                    limit: options.limit || 100,
                    offset: options.offset || 0,
                    sortBy: options.sortBy || { column: 'name', order: 'asc' }
                });

            if (error) throw error;
            return data;
        }
    };

    // ========================================
    // TABLES SPÉCIFIQUES NAVETTE EXPRESS
    // ========================================

    const Tables = {
        // Utilisateurs
        USERS: 'users',
        USER_ROLES: 'user_roles',
        
        // Transport
        LIGNES: 'lignes',
        ARRETS: 'arrets',
        HORAIRES: 'horaires',
        
        // Flotte
        VEHICULES: 'vehicules',
        CHAUFFEURS: 'chauffeurs',
        
        // Opérations
        RESERVATIONS: 'reservations',
        DISPATCH: 'dispatch',
        GPS_TRACKING: 'gps_tracking',
        
        // Finance
        PAIEMENTS: 'paiements',
        FACTURES: 'factures',
        
        // Système
        NOTIFICATIONS: 'notifications',
        PARAMETRES: 'parametres',
        LOGS: 'activity_logs'
    };

    // ========================================
    // API PUBLIQUE
    // ========================================

    return {
        init,
        getClient,
        Auth,
        Database,
        Realtime,
        Storage,
        Tables,
        
        // Vérifier si configuré
        isConfigured() {
            return CONFIG.url !== 'https://VOTRE_PROJECT_ID.supabase.co';
        },
        
        // Obtenir la configuration (sans les clés sensibles)
        getConfig() {
            return {
                url: CONFIG.url,
                configured: this.isConfigured()
            };
        }
    };
})();

// Export pour utilisation modulaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SupabaseConfig;
}

// Initialisation automatique si Supabase est chargé
document.addEventListener('DOMContentLoaded', () => {
    if (typeof window.supabase !== 'undefined') {
        SupabaseConfig.init();
    }
});
