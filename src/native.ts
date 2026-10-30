import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { Prayer, Settings } from './prayers';
import { notificationRows } from './prayers';
import { recordingFor } from './recordings';
export const PrayerWidget = registerPlugin<{update(options:{schedule:string}):Promise<void>}>('PrayerWidget');
export async function syncWidgets(rows: Prayer[], settings: Settings): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  await PrayerWidget.update({schedule:JSON.stringify({location:settings.location?.label??'',timezone:settings.location?.timezone??'UTC',prayers:rows.map(p=>({name:p.name,at:p.at.getTime()}))})});
}
export async function syncAlerts(rows: Prayer[], settings: Settings, ask = false): Promise<{message:string}> {
  if (!Capacitor.isNativePlatform()) return {message:settings.alerts?'Alerts work in the installed Android or iOS app.':'Alerts off.'};
  if (!settings.alerts) { const old=await LocalNotifications.getPending(); if(old.notifications.length)await LocalNotifications.cancel(old);return {message:'Alerts off.'}; }
  const permission = ask ? await LocalNotifications.requestPermissions() : await LocalNotifications.checkPermissions();
  if(permission.display!=='granted') throw new Error('Notifications are not allowed. Enable them in your phone settings.');
  let warning='';
  const recording=recordingFor(settings.recording);
  if(Capacitor.getPlatform()==='android'){
    const exact=await LocalNotifications.checkExactNotificationSetting();
    if(exact.exact_alarm!=='granted')warning=' Allow “Alarms & reminders” for precise timing.';
    await LocalNotifications.createChannel({id:recording.channel,name:`Athan · ${recording.label}`,description:'Prayer time with athan audio',sound:recording.file,importance:4,visibility:1});
    await LocalNotifications.createChannel({id:'athan-silent-v1',name:'Silent prayer reminders',importance:3,visibility:1});
  }
  const selected=notificationRows(rows,settings);
  const old=await LocalNotifications.getPending();if(old.notifications.length)await LocalNotifications.cancel(old);
  await LocalNotifications.schedule({notifications:selected.map((p,i)=>({id:1000+i,title:`Time for ${p.name}`,body:`${p.name} prayer · ${settings.location!.label}`,schedule:{at:p.at,allowWhileIdle:true},channelId:settings.sound?recording.channel:'athan-silent-v1',...(settings.sound?{sound:Capacitor.getPlatform()==='ios'?recording.iosSound:recording.file}:{}),extra:{prayer:p.name}}))});
  const last=selected.at(-1)?.at;
  return {message:last?`Reminders scheduled through ${last.toLocaleDateString(undefined,{timeZone:settings.location!.timezone})}. Open the app regularly to refresh them.${warning}`:'No upcoming reminders to schedule.'};
}
