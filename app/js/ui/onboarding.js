/** First-run wizard. */

import { t, number, dateMedium, setLanguage as setI18nLanguage } from '../i18n.js';
import { addYears, todayISO } from '../core/dates.js';
import { Qada, DEFAULT_PROFILE } from '../core/engine.js';
import { esc } from './dom.js';
import { icon } from './icons.js';
import { searchCities, guessTimezone } from '../../data/cities.js';

const STEPS = 8;

function draft(app) {
  if (!app.onb || !app.onb.draft) {
    const requestedStep = app.onb?.step ?? 0;
    app.onb = {
      step: requestedStep,
      draft: {
        language: app.lang || 'en',
        gender: 'male',
        pubertyDate: null,
        pubertySource: 'estimate',
        revertDate: null,
        regularSince: null,
        location: { ...DEFAULT_PROFILE.location },
        quotaPrayers: 5,
        cityQuery: '',
      },
    };
  }
  if (!app.onb.draft.pubertyDate) {
    app.onb.draft.pubertyDate = addYears(
      todayISO(app.onb.draft.location.tz || 'Africa/Tunis'),
      app.onb.draft.gender === 'female' ? -12 : -14,
    );
  }
  return app.onb;
}

function dots(step) {
  return Array.from(
    { length: STEPS },
    (_, i) => `<span class="onb__dot" data-active="${i <= step ? 1 : 0}"></span>`,
  ).join('');
}

function footer(app, { next = true, nextLabel = null, finish = false } = {}) {
  const state = app.onb;
  return `
    <div class="onb__foot">
      ${
        state.step > 0
          ? `<button class="btn" data-action="onb-back">${esc(t('onboarding.back'))}</button>`
          : ''
      }
      ${
        next
          ? `<button class="btn btn--primary" data-action="${finish ? 'onb-finish' : 'onb-next'}">${esc(
              nextLabel || (finish ? t('onboarding.finish') : t('onboarding.next')),
            )}</button>`
          : ''
      }
    </div>`;
}

function stepWelcome() {
  return `
    <h1 class="onb__title">${esc(t('onboarding.welcomeTitle'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.welcomeBody'))}</p>
    <div class="onb-point">${icon('shield')}<span>${esc(t('onboarding.welcomePoint1'))}</span></div>
    <div class="onb-point">${icon('globe')}<span>${esc(t('onboarding.welcomePoint2'))}</span></div>
    <div class="onb-point">${icon('download')}<span>${esc(t('onboarding.welcomePoint3'))}</span></div>
  `;
}

function stepLanguage(state) {
  const options = [
    ['en', 'English', 'English interface'],
    ['fr', 'Français', 'Interface en français'],
    ['ar', 'العربية', 'واجهة عربية'],
  ];
  return `
    <h1 class="onb__title">${esc(t('onboarding.language'))}</h1>
    <div class="card">
      ${options
        .map(
          ([code, label, sub]) => `
        <button class="list__row list__row--nav" data-action="onb-lang" data-value="${code}">
          <span class="list__label">${esc(label)}<span class="field__hint" style="display:block">${esc(
            sub,
          )}</span></span>
          ${state.draft.language === code ? icon('check') : ''}
        </button>`,
        )
        .join('')}
    </div>
  `;
}

function stepGender(state) {
  return `
    <h1 class="onb__title">${esc(t('onboarding.aboutYou'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.genderHint'))}</p>
    <div class="segmented">
      <button class="segmented__btn" data-action="onb-gender" data-value="male"
        aria-pressed="${state.draft.gender === 'male'}">${esc(t('onboarding.male'))}</button>
      <button class="segmented__btn" data-action="onb-gender" data-value="female"
        aria-pressed="${state.draft.gender === 'female'}">${esc(t('onboarding.female'))}</button>
    </div>
  `;
}

function stepPuberty(state) {
  const today = todayISO(state.draft.location.tz);
  return `
    <h1 class="onb__title">${esc(t('onboarding.puberty'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.pubertyHint'))}</p>
    <div class="field">
      <label class="field__label" for="onb-puberty">${esc(t('onboarding.pubertyKnown'))}</label>
      <input id="onb-puberty" class="input" type="date" value="${esc(state.draft.pubertyDate)}"
        max="${esc(today)}" data-change="onb-puberty-date">
    </div>
    <div class="segmented">
      <button class="segmented__btn" data-action="onb-puberty-mode" data-value="known"
        aria-pressed="${state.draft.pubertySource === 'known'}">${esc(t('onboarding.pubertyKnown'))}</button>
      <button class="segmented__btn" data-action="onb-puberty-mode" data-value="estimate"
        aria-pressed="${state.draft.pubertySource === 'estimate'}">${esc(t('onboarding.pubertyEstimate'))}</button>
    </div>
    <p class="field__hint">${esc(t('onboarding.pubertyEstimateHint'))}</p>
    <div class="notice">${icon('info')}<span>${esc(t('onboarding.disclaimer'))}</span></div>
  `;
}

