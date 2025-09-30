import { get_actutal_rss } from './src/server-side/parser';
import cron from 'node-cron';
console.log('[CRON WORKER] Воркер запущен.');

cron.schedule('*/5 * * * *', () => {
    console.log('[CRON WORKER] Запуск запланированной задачи...');
    get_actutal_rss();
});