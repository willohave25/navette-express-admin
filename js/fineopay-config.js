/**
 * NAVETTE EXPRESS - Configuration FinéoPay
 * Intégration paiements Mobile Money (Orange Money, MTN, Moov, Wave)
 * W2K-Digital 2025
 * 
 * IMPORTANT: Remplacer les valeurs placeholder par les vraies clés en production
 * Documentation: https://docs.fineopay.com
 */

const FineoPayConfig = (function() {
    'use strict';

    // Configuration FinéoPay
    // TODO: Remplacer par les vraies valeurs du compte FinéoPay
    const CONFIG = {
        // Clés API
        publicKey: 'pk_test_VOTRE_CLE_PUBLIQUE',
        secretKey: null, // Ne jamais exposer côté client - utiliser côté serveur
        
        // Environnement
        environment: 'sandbox', // 'sandbox' ou 'production'
        
        // URLs
        baseUrl: {
            sandbox: 'https://sandbox.fineopay.com/api/v1',
            production: 'https://api.fineopay.com/api/v1'
        },
        
        // Devise par défaut
        currency: 'XOF', // Franc CFA BCEAO
        
        // Pays supporté
        country: 'CI', // Côte d'Ivoire
        
        // Webhook URL (à configurer côté serveur)
        webhookUrl: 'https://api.jaebets-holding.com/webhooks/fineopay',
        
        // Callbacks
        successUrl: `${window.location.origin}/paiements.html?status=success`,
        failUrl: `${window.location.origin}/paiements.html?status=failed`,
        cancelUrl: `${window.location.origin}/paiements.html?status=cancelled`
    };

    // Opérateurs Mobile Money supportés en Côte d'Ivoire
    const OPERATORS = {
        ORANGE_MONEY: {
            id: 'orange_money_ci',
            name: 'Orange Money',
            code: 'OM',
            color: '#FF6600',
            icon: 'orange-money',
            prefix: ['07', '08', '09'],
            minAmount: 100,
            maxAmount: 2000000,
            fees: 0.015 // 1.5%
        },
        MTN_MONEY: {
            id: 'mtn_money_ci',
            name: 'MTN Mobile Money',
            code: 'MTN',
            color: '#FFCC00',
            icon: 'mtn-money',
            prefix: ['05', '04'],
            minAmount: 100,
            maxAmount: 2000000,
            fees: 0.015
        },
        MOOV_MONEY: {
            id: 'moov_money_ci',
            name: 'Moov Money',
            code: 'MOOV',
            color: '#0066CC',
            icon: 'moov-money',
            prefix: ['01', '02', '03'],
            minAmount: 100,
            maxAmount: 1000000,
            fees: 0.02 // 2%
        },
        WAVE: {
            id: 'wave_ci',
            name: 'Wave',
            code: 'WAVE',
            color: '#1DC4E9',
            icon: 'wave',
            prefix: ['07', '05', '01'],
            minAmount: 100,
            maxAmount: 5000000,
            fees: 0.01 // 1%
        }
    };

    // Types de transactions
    const TRANSACTION_TYPES = {
        PAYMENT: 'payment',           // Paiement client
        REFUND: 'refund',             // Remboursement
        TRANSFER: 'transfer',         // Transfert
        WITHDRAWAL: 'withdrawal',      // Retrait
        TOP_UP: 'top_up'              // Recharge
    };

    // Statuts de transaction
    const TRANSACTION_STATUS = {
        PENDING: 'pending',
        PROCESSING: 'processing',
        COMPLETED: 'completed',
        FAILED: 'failed',
        CANCELLED: 'cancelled',
        REFUNDED: 'refunded'
    };

    /**
     * Obtenir l'URL de base selon l'environnement
     */
    function getBaseUrl() {
        return CONFIG.baseUrl[CONFIG.environment];
    }

    /**
     * Headers pour les requêtes API
     */
    function getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CONFIG.publicKey}`,
            'X-API-Version': '2024-01'
        };
    }

    // ========================================
    // PAIEMENTS
    // ========================================

    const Payments = {
        /**
         * Initialiser un paiement Mobile Money
         */
        async initiate(params) {
            const {
                amount,
                operator,
                phoneNumber,
                description,
                reference,
                metadata = {}
            } = params;

            // Validation
            if (!amount || amount < 100) {
                throw new Error('Montant minimum: 100 FCFA');
            }

            const operatorConfig = OPERATORS[operator];
            if (!operatorConfig) {
                throw new Error('Opérateur non supporté');
            }

            if (amount > operatorConfig.maxAmount) {
                throw new Error(`Montant maximum ${operatorConfig.name}: ${formatCurrency(operatorConfig.maxAmount)}`);
            }

            const payload = {
                amount: Math.round(amount),
                currency: CONFIG.currency,
                country: CONFIG.country,
                payment_method: operatorConfig.id,
                phone_number: formatPhoneNumber(phoneNumber),
                description: description || 'Paiement Navette Express',
                reference: reference || generateReference(),
                callback_url: CONFIG.webhookUrl,
                success_url: CONFIG.successUrl,
                fail_url: CONFIG.failUrl,
                metadata: {
                    ...metadata,
                    source: 'navette_express_admin',
                    timestamp: new Date().toISOString()
                }
            };

            try {
                const response = await fetch(`${getBaseUrl()}/payments/initiate`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de l\'initialisation du paiement');
                }

                return {
                    success: true,
                    transactionId: data.transaction_id,
                    reference: data.reference,
                    status: data.status,
                    ussdCode: data.ussd_code,
                    instructions: data.instructions,
                    expiresAt: data.expires_at
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur paiement:', error);
                throw error;
            }
        },

        /**
         * Vérifier le statut d'une transaction
         */
        async checkStatus(transactionId) {
            try {
                const response = await fetch(`${getBaseUrl()}/payments/${transactionId}`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la vérification');
                }

                return {
                    transactionId: data.transaction_id,
                    reference: data.reference,
                    amount: data.amount,
                    currency: data.currency,
                    status: data.status,
                    operator: data.payment_method,
                    phoneNumber: data.phone_number,
                    createdAt: data.created_at,
                    completedAt: data.completed_at,
                    metadata: data.metadata
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur vérification:', error);
                throw error;
            }
        },

        /**
         * Annuler une transaction en attente
         */
        async cancel(transactionId, reason = '') {
            try {
                const response = await fetch(`${getBaseUrl()}/payments/${transactionId}/cancel`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify({ reason })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de l\'annulation');
                }

                return {
                    success: true,
                    transactionId: data.transaction_id,
                    status: TRANSACTION_STATUS.CANCELLED
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur annulation:', error);
                throw error;
            }
        }
    };

    // ========================================
    // REMBOURSEMENTS
    // ========================================

    const Refunds = {
        /**
         * Initier un remboursement
         */
        async initiate(params) {
            const {
                originalTransactionId,
                amount,
                reason,
                metadata = {}
            } = params;

            const payload = {
                transaction_id: originalTransactionId,
                amount: amount ? Math.round(amount) : null, // null = remboursement total
                reason: reason || 'Remboursement client',
                metadata: {
                    ...metadata,
                    initiated_by: 'admin',
                    timestamp: new Date().toISOString()
                }
            };

            try {
                const response = await fetch(`${getBaseUrl()}/refunds`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors du remboursement');
                }

                return {
                    success: true,
                    refundId: data.refund_id,
                    originalTransactionId: data.original_transaction_id,
                    amount: data.amount,
                    status: data.status
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur remboursement:', error);
                throw error;
            }
        },

        /**
         * Vérifier le statut d'un remboursement
         */
        async checkStatus(refundId) {
            try {
                const response = await fetch(`${getBaseUrl()}/refunds/${refundId}`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la vérification');
                }

                return data;
            } catch (error) {
                console.error('[FinéoPay] Erreur vérification remboursement:', error);
                throw error;
            }
        }
    };

    // ========================================
    // TRANSFERTS (Paiement chauffeurs)
    // ========================================

    const Transfers = {
        /**
         * Effectuer un transfert vers un portefeuille Mobile Money
         */
        async send(params) {
            const {
                amount,
                operator,
                phoneNumber,
                recipientName,
                description,
                reference,
                metadata = {}
            } = params;

            const operatorConfig = OPERATORS[operator];
            if (!operatorConfig) {
                throw new Error('Opérateur non supporté');
            }

            const payload = {
                amount: Math.round(amount),
                currency: CONFIG.currency,
                country: CONFIG.country,
                payment_method: operatorConfig.id,
                recipient_phone: formatPhoneNumber(phoneNumber),
                recipient_name: recipientName,
                description: description || 'Paiement Navette Express',
                reference: reference || generateReference('TRF'),
                metadata: {
                    ...metadata,
                    type: 'driver_payment',
                    timestamp: new Date().toISOString()
                }
            };

            try {
                const response = await fetch(`${getBaseUrl()}/transfers`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors du transfert');
                }

                return {
                    success: true,
                    transferId: data.transfer_id,
                    reference: data.reference,
                    amount: data.amount,
                    status: data.status,
                    fees: data.fees
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur transfert:', error);
                throw error;
            }
        },

        /**
         * Transfert en masse (plusieurs chauffeurs)
         */
        async bulkSend(transfers) {
            const payload = {
                transfers: transfers.map(t => ({
                    amount: Math.round(t.amount),
                    currency: CONFIG.currency,
                    payment_method: OPERATORS[t.operator]?.id,
                    recipient_phone: formatPhoneNumber(t.phoneNumber),
                    recipient_name: t.recipientName,
                    reference: t.reference || generateReference('BULK'),
                    metadata: t.metadata || {}
                }))
            };

            try {
                const response = await fetch(`${getBaseUrl()}/transfers/bulk`, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors du transfert en masse');
                }

                return {
                    success: true,
                    batchId: data.batch_id,
                    totalAmount: data.total_amount,
                    totalFees: data.total_fees,
                    transfers: data.transfers
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur transfert en masse:', error);
                throw error;
            }
        }
    };

    // ========================================
    // BALANCE & RAPPORTS
    // ========================================

    const Account = {
        /**
         * Obtenir le solde du compte
         */
        async getBalance() {
            try {
                const response = await fetch(`${getBaseUrl()}/account/balance`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la récupération du solde');
                }

                return {
                    available: data.available_balance,
                    pending: data.pending_balance,
                    currency: data.currency
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur solde:', error);
                throw error;
            }
        },

        /**
         * Obtenir l'historique des transactions
         */
        async getTransactions(params = {}) {
            const {
                startDate,
                endDate,
                status,
                type,
                page = 1,
                limit = 50
            } = params;

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString()
            });

            if (startDate) queryParams.append('start_date', startDate);
            if (endDate) queryParams.append('end_date', endDate);
            if (status) queryParams.append('status', status);
            if (type) queryParams.append('type', type);

            try {
                const response = await fetch(`${getBaseUrl()}/transactions?${queryParams}`, {
                    method: 'GET',
                    headers: getHeaders()
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.message || 'Erreur lors de la récupération');
                }

                return {
                    transactions: data.data,
                    pagination: {
                        page: data.page,
                        limit: data.limit,
                        total: data.total,
                        totalPages: data.total_pages
                    }
                };
            } catch (error) {
                console.error('[FinéoPay] Erreur transactions:', error);
                throw error;
            }
        }
    };

    // ========================================
    // UTILITAIRES
    // ========================================

    /**
     * Formater un numéro de téléphone ivoirien
     */
    function formatPhoneNumber(phone) {
        // Nettoyer le numéro
        let cleaned = phone.replace(/\D/g, '');
        
        // Ajouter le préfixe pays si nécessaire
        if (cleaned.length === 10 && cleaned.startsWith('0')) {
            cleaned = '225' + cleaned.substring(1);
        } else if (cleaned.length === 9) {
            cleaned = '225' + cleaned;
        }
        
        return '+' + cleaned;
    }

    /**
     * Détecter l'opérateur à partir du numéro
     */
    function detectOperator(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        const prefix = cleaned.slice(-10, -8);

        for (const [key, operator] of Object.entries(OPERATORS)) {
            if (operator.prefix.includes(prefix)) {
                return key;
            }
        }
        return null;
    }

    /**
     * Générer une référence unique
     */
    function generateReference(prefix = 'NX') {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `${prefix}-${timestamp}-${random}`;
    }

    /**
     * Formater un montant en FCFA
     */
    function formatCurrency(amount) {
        return new Intl.NumberFormat('fr-FR').format(amount) + ' FCFA';
    }

    /**
     * Calculer les frais de transaction
     */
    function calculateFees(amount, operator) {
        const operatorConfig = OPERATORS[operator];
        if (!operatorConfig) return 0;
        return Math.round(amount * operatorConfig.fees);
    }

    // ========================================
    // WIDGET PAIEMENT
    // ========================================

    const Widget = {
        /**
         * Afficher le widget de sélection d'opérateur
         */
        renderOperatorSelector(containerId, onSelect) {
            const container = document.getElementById(containerId);
            if (!container) return;

            container.innerHTML = `
                <div class="fineo-operators">
                    ${Object.entries(OPERATORS).map(([key, op]) => `
                        <button type="button" 
                                class="fineo-operator" 
                                data-operator="${key}"
                                style="--op-color: ${op.color}">
                            <span class="fineo-operator-icon">${op.code}</span>
                            <span class="fineo-operator-name">${op.name}</span>
                        </button>
                    `).join('')}
                </div>
            `;

            // Gestionnaire de clic
            container.querySelectorAll('.fineo-operator').forEach(btn => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.fineo-operator').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    onSelect(btn.dataset.operator);
                });
            });
        },

        /**
         * Formulaire de paiement complet
         */
        renderPaymentForm(containerId, options = {}) {
            const container = document.getElementById(containerId);
            if (!container) return;

            const { amount, description, onSubmit, onCancel } = options;

            container.innerHTML = `
                <div class="fineo-payment-form">
                    <h3>Paiement Mobile Money</h3>
                    
                    <div class="fineo-amount">
                        <span class="fineo-amount-value">${formatCurrency(amount)}</span>
                        <span class="fineo-amount-label">${description || 'À payer'}</span>
                    </div>
                    
                    <div class="fineo-field">
                        <label>Opérateur</label>
                        <div id="fineo-operators"></div>
                    </div>
                    
                    <div class="fineo-field">
                        <label>Numéro de téléphone</label>
                        <input type="tel" 
                               id="fineo-phone" 
                               placeholder="07 XX XX XX XX"
                               pattern="[0-9]{10}"
                               required>
                    </div>
                    
                    <div class="fineo-actions">
                        <button type="button" class="fineo-btn fineo-btn-cancel">Annuler</button>
                        <button type="button" class="fineo-btn fineo-btn-pay" disabled>
                            Payer ${formatCurrency(amount)}
                        </button>
                    </div>
                </div>
            `;

            let selectedOperator = null;
            const phoneInput = container.querySelector('#fineo-phone');
            const payBtn = container.querySelector('.fineo-btn-pay');
            const cancelBtn = container.querySelector('.fineo-btn-cancel');

            // Sélecteur d'opérateur
            this.renderOperatorSelector('fineo-operators', (operator) => {
                selectedOperator = operator;
                checkFormValidity();
            });

            // Validation du formulaire
            function checkFormValidity() {
                const phoneValid = phoneInput.value.replace(/\D/g, '').length >= 10;
                payBtn.disabled = !selectedOperator || !phoneValid;
            }

            phoneInput.addEventListener('input', checkFormValidity);

            // Actions
            payBtn.addEventListener('click', async () => {
                if (!selectedOperator || !phoneInput.value) return;
                
                payBtn.disabled = true;
                payBtn.textContent = 'Traitement...';

                try {
                    const result = await Payments.initiate({
                        amount,
                        operator: selectedOperator,
                        phoneNumber: phoneInput.value,
                        description
                    });
                    
                    if (onSubmit) onSubmit(result);
                } catch (error) {
                    payBtn.disabled = false;
                    payBtn.textContent = `Payer ${formatCurrency(amount)}`;
                    alert('Erreur: ' + error.message);
                }
            });

            cancelBtn.addEventListener('click', () => {
                if (onCancel) onCancel();
            });
        }
    };

    // ========================================
    // API PUBLIQUE
    // ========================================

    return {
        // Configuration
        CONFIG,
        OPERATORS,
        TRANSACTION_TYPES,
        TRANSACTION_STATUS,
        
        // Modules
        Payments,
        Refunds,
        Transfers,
        Account,
        Widget,
        
        // Utilitaires
        formatPhoneNumber,
        detectOperator,
        generateReference,
        formatCurrency,
        calculateFees,
        
        // Vérifier si configuré
        isConfigured() {
            return CONFIG.publicKey !== 'pk_test_VOTRE_CLE_PUBLIQUE';
        },
        
        // Passer en production
        setProduction() {
            CONFIG.environment = 'production';
        },
        
        // Obtenir l'environnement actuel
        getEnvironment() {
            return CONFIG.environment;
        }
    };
})();

// Export pour utilisation modulaire
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FineoPayConfig;
}
