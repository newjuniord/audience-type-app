import DodoPayments from 'dodopayments';

// Initialize the Dodo Payments client
// We use process.env to keep keys secure.
const dodo = new DodoPayments({
    bearerToken: process.env.DODO_PAYMENTS_API_KEY || '',
    environment: process.env.DODO_PAYMENTS_API_KEY?.startsWith('test_') ? 'test_mode' : 'live_mode',
});

export default dodo;