function stepHistory(state) {
  const draftValue = state.draft;
  return `
    <h1 class="onb__title">${esc(t('onboarding.regular'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.regularHint'))}</p>
    <div class="field">
      <label class="field__label" for="onb-regular">${esc(t('onboarding.regularSince'))}</label>
      <input id="onb-regular" class="input" type="date" value="${esc(draftValue.regularSince || '')}"
        data-change="onb-regular-date">
    </div>
    <hr class="hr">
    <div class="field">
      <label class="field__label" for="onb-revert">${esc(t('onboarding.revert'))}</label>
      <input id="onb-revert" class="input" type="date" value="${esc(draftValue.revertDate || '')}"
        data-change="onb-revert-date">
      <p class="field__hint">${esc(t('onboarding.revertHint'))}</p>
    </div>
  `;
}

function stepLocation(app, state) {
  const results = searchCities(state.draft.cityQuery || '', 6);
  return `
    <h1 class="onb__title">${esc(t('onboarding.location'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.locationHint'))}</p>
    <div class="field">
      <input class="input" type="search" placeholder="${esc(t('onboarding.searchCity'))}"
        value="${esc(state.draft.cityQuery || '')}" data-live="onb-city-search" autocomplete="off">
    </div>
    <button class="btn btn--ghost btn--block" data-action="onb-gps">${icon('pin')} ${esc(
      t('onboarding.useGps'),
    )}</button>
    <div class="city-list">
      ${results
        .map(
          (city) => `
        <button class="city-item" data-action="onb-city" data-name="${esc(city.name)}"
          data-country="${esc(city.country)}" data-lat="${city.lat}" data-lon="${city.lon}"
          data-tz="${esc(city.tz)}">
          ${icon('pin')}
          <span>
            <span class="city-item__name">${esc(city.name)}</span><br>
            <span class="city-item__country">${esc(city.country)}</span>
          </span>
        </button>`,
        )
        .join('')}
    </div>
    <div class="notice">${icon('clock')}<span>${esc(state.draft.location.name)} · ${esc(
      `${state.draft.location.lat.toFixed(3)}, ${state.draft.location.lon.toFixed(3)}`,
    )}</span></div>
  `;
}

function stepPace(app, state) {
  const options = [1, 2, 3, 4, 5, 6, 8, 10];
  const current = Math.round(state.draft.quotaPrayers / 5);
  return `
    <h1 class="onb__title">${esc(t('onboarding.pace'))}</h1>
    <p class="onb__lead">${esc(t('onboarding.paceHint'))}</p>
    <div class="pace-grid">
      ${options
        .map(
          (days) => `
        <button class="pace-btn" data-action="onb-pace" data-days="${days}" aria-pressed="${
          current === days
        }">
          <div class="pace-btn__n">${days}</div>
          <div class="pace-btn__l">${esc(days === 1 ? t('onboarding.paceDay', { n: days }) : t('onboarding.paceDays', { n: days }))}</div>
        </button>`,
        )
        .join('')}
    </div>
    <div class="notice">${icon('clock')}<span>${esc(
      t('onboarding.paceSummary', {
        qada: number(current * 5),
        current: number(5),
      }),
    )}</span></div>
  `;
}

function stepSummary(app, state) {
  const draftValue = state.draft;
  const tz = draftValue.location.tz;
  const today = todayISO(tz);
  const preview = Qada.create(
    {
      gender: draftValue.gender,
      pubertyDate: draftValue.pubertyDate,
      revertDate: draftValue.revertDate,
      quotaPrayers: draftValue.quotaPrayers,
      location: draftValue.location,
      language: draftValue.language,
    },
    today,
  );
  if (draftValue.regularSince) preview.applyRegularSince(draftValue.regularSince);
  const projection = preview.projection();

  return `
    <h1 class="onb__title">${esc(t('onboarding.summary'))}</h1>
    <div class="stat-grid">
      <div class="stat">
        <div class="stat__label">${esc(t('onboarding.summaryOwed'))}</div>
        <div class="stat__value">${esc(number(projection.remaining))}</div>
      </div>
      <div class="stat">
        <div class="stat__label">${esc(t('onboarding.summaryPace'))}</div>
        <div class="stat__value">${esc(number(projection.quota))}</div>
      </div>
    </div>
    <div class="card card--pad card--gold">
      <div class="stat__label">${esc(t('onboarding.summaryFinish'))}</div>
      <div class="stat__value" style="font-size:1.05rem">${esc(
        projection.finishDate ? dateMedium(projection.finishDate) : t('onboarding.summaryUnknown'),
      )}</div>
      <div class="stat__hint">${esc(
        `${t('today.since', { date: dateMedium(draftValue.pubertyDate) })} · ${draftValue.location.name}`,
      )}</div>
    </div>
    <div class="notice">${icon('info')}<span>${esc(t('onboarding.disclaimer'))}</span></div>
  `;
}

