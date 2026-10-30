import type { CapacitorConfig } from '@capacitor/cli';
const config: CapacitorConfig = {
  appId: 'app.athan.daily', appName: 'Athan', webDir: 'dist',
  backgroundColor: '#f8faf6',
  plugins: { LocalNotifications: { smallIcon: 'ic_stat_athan', iconColor: '#526c50', presentationOptions: ['banner', 'list', 'sound'] } },
};
export default config;
