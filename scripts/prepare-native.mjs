import {readFile,writeFile,mkdir,copyFile} from 'node:fs/promises';
import xcode from 'xcode';
const android='android/app/src/main/res';
await mkdir(`${android}/raw`,{recursive:true});
await copyFile('public/athan.mp3',`${android}/raw/athan.mp3`);
await copyFile('public/athan_beautiful.mp3',`${android}/raw/athan_beautiful.mp3`);
for(const [name,start,end] of [['fajr','#DCE6F0','#F9DFC9'],['dhuhr','#F7EDC8','#EFDAA0'],['asr','#E4EADB','#C9D5B7'],['maghrib','#EBC9BC','#E8A48C'],['isha','#223350','#34466B']]){
  await writeFile(`${android}/drawable/widget_${name}.xml`,`<?xml version="1.0" encoding="utf-8"?><shape xmlns:android="http://schemas.android.com/apk/res/android"><corners android:radius="24dp"/><gradient android:startColor="${start}" android:endColor="${end}" android:angle="315"/></shape>\n`);
}
const stringsPath=`${android}/values/strings.xml`;
let strings=await readFile(stringsPath,'utf8');if(!strings.includes('widget_description'))strings=strings.replace('</resources>','    <string name="widget_description">The next prayer and its time, in your prayer theme.</string>\n</resources>');await writeFile(stringsPath,strings);
await copyFile('public/athan_short.wav','ios/App/App/athan_short.wav');
await copyFile('public/athan_beautiful_short.wav','ios/App/App/athan_beautiful_short.wav');
// The full recording remains inside the web assets; only the short alert is a native resource.
const scenePath='ios/App/App/SceneDelegate.swift';
let scene=await readFile(scenePath,'utf8');scene=scene.replace('window?.rootViewController = CAPBridgeViewController()','window?.rootViewController = AthanViewController()');await writeFile(scenePath,scene);
const storyboardPath='ios/App/App/Base.lproj/Main.storyboard';
let storyboard=await readFile(storyboardPath,'utf8');storyboard=storyboard.replace('customClass="CAPBridgeViewController" customModule="Capacitor"','customClass="AthanViewController" customModule="App" customModuleProvider="target"');await writeFile(storyboardPath,storyboard);
const infoPath='ios/App/App/Info.plist';
let info=await readFile(infoPath,'utf8');if(!info.includes('NSLocationWhenInUseUsageDescription'))info=info.replace('<dict>','<dict>\n\t<key>NSLocationWhenInUseUsageDescription</key><string>Your location calculates prayer times on your device.</string>');await writeFile(infoPath,info);
if(!info.includes('NSLocationAlwaysAndWhenInUseUsageDescription')){info=info.replace('<dict>','<dict>\n\t<key>NSLocationAlwaysAndWhenInUseUsageDescription</key><string>Your location calculates prayer times on your device.</string>');await writeFile(infoPath,info);}
const pbxPath='ios/App/App.xcodeproj/project.pbxproj';const project=xcode.project(pbxPath);project.parseSync();
const appTarget=project.getFirstTarget().uuid;
const groups=project.hash.project.objects.PBXGroup;
const appGroup=Object.keys(groups).find(k=>groups[k]?.path==='App'||groups[k]?.name==='App');
if(!project.pbxGroupByName('Resources')){const group=project.addPbxGroup([],'Resources',undefined);project.addToPbxGroup({fileRef:group.uuid,basename:'Resources'},project.getFirstProject().firstProject.mainGroup);}
if(!project.hasFile('PrayerWidgetPlugin.swift'))project.addSourceFile('PrayerWidgetPlugin.swift',{target:appTarget},appGroup);
if(!project.hasFile('athan_short.wav'))project.addResourceFile('athan_short.wav',{target:appTarget},appGroup);
if(!project.hasFile('athan_beautiful_short.wav'))project.addResourceFile('athan_beautiful_short.wav',{target:appTarget},appGroup);
for(const item of Object.values(project.pbxXCBuildConfigurationSection()))if(item?.buildSettings?.PRODUCT_NAME==='"$(TARGET_NAME)"'||item?.buildSettings?.PRODUCT_BUNDLE_IDENTIFIER==='app.athan.daily'){
  if(item.buildSettings.INFOPLIST_FILE==='App/Info.plist'){item.buildSettings.CODE_SIGN_ENTITLEMENTS='App/App.entitlements';item.buildSettings.IPHONEOS_DEPLOYMENT_TARGET='17.0';item.buildSettings.MARKETING_VERSION='0.1.0';item.buildSettings.CURRENT_PROJECT_VERSION='1';}
}
const targets=project.pbxNativeTargetSection();let widgetID=Object.keys(targets).find(k=>String(targets[k]?.name).replaceAll('"','')==='AthanWidget');
if(!widgetID){
  const target=project.addTarget('AthanWidget','app_extension','AthanWidget','app.athan.daily.widget');widgetID=target.uuid;
  project.addBuildPhase([], 'PBXSourcesBuildPhase','Sources',widgetID);
  project.addBuildPhase([], 'PBXFrameworksBuildPhase','Frameworks',widgetID);
  project.addBuildPhase([], 'PBXResourcesBuildPhase','Resources',widgetID);
  project.addSourceFile('AthanWidget/AthanWidget.swift',{target:widgetID},project.getFirstProject().firstProject.mainGroup);
  const configurations=project.pbxXCBuildConfigurationSection();
  const widgetConfigs=project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList].buildConfigurations;
  for(const c of widgetConfigs){const b=configurations[c.value].buildSettings;Object.assign(b,{INFOPLIST_FILE:'AthanWidget/Info.plist',CODE_SIGN_ENTITLEMENTS:'AthanWidget/AthanWidget.entitlements',SWIFT_VERSION:'5.0',IPHONEOS_DEPLOYMENT_TARGET:'17.0',TARGETED_DEVICE_FAMILY:'"1,2"',GENERATE_INFOPLIST_FILE:'YES',CURRENT_PROJECT_VERSION:'1',MARKETING_VERSION:'0.1.0',SKIP_INSTALL:'YES',APPLICATION_EXTENSION_API_ONLY:'YES',CODE_SIGN_STYLE:'Automatic',LD_RUNPATH_SEARCH_PATHS:'"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"'});}
}
const dependencies=project.pbxNativeTargetSection()[appTarget].dependencies;
const targetDependencies=project.hash.project.objects.PBXTargetDependency??{};
if(!dependencies.some(d=>targetDependencies[d.value]?.target===widgetID))project.addTargetDependency(appTarget,[widgetID]);
// xcode's legacy serializer emits literal "undefined" metadata for new file types.
for(const section of Object.values(project.hash.project.objects))if(section&&typeof section==='object')for(const item of Object.values(section))if(item&&typeof item==='object'&&!Array.isArray(item))for(const [key,value] of Object.entries(item))if(value==='undefined'||value===undefined)delete item[key];
await writeFile(pbxPath,project.writeSync());
console.log('Prepared Android widget, iOS WidgetKit target, app group, location permissions and athan sounds.');
