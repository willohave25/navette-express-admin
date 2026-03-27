/* ============================================
   NAVETTE EXPRESS ADMIN - JAVASCRIPT PRINCIPAL
   W2K-Digital 2025
   ============================================ */

(function() {
    'use strict';

    /* ============================================
       CONFIGURATION GLOBALE
       ============================================ */
    
    const CONFIG = {
        toastDuration: 4000,
        debounceDelay: 300,
        animationDuration: 300,
        paginationSize: 10
    };

    /* ============================================
       UTILITAIRES
       ============================================ */

    // Debounce pour optimisation des événements
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Formatage des montants FCFA
    function formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    }

    // Formatage des dates
    function formatDate(date, options = {}) {
        const defaultOptions = { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        };
        return new Date(date).toLocaleDateString('fr-FR', { ...defaultOptions, ...options });
    }

    // Formatage des heures
    function formatTime(date) {
        return new Date(date).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }

    // Génération d'ID unique
    function generateId() {
        return 'id_' + Math.random().toString(36).substr(2, 9);
    }

    // Stockage local
    const Storage = {
        get(key) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Erreur lecture localStorage:', e);
                return null;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error('Erreur écriture localStorage:', e);
            }
        },
        remove(key) {
            localStorage.removeItem(key);
        }
    };

    /* ============================================
       SYSTÈME DE NOTIFICATIONS TOAST
       ============================================ */

    const Toast = {
        container: null,

        init() {
            this.container = document.getElementById('toastContainer');
            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'toastContainer';
                this.container.className = 'toast-container';
                document.body.appendChild(this.container);
            }
        },

        show(type, title, message) {
            if (!this.container) this.init();

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    ${this.getIcon(type)}
                </svg>
                <div class="toast-content">
                    <div class="toast-title">${title}</div>
                    <div class="toast-message">${message}</div>
                </div>
                <button class="toast-close" aria-label="Fermer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            this.container.appendChild(toast);

            // Fermeture au clic
            toast.querySelector('.toast-close').addEventListener('click', () => {
                this.close(toast);
            });

            // Fermeture automatique
            setTimeout(() => {
                this.close(toast);
            }, CONFIG.toastDuration);
        },

        close(toast) {
            toast.classList.add('closing');
            setTimeout(() => {
                toast.remove();
            }, CONFIG.animationDuration);
        },

        getIcon(type) {
            const icons = {
                success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
                error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
                warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
                info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>'
            };
            return icons[type] || icons.info;
        },

        success(title, message) { this.show('success', title, message); },
        error(title, message) { this.show('error', title, message); },
        warning(title, message) { this.show('warning', title, message); },
        info(title, message) { this.show('info', title, message); }
    };

    // Exposer globalement
    window.Toast = Toast;

    /* ============================================
       GESTION DE LA PAGE LOGIN
       ============================================ */

    const LoginPage = {
        init() {
            const form = document.getElementById('loginForm');
            if (!form) return;

            // Toggle mot de passe
            const toggleBtn = document.getElementById('togglePassword');
            const passwordInput = document.getElementById('password');
            
            if (toggleBtn && passwordInput) {
                toggleBtn.addEventListener('click', () => {
                    const type = passwordInput.type === 'password' ? 'text' : 'password';
                    passwordInput.type = type;
                    
                    toggleBtn.querySelector('.eye-open').classList.toggle('hidden');
                    toggleBtn.querySelector('.eye-closed').classList.toggle('hidden');
                });
            }

            // Soumission du formulaire
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSubmit(form);
            });

            // Validation en temps réel
            const emailInput = document.getElementById('email');
            if (emailInput) {
                emailInput.addEventListener('blur', () => this.validateEmail(emailInput));
            }
            if (passwordInput) {
                passwordInput.addEventListener('blur', () => this.validatePassword(passwordInput));
            }

            // Restaurer "Se souvenir de moi"
            this.restoreRememberMe();
        },

        validateEmail(input) {
            const error = document.getElementById('emailError');
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            
            if (!input.value) {
                error.textContent = 'Le courriel est requis';
                input.classList.add('error');
                return false;
            }
            if (!emailRegex.test(input.value)) {
                error.textContent = 'Format de courriel invalide';
                input.classList.add('error');
                return false;
            }
            
            error.textContent = '';
            input.classList.remove('error');
            return true;
        },

        validatePassword(input) {
            const error = document.getElementById('passwordError');
            
            if (!input.value) {
                error.textContent = 'Le mot de passe est requis';
                input.classList.add('error');
                return false;
            }
            if (input.value.length < 8) {
                error.textContent = 'Le mot de passe doit contenir au moins 8 caractères';
                input.classList.add('error');
                return false;
            }
            
            error.textContent = '';
            input.classList.remove('error');
            return true;
        },

        async handleSubmit(form) {
            const emailInput = document.getElementById('email');
            const passwordInput = document.getElementById('password');
            const btn = document.getElementById('btnLogin');
            
            // Validation
            const emailValid = this.validateEmail(emailInput);
            const passwordValid = this.validatePassword(passwordInput);
            
            if (!emailValid || !passwordValid) return;

            // État de chargement
            btn.classList.add('loading');
            btn.disabled = true;

            try {
                // Simulation connexion (remplacer par Supabase Auth)
                await this.simulateLogin(emailInput.value, passwordInput.value);
                
                // Sauvegarder "Se souvenir de moi"
                const rememberMe = document.getElementById('rememberMe');
                if (rememberMe && rememberMe.checked) {
                    Storage.set('rememberedEmail', emailInput.value);
                } else {
                    Storage.remove('rememberedEmail');
                }

                Toast.success('Connexion réussie', 'Redirection vers le tableau de bord...');
                
                // Redirection
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);

            } catch (error) {
                Toast.error('Erreur de connexion', error.message);
            } finally {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        },

        simulateLogin(email, password) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // Simulation - accepter tout pour le développement
                    if (email && password.length >= 8) {
                        // Stocker session simulée
                        Storage.set('adminSession', {
                            user: {
                                email: email,
                                name: 'Administrateur',
                                role: 'Super Admin'
                            },
                            token: 'demo_token_' + Date.now(),
                            expires: Date.now() + (24 * 60 * 60 * 1000)
                        });
                        resolve({ success: true });
                    } else {
                        reject(new Error('Identifiants incorrects'));
                    }
                }, 1500);
            });
        },

        restoreRememberMe() {
            const rememberedEmail = Storage.get('rememberedEmail');
            if (rememberedEmail) {
                const emailInput = document.getElementById('email');
                const rememberMe = document.getElementById('rememberMe');
                if (emailInput) emailInput.value = rememberedEmail;
                if (rememberMe) rememberMe.checked = true;
            }
        }
    };

    /* ============================================
       SIDEBAR NAVIGATION
       ============================================ */

    const Sidebar = {
        init() {
            const sidebar = document.querySelector('.sidebar');
            const toggleBtn = document.querySelector('.mobile-menu-toggle');
            
            if (!sidebar) return;

            // Toggle mobile
            if (toggleBtn) {
                toggleBtn.addEventListener('click', () => {
                    sidebar.classList.toggle('open');
                });
            }

            // Fermer au clic extérieur (mobile)
            document.addEventListener('click', (e) => {
                if (window.innerWidth <= 1024) {
                    if (!sidebar.contains(e.target) && !toggleBtn?.contains(e.target)) {
                        sidebar.classList.remove('open');
                    }
                }
            });

            // Marquer le lien actif
            this.setActiveLink();

            // Gestion déconnexion
            const logoutBtn = document.querySelector('.nav-link-logout');
            if (logoutBtn) {
                logoutBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleLogout();
                });
            }
        },

        setActiveLink() {
            const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
            const links = document.querySelectorAll('.nav-link');
            
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (href === currentPage) {
                    link.classList.add('active');
                } else {
                    link.classList.remove('active');
                }
            });
        },

        handleLogout() {
            Modal.confirm(
                'Déconnexion',
                'Êtes-vous sûr de vouloir vous déconnecter de la plateforme ?',
                () => {
                    Storage.remove('adminSession');
                    Toast.info('Déconnexion', 'À bientôt sur Navette Express !');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                }
            );
        }
    };

    /* ============================================
       SYSTÈME DE MODALS
       ============================================ */

    const Modal = {
        activeModal: null,

        open(modalId) {
            const overlay = document.getElementById(modalId);
            if (!overlay) return;

            overlay.classList.add('active');
            this.activeModal = overlay;
            document.body.style.overflow = 'hidden';

            // Fermeture avec Escape
            document.addEventListener('keydown', this.handleEscape);

            // Fermeture au clic sur overlay
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.close();
                }
            });
        },

        close() {
            if (this.activeModal) {
                this.activeModal.classList.remove('active');
                this.activeModal = null;
                document.body.style.overflow = '';
                document.removeEventListener('keydown', this.handleEscape);
            }
        },

        handleEscape(e) {
            if (e.key === 'Escape') {
                Modal.close();
            }
        },

        // Modal de confirmation
        confirm(title, message, onConfirm, onCancel = null) {
            // Créer le modal dynamiquement
            const modalId = 'confirmModal_' + generateId();
            const overlay = document.createElement('div');
            overlay.id = modalId;
            overlay.className = 'modal-overlay';
            overlay.innerHTML = `
                <div class="modal">
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close" aria-label="Fermer">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-outline modal-cancel">Annuler</button>
                        <button class="btn btn-primary modal-confirm">Confirmer</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            // Ouvrir
            setTimeout(() => {
                overlay.classList.add('active');
            }, 10);

            // Événements
            overlay.querySelector('.modal-close').addEventListener('click', () => {
                this.closeConfirm(overlay, onCancel);
            });

            overlay.querySelector('.modal-cancel').addEventListener('click', () => {
                this.closeConfirm(overlay, onCancel);
            });

            overlay.querySelector('.modal-confirm').addEventListener('click', () => {
                this.closeConfirm(overlay);
                if (onConfirm) onConfirm();
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.closeConfirm(overlay, onCancel);
                }
            });
        },

        closeConfirm(overlay, callback = null) {
            overlay.classList.remove('active');
            setTimeout(() => {
                overlay.remove();
            }, CONFIG.animationDuration);
            if (callback) callback();
        },

        // Modal d'alerte simple
        alert(title, message) {
            this.confirm(title, message, null);
        }
    };

    window.Modal = Modal;

    /* ============================================
       SYSTÈME DE TABLEAUX
       ============================================ */

    const DataTable = {
        instances: {},

        init(tableId, options = {}) {
            const container = document.getElementById(tableId);
            if (!container) return null;

            const instance = {
                container,
                table: container.querySelector('.data-table'),
                data: options.data || [],
                filteredData: [],
                currentPage: 1,
                pageSize: options.pageSize || CONFIG.paginationSize,
                sortColumn: null,
                sortDirection: 'asc',
                searchQuery: '',
                filters: {}
            };

            instance.filteredData = [...instance.data];
            this.instances[tableId] = instance;

            // Initialiser les contrôles
            this.initSearch(instance);
            this.initSort(instance);
            this.initPagination(instance);
            this.initFilters(instance);

            // Premier rendu
            this.render(instance);

            return instance;
        },

        initSearch(instance) {
            const searchInput = instance.container.querySelector('.table-search input');
            if (!searchInput) return;

            searchInput.addEventListener('input', debounce((e) => {
                instance.searchQuery = e.target.value.toLowerCase();
                instance.currentPage = 1;
                this.applyFilters(instance);
                this.render(instance);
            }, CONFIG.debounceDelay));
        },

        initSort(instance) {
            const sortableHeaders = instance.table.querySelectorAll('th.sortable');
            
            sortableHeaders.forEach(th => {
                th.addEventListener('click', () => {
                    const column = th.dataset.column;
                    
                    if (instance.sortColumn === column) {
                        instance.sortDirection = instance.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        instance.sortColumn = column;
                        instance.sortDirection = 'asc';
                    }

                    // Mettre à jour l'affichage
                    sortableHeaders.forEach(h => h.classList.remove('sorted'));
                    th.classList.add('sorted');

                    this.applySort(instance);
                    this.render(instance);
                });
            });
        },

        initPagination(instance) {
            const footer = instance.container.querySelector('.table-footer');
            if (!footer) return;

            footer.addEventListener('click', (e) => {
                const btn = e.target.closest('.pagination-btn');
                if (!btn || btn.disabled) return;

                const action = btn.dataset.action;
                const totalPages = Math.ceil(instance.filteredData.length / instance.pageSize);

                switch (action) {
                    case 'first':
                        instance.currentPage = 1;
                        break;
                    case 'prev':
                        instance.currentPage = Math.max(1, instance.currentPage - 1);
                        break;
                    case 'next':
                        instance.currentPage = Math.min(totalPages, instance.currentPage + 1);
                        break;
                    case 'last':
                        instance.currentPage = totalPages;
                        break;
                    default:
                        if (!isNaN(action)) {
                            instance.currentPage = parseInt(action);
                        }
                }

                this.render(instance);
            });
        },

        initFilters(instance) {
            const filterSelects = instance.container.querySelectorAll('.filter-select');
            
            filterSelects.forEach(select => {
                select.addEventListener('change', (e) => {
                    const filterName = select.dataset.filter;
                    const value = e.target.value;
                    
                    if (value) {
                        instance.filters[filterName] = value;
                    } else {
                        delete instance.filters[filterName];
                    }
                    
                    instance.currentPage = 1;
                    this.applyFilters(instance);
                    this.render(instance);
                });
            });
        },

        applyFilters(instance) {
            let data = [...instance.data];

            // Recherche
            if (instance.searchQuery) {
                data = data.filter(row => {
                    return Object.values(row).some(value => 
                        String(value).toLowerCase().includes(instance.searchQuery)
                    );
                });
            }

            // Filtres
            Object.entries(instance.filters).forEach(([key, value]) => {
                data = data.filter(row => row[key] === value);
            });

            instance.filteredData = data;

            // Tri
            if (instance.sortColumn) {
                this.applySort(instance);
            }
        },

        applySort(instance) {
            if (!instance.sortColumn) return;

            instance.filteredData.sort((a, b) => {
                let valA = a[instance.sortColumn];
                let valB = b[instance.sortColumn];

                // Gestion des nombres
                if (!isNaN(valA) && !isNaN(valB)) {
                    valA = parseFloat(valA);
                    valB = parseFloat(valB);
                }

                if (valA < valB) return instance.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return instance.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        },

        render(instance) {
            const tbody = instance.table.querySelector('tbody');
            if (!tbody) return;

            const start = (instance.currentPage - 1) * instance.pageSize;
            const end = start + instance.pageSize;
            const pageData = instance.filteredData.slice(start, end);

            // Rendu du tbody (à personnaliser selon le tableau)
            // Cette fonction sera surchargée pour chaque tableau

            // Mise à jour pagination
            this.renderPagination(instance);
        },

        renderPagination(instance) {
            const footer = instance.container.querySelector('.table-footer');
            if (!footer) return;

            const total = instance.filteredData.length;
            const totalPages = Math.ceil(total / instance.pageSize);
            const start = (instance.currentPage - 1) * instance.pageSize + 1;
            const end = Math.min(instance.currentPage * instance.pageSize, total);

            const info = footer.querySelector('.table-info');
            if (info) {
                info.textContent = `Affichage ${start} à ${end} sur ${total} entrées`;
            }

            const pagination = footer.querySelector('.pagination');
            if (pagination) {
                pagination.innerHTML = `
                    <button class="pagination-btn" data-action="prev" ${instance.currentPage === 1 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"/>
                        </svg>
                    </button>
                    ${this.getPaginationButtons(instance.currentPage, totalPages)}
                    <button class="pagination-btn" data-action="next" ${instance.currentPage === totalPages ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"/>
                        </svg>
                    </button>
                `;
            }
        },

        getPaginationButtons(current, total) {
            const buttons = [];
            const maxVisible = 5;
            
            let start = Math.max(1, current - Math.floor(maxVisible / 2));
            let end = Math.min(total, start + maxVisible - 1);
            
            if (end - start < maxVisible - 1) {
                start = Math.max(1, end - maxVisible + 1);
            }

            for (let i = start; i <= end; i++) {
                buttons.push(`
                    <button class="pagination-btn ${i === current ? 'active' : ''}" data-action="${i}">
                        ${i}
                    </button>
                `);
            }

            return buttons.join('');
        },

        // Méthode pour mettre à jour les données
        setData(tableId, data) {
            const instance = this.instances[tableId];
            if (!instance) return;

            instance.data = data;
            instance.currentPage = 1;
            this.applyFilters(instance);
            this.render(instance);
        }
    };

    window.DataTable = DataTable;

    /* ============================================
       SYSTÈME D'ONGLETS
       ============================================ */

    const Tabs = {
        init() {
            const tabContainers = document.querySelectorAll('[data-tabs]');
            
            tabContainers.forEach(container => {
                const buttons = container.querySelectorAll('.tab-btn');
                const contents = container.querySelectorAll('.tab-content');

                buttons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const target = btn.dataset.tab;

                        // Retirer actif de tous
                        buttons.forEach(b => b.classList.remove('active'));
                        contents.forEach(c => c.classList.remove('active'));

                        // Activer le sélectionné
                        btn.classList.add('active');
                        const content = container.querySelector(`[data-tab-content="${target}"]`);
                        if (content) content.classList.add('active');
                    });
                });
            });
        }
    };

    /* ============================================
       GESTION DES FORMULAIRES
       ============================================ */

    const Forms = {
        init() {
            // Validation en temps réel
            document.querySelectorAll('form').forEach(form => {
                form.querySelectorAll('input, select, textarea').forEach(field => {
                    field.addEventListener('blur', () => this.validateField(field));
                    field.addEventListener('input', () => {
                        if (field.classList.contains('error')) {
                            this.validateField(field);
                        }
                    });
                });

                form.addEventListener('submit', (e) => {
                    if (!this.validateForm(form)) {
                        e.preventDefault();
                    }
                });
            });
        },

        validateField(field) {
            const value = field.value.trim();
            let isValid = true;
            let errorMessage = '';

            // Required
            if (field.required && !value) {
                isValid = false;
                errorMessage = 'Ce champ est requis';
            }

            // Email
            if (isValid && field.type === 'email' && value) {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Format de courriel invalide';
                }
            }

            // Téléphone
            if (isValid && field.type === 'tel' && value) {
                const phoneRegex = /^(\+225)?[0-9\s]{10,}$/;
                if (!phoneRegex.test(value.replace(/\s/g, ''))) {
                    isValid = false;
                    errorMessage = 'Format de téléphone invalide';
                }
            }

            // Min length
            if (isValid && field.minLength && value.length < field.minLength) {
                isValid = false;
                errorMessage = `Minimum ${field.minLength} caractères requis`;
            }

            // Pattern
            if (isValid && field.pattern && value) {
                const regex = new RegExp(field.pattern);
                if (!regex.test(value)) {
                    isValid = false;
                    errorMessage = field.dataset.patternError || 'Format invalide';
                }
            }

            // Afficher/cacher erreur
            this.setFieldError(field, isValid ? '' : errorMessage);

            return isValid;
        },

        setFieldError(field, message) {
            const formGroup = field.closest('.form-group, .form-field');
            let errorEl = formGroup?.querySelector('.input-error, .form-error');

            if (message) {
                field.classList.add('error');
                if (errorEl) errorEl.textContent = message;
            } else {
                field.classList.remove('error');
                if (errorEl) errorEl.textContent = '';
            }
        },

        validateForm(form) {
            const fields = form.querySelectorAll('input, select, textarea');
            let isValid = true;

            fields.forEach(field => {
                if (!this.validateField(field)) {
                    isValid = false;
                }
            });

            return isValid;
        }
    };

    /* ============================================
       VÉRIFICATION DE SESSION
       ============================================ */

    const Auth = {
        checkSession() {
            const currentPage = window.location.pathname.split('/').pop() || 'login.html';
            const publicPages = ['login.html', 'erreur.html'];
            
            if (publicPages.includes(currentPage)) return;

            const session = Storage.get('adminSession');
            
            if (!session || !session.token || session.expires < Date.now()) {
                // Session invalide ou expirée
                Storage.remove('adminSession');
                window.location.href = 'login.html';
            }
        },

        getUser() {
            const session = Storage.get('adminSession');
            return session?.user || null;
        },

        logout() {
            Storage.remove('adminSession');
            window.location.href = 'login.html';
        }
    };

    window.Auth = Auth;

    /* ============================================
       INITIALISATION GLOBALE
       ============================================ */

    function init() {
        // Initialiser Toast
        Toast.init();

        // Vérifier session (sauf page login)
        Auth.checkSession();

        // Page login
        LoginPage.init();

        // Sidebar
        Sidebar.init();

        // Onglets
        Tabs.init();

        // Formulaires
        Forms.init();

        // Initialiser les boutons de fermeture des modals
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => Modal.close());
        });

        // Mettre à jour l'info utilisateur dans le header
        const user = Auth.getUser();
        if (user) {
            const userNameEl = document.querySelector('.user-name');
            const userRoleEl = document.querySelector('.user-role');
            const userAvatarEl = document.querySelector('.user-avatar');
            
            if (userNameEl) userNameEl.textContent = user.name;
            if (userRoleEl) userRoleEl.textContent = user.role;
            if (userAvatarEl) userAvatarEl.textContent = user.name.charAt(0).toUpperCase();
        }

        console.log('Navette Express Admin - Initialisé');
    }

    // Lancer l'initialisation quand le DOM est prêt
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exposer les utilitaires
    window.NavetteAdmin = {
        Toast,
        Modal,
        DataTable,
        Storage,
        formatCurrency,
        formatDate,
        formatTime,
        debounce
    };

})();
