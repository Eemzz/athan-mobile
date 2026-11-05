export function appTemplate(icon: (name: string) => string): string {
  return `
<div class="phone">
  <header>
    <span class="brand">athan<span>·</span></span
    ><button class="location" aria-label="Change location">${icon('map-pin')}<span></span></button>
  </header>
  <main>
    <div id="message" role="status" hidden></div>
    <section class="today-screen">
      <div class="dayline"><span class="date-label"></span><span>Today</span></div>
      <div class="onboarding" hidden>
        <h1 class="welcome-arabic" lang="ar" dir="rtl">حَيَّ عَلَى الصَّلَاةِ</h1>
        <p class="welcome-translation">Come to prayer.</p>
        <p>Set your location to see accurate prayer times and your next athan.</p>
        <button class="primary locate">Use my location</button
        ><button class="secondary choose-location">Choose a city</button>
      </div>
      <div class="prayer-content">
        <div class="hero">
          <div class="stars" aria-hidden="true"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
          <div class="sun-orb" aria-hidden="true"></div>
          <div class="land land-back" aria-hidden="true"></div>
          <div class="land land-front" aria-hidden="true"></div>
          <div class="hero-content">
            <span class="eyebrow">NEXT ATHAN</span>
            <h1 class="next-name"></h1>
            <div class="hero-time"></div>
            <div class="countdown">
              <span class="pulse"></span><span class="count-text" aria-live="off"></span>
            </div>
          </div>
          <div class="home-time-marker">
            <div class="home-time-rail" role="progressbar" aria-label="Progress to next prayer" aria-valuemin="0" aria-valuemax="100"><span></span><b></b></div>
            <div class="home-time-labels"><span class="previous-prayer-time"></span><span class="next-prayer-time"></span></div>
          </div>
          <div class="prayer-reminder">
            <p class="reminder-arabic" lang="ar" dir="rtl"></p>
            <h2 class="reminder-translation"></h2>
            <p class="reminder-reference"></p>
          </div>
        </div>
        <div class="section-heading">
          <h3>Prayer times</h3>
          <span class="sample method-label"></span>
        </div>
        <div class="prayers"></div>
        <button class="alert-button">
          ${icon('volume-2')}<span>Athan & reminders</span
          ><span class="alert-state"></span>${icon('chevron-right')}
        </button>
        <p class="timezone-label"></p>
      </div>
    </section>
    <section class="quran-screen" hidden>
      <div class="quran-heading">
        <h1>Quran</h1>
        <p>A little reading. A little reflection.</p>
      </div>
      <label class="search"
        >${icon('search')}<input
          id="quran-search"
          type="search"
          aria-label="Search Quran"
          placeholder="Surah, verse (2:255), or words"
      /></label>
      <div class="reader-meta">ARABIC + ENGLISH <span>Offline · Pickthall</span></div>
      <details class="feature-credit">
        <summary>Quran text sources</summary>
        <p class="settings-note">Arabic: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil Project</a>, preserved verbatim under <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noopener">CC BY 3.0</a>. English: Mohammed Marmaduke Pickthall (1930), public domain. Dataset and metadata: <a href="https://github.com/risan/quran-json" target="_blank" rel="noopener">Quran JSON by Risan Bagja Pradana</a>, <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noopener">CC BY-SA 4.0</a>.</p>
      </details>
      <div class="quran-results" aria-live="polite"></div>
    </section>
    <section class="settings-screen" hidden>
      <h1>Settings</h1>
      <p class="subtle">Make time for salah.</p>
      <div class="settings-tabs" role="tablist" aria-label="Settings categories">
        <button type="button" role="tab" id="settings-tab-location" data-settings-tab="location" aria-controls="settings-panel-location" aria-selected="true">Location</button>
        <button type="button" role="tab" id="settings-tab-prayer" data-settings-tab="prayer" aria-controls="settings-panel-prayer" aria-selected="false" tabindex="-1">Prayer</button>
        <button type="button" role="tab" id="settings-tab-alerts" data-settings-tab="alerts" aria-controls="settings-panel-alerts" aria-selected="false" tabindex="-1">Alerts</button>
        <button type="button" role="tab" id="settings-tab-widgets" data-settings-tab="widgets" aria-controls="settings-panel-widgets" aria-selected="false" tabindex="-1">Widgets</button>
      </div>
      <div id="settings-panel-location" role="tabpanel" aria-labelledby="settings-tab-location" tabindex="0">
      <form id="location-form">
        <label class="setting-field"
          >City<select id="city">
            <option value="">Choose a city</option>
            <option value="sf">San Francisco</option>
            <option value="ny">New York</option>
            <option value="london">London</option>
            <option value="makkah">Makkah</option>
            <option value="custom">Custom coordinates</option>
          </select></label
        >
        <div class="custom-fields">
          <label class="setting-field"
            >Location name<input id="location-name" required maxlength="80"
          /></label>
          <div class="coordinate-grid">
            <label class="setting-field"
              >Latitude<input
                id="latitude"
                type="number"
                min="-90"
                max="90"
                step="any"
                required /></label
            ><label class="setting-field"
              >Longitude<input
                id="longitude"
                type="number"
                min="-180"
                max="180"
                step="any"
                required
            /></label>
          </div>
          <label class="setting-field"
            >Time zone<input id="timezone" required placeholder="America/Los_Angeles"
          /></label>
        </div>
        <button class="primary" type="submit">Save location</button
        ><button class="secondary locate" type="button">Use my location</button>
      </form>
      </div>
      <div id="settings-panel-prayer" role="tabpanel" aria-labelledby="settings-tab-prayer" tabindex="0" hidden>
      <label class="setting-field"
        >Calculation method<select id="method">
          <option value="NorthAmerica">ISNA / North America</option>
          <option value="MuslimWorldLeague">Muslim World League</option>
          <option value="UmmAlQura">Umm al-Qura</option>
          <option value="Egyptian">Egyptian General Authority</option>
          <option value="Karachi">University of Islamic Sciences, Karachi</option>
        </select></label
      ><label class="setting-field"
        >Asr calculation<select id="madhab">
          <option value="standard">Standard</option>
          <option value="hanafi">Hanafi</option>
        </select></label
      >
      <p class="settings-note feature-credit">Prayer calculations by <a href="https://github.com/batoulapps/adhan-js" target="_blank" rel="noopener">Batoul Apps · Adhan</a> (MIT).</p>
      </div>
      <div id="settings-panel-alerts" role="tabpanel" aria-labelledby="settings-tab-alerts" tabindex="0" hidden>
      <label class="setting-row"
        ><span>Prayer notifications</span><input id="alerts" type="checkbox" /></label
      ><label class="setting-row"
        ><span>Athan sound</span><input id="sound" type="checkbox" /></label
      ><button class="secondary" id="preview-audio">Listen to athan</button
      ><button class="secondary" id="exact-alarm" hidden>Allow precise reminders</button>
      <details class="feature-credit" id="audio-credit"><summary>Athan recording credit</summary></details>
      <div class="setting-field">Notify for</div>
      <div class="prayer-toggles"></div>
      <p class="settings-note" id="schedule-status"></p>
      </div>
      <div id="settings-panel-widgets" role="tabpanel" aria-labelledby="settings-tab-widgets" tabindex="0" hidden></div>
    </section>
  </main>
  <nav aria-label="Main navigation">
    <button data-screen="today" class="active">${icon('sun')}Today</button
    ><button data-screen="quran">${icon('book-open')}Quran</button
    ><button data-screen="settings">${icon('settings-2')}Settings</button>
  </nav>
</div>
`;
}
