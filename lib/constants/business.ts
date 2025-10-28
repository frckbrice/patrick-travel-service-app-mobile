/**
 * Business Information Constants
 * Centralized contact details and business information for Patrick Travel Services
 */

export const BUSINESS_INFO = {
    // Company Information
    COMPANY_NAME: 'Patrick Travel Services',
    LEGAL_NAME: 'Patrick Travel Services Inc.',

    // Contact Information
    CONTACT: {
        // General Support
        EMAIL: 'support@patricktravel.com',
        PHONE: '+1 (555) 123-4567',

        // Legal & Privacy
        LEGAL_EMAIL: 'legal@patricktravel.com',
        PRIVACY_EMAIL: 'privacy@patricktravel.com',

        // Data Protection Officer
        DPO_EMAIL: 'dpo@patricktravel.com',
        DPO_PHONE: '+1 (555) 123-4568',

        // Business Address
        ADDRESS: {
            STREET: '123 Immigration Boulevard, Suite 200',
            CITY: 'Paris',
            PROVINCE: 'ON',
            POSTAL_CODE: 'M5H 2N2',
            COUNTRY: 'France',
        },

        // Support Hours
        SUPPORT_HOURS: 'Monday-Friday, 9:00 AM - 6:00 PM CET',
    },

    // Legal Information
    LEGAL: {
        JURISDICTION: 'Paris, France',
        VENUE: 'Paris, France',
        GOVERNING_LAW: 'Paris, France',
    },

    // App Information
    APP: {
        VERSION: '1.0.0',
        BUNDLE_ID: 'com.unidov.patricktravel',
        SCHEME: 'patrick-travel',
    },

    // Compliance
    COMPLIANCE: {
        GDPR_COMPLIANT: true,
        DATA_RETENTION_DAYS: 30,
        LEGAL_RETENTION_YEARS: 7,
        MIN_AGE: 18,
    },
} as const;

// Helper functions for formatting contact information
export const formatAddress = () => {
    const { ADDRESS } = BUSINESS_INFO.CONTACT;
    return `${ADDRESS.STREET}\n${ADDRESS.CITY}, ${ADDRESS.PROVINCE} ${ADDRESS.POSTAL_CODE}\n${ADDRESS.COUNTRY}`;
};

export const formatFullContact = () => {
    const { CONTACT } = BUSINESS_INFO;
    return {
        email: CONTACT.EMAIL,
        phone: CONTACT.PHONE,
        address: formatAddress(),
        supportHours: CONTACT.SUPPORT_HOURS,
    };
};

export const formatDPOContact = () => {
    const { DPO_EMAIL, DPO_PHONE } = BUSINESS_INFO.CONTACT;
    return {
        email: DPO_EMAIL,
        phone: DPO_PHONE,
    };
};

