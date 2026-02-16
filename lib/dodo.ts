import DodoPayments from 'dodopayments';

// Initialize the Dodo Payments client
// We use process.env to keep keys secure.
// For now, we'll use a placeholder or test key if not set.
const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || '', // Your API Key here
    environment: 'test_mode', // 'live_mode' for production
});

export default dodo;
