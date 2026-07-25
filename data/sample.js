const EventEmitter = require('events');
const changeEmitter = new EventEmitter();
changeEmitter.setMaxListeners(100);

let movies = [];

let series = [];

let users = [
  { id: 1, name: "Admin", email: "admin@streamx.com", password: "$2a$10$2Sy/ikC7QwA8f3/y0oS0MeCtZFP/tWIg9QtrDeM47DQCwiXEDX.zy", role: "admin", avatar: "A", plan: "premium", joinedAt: new Date('2025-01-15'), lastActive: new Date(), watchTime: 0, devices: 1 }
];

let payments = [];

let nextMovieId = 1000;
let nextSeriesId = 1000;
let nextUserId = users.length + 1;
let nextPaymentId = payments.length + 1;

let activityLogs = [];

let reports = [];

function addLog(type, message, adminName) {
  activityLogs.unshift({
    id: activityLogs.length + 1,
    type,
    message,
    admin: adminName || 'System',
    timestamp: new Date()
  });
  if (activityLogs.length > 100) activityLogs.length = 100;
}

function addReport(type, content, reason, reportedBy) {
  reports.unshift({
    id: reports.length + 1,
    type,
    content,
    reason,
    reportedBy: reportedBy || 'System',
    status: 'pending',
    timestamp: new Date()
  });
}

function addPayment(userId, amount, plan, method, status) {
  payments.unshift({
    id: nextPaymentId++,
    userId,
    amount,
    plan,
    method: method || 'UPI',
    status: status || 'completed',
    date: new Date(),
    transactionId: 'TXN' + String(nextPaymentId).padStart(3, '0')
  });
}

module.exports = {
  movies, series, users, payments, activityLogs, reports,
  getNextMovieId: () => nextMovieId++,
  getNextSeriesId: () => nextSeriesId++,
  getNextUserId: () => nextUserId++,
  getNextPaymentId: () => nextPaymentId++,
  changeEmitter, addLog, addReport, addPayment
};
