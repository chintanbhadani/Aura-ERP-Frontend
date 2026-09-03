export const API = {
  login: `/user/login`,
  sendOTP: `/user/sendOtp`,
  resetPassword: `/user/resetPassword`,
  getClient: `/client`,
  getInventory: `/inventory/local`,
  analyzeSearchTermReport: `/ads/reports/analyze`,
  getSuggestions: `/ads/suggestions`,
  triggerAutomation: `/ads/actions/trigger-automation`,
  seedSuggestions: `/ads/actions/seed-suggestions`,
  getLostBuybox: `/mapping/lost-buybox`,
  scanBuybox: `/mapping/check?skipHistory=true`,
  getAdsCampaigns: `/ads/campaigns`,
  getAdsProductAds: `/ads/productads`,
  expenses: `/expenses`,
  expenseTypes: `/expense-types`,
  transactions: `/transactions`,
  transactionSummary: `/transactions/summary`,
  dailyBreakdown: `/transactions/daily-breakdown`,
  settlements: `/settlements`,
  settlementSummary: `/settlements/summary`,
};

export const SOCKET_EVENT = {};
