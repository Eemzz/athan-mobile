export type SettingsTab = 'location' | 'prayer' | 'alerts' | 'widgets' | 'about';

export function mountSettingsTabs(root: HTMLElement) {
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-settings-tab]'));
  function select(name: SettingsTab, focus = false) {
    for (const tab of tabs) {
      const active = tab.dataset.settingsTab === name;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      root.querySelector<HTMLElement>('#' + tab.getAttribute('aria-controls'))!.hidden = !active;
      if (active && focus) tab.focus();
    }
  }
  tabs.forEach((tab, index) => {
    tab.onclick = () => select(tab.dataset.settingsTab as SettingsTab);
    tab.onkeydown = (event) => {
      let target: number;
      switch (event.key) {
        case 'ArrowRight':
          target = (index + 1) % tabs.length;
          break;
        case 'ArrowLeft':
          target = (index + tabs.length - 1) % tabs.length;
          break;
        case 'Home':
          target = 0;
          break;
        case 'End':
          target = tabs.length - 1;
          break;
        default:
          return;
      }
      event.preventDefault();
      select(tabs[target].dataset.settingsTab as SettingsTab, true);
    };
  });
  select('location');
  return select;
}