export function render(app) {
  const state = draft(app);
  const step = state.step;
  const bodies = [
    () => stepWelcome(),
    () => stepLanguage(state),
    () => stepGender(state),
    () => stepPuberty(state),
    () => stepHistory(state),
    () => stepLocation(app, state),
    () => stepPace(app, state),
    () => stepSummary(app, state),
  ];
  const body = bodies[Math.min(step, bodies.length - 1)]();

  return `
    <div class="onb" dir="${state.draft.language === 'ar' ? 'rtl' : 'ltr'}">
      <div class="onb__dots">${dots(step)}</div>
      <div class="onb__body">${body}</div>
      ${footer(app, {
        finish: step === STEPS - 1,
        nextLabel: step === 0 ? t('onboarding.start') : null,
      })}
    </div>
  `;
}

/* ------------------------------------------------------------------ */
/* Handlers                                                            */
/* ------------------------------------------------------------------ */

function go(app, step) {
  app.onb.step = Math.max(0, Math.min(STEPS - 1, step));
  window.scrollTo({ top: 0 });
  app.render();
}

export const handlers = {
  'onb-next': (app) => go(app, app.onb.step + 1),
  'onb-back': (app) => go(app, app.onb.step - 1),
  'onb-lang': (app, el) => {
    const code = el.dataset.value;
    app.onb.draft.language = code;
    app.lang = code;
    setI18nLanguage(code);
    app.applyVisualPreferences();
    app.render();
  },
  'onb-gender': (app, el) => {
    const gender = el.dataset.value;
    app.onb.draft.gender = gender;
    if (app.onb.draft.pubertySource === 'estimate') {
      const tz = app.onb.draft.location.tz;
      app.onb.draft.pubertyDate = addYears(todayISO(tz), gender === 'female' ? -12 : -14);
    }
    app.render();
  },
  'onb-puberty-mode': (app, el) => {
    const mode = el.dataset.value;
    app.onb.draft.pubertySource = mode;
    if (mode === 'estimate') {
      const tz = app.onb.draft.location.tz;
      app.onb.draft.pubertyDate = addYears(
        todayISO(tz),
        app.onb.draft.gender === 'female' ? -12 : -14,
      );
    }
    app.render();
  },
  'onb-pace': (app, el) => {
    app.onb.draft.quotaPrayers = Number(el.dataset.days) * 5;
    app.render();
  },
  'onb-city': (app, el) => {
    app.onb.draft.location = {
      name: el.dataset.name,
      country: el.dataset.country,
      lat: Number(el.dataset.lat),
      lon: Number(el.dataset.lon),
      tz: el.dataset.tz,
    };
    app.onb.draft.cityQuery = '';
    app.render();
  },
  'onb-gps': (app) => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        app.onb.draft.location = {
          name: 'My location',
          country: '',
          lat: Number(position.coords.latitude.toFixed(4)),
          lon: Number(position.coords.longitude.toFixed(4)),
          tz: guessTimezone(),
        };
        app.render();
      },
      () => app.showToast(t('error.generic')),
      { timeout: 10000 },
    );
  },
  'onb-finish': (app) => {
    const d = app.onb.draft;
    if (!d.pubertyDate) {
      app.showToast(t('error.date'));
      return;
    }
    const tz = d.location.tz || 'UTC';
    const today = todayISO(tz);
    const model = Qada.create(
      {
        gender: d.gender,
        pubertyDate: d.pubertyDate,
        pubertySource: d.pubertySource,
        revertDate: d.revertDate,
        regularSince: d.regularSince,
        location: d.location,
        quotaPrayers: d.quotaPrayers,
        language: d.language,
        theme: 'dark',
      },
      today,
    );
    if (d.regularSince) model.applyRegularSince(d.regularSince);

    app.model = model;
    app.lang = d.language;
    app.store.writeMeta({ lang: d.language });
    app.store.save(model, { immediate: true });
    app.onb = null;
    setI18nLanguage(d.language);
    app.applyVisualPreferences();
    app.refreshClock();
    app.cal.year = Number(app.today.slice(0, 4));
    location.hash = '#/today';
    app.render();
  },
};

export const changes = {
  'onb-puberty-date': (app, el) => {
    if (el.value) app.onb.draft.pubertyDate = el.value;
  },
  'onb-regular-date': (app, el) => {
    app.onb.draft.regularSince = el.value || null;
  },
  'onb-revert-date': (app, el) => {
    app.onb.draft.revertDate = el.value || null;
  },
};

export const live = {
  'onb-city-search': (app, el) => {
    app.onb.draft.cityQuery = el.value;
    app.render();
    const input = document.querySelector('[data-live="onb-city-search"]');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  },
};
