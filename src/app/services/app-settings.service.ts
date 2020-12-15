import { Injectable } from '@angular/core';
import * as url from 'url';

export type WalletStore = 'localStorage'|'none';
export type PoWSource = 'server'|'clientCPU'|'clientWebGL'|'best';

interface AppSettings {
  displayDenomination: string;
  // displayPrefix: string | null;
  walletStore: string;
  displayCurrency: string;
  defaultRepresentative: string | null;
  lockOnClose: number;
  lockInactivityMinutes: number;
  powSource: PoWSource;
  pendingOption: string;
  serverName: string;
  serverAPI: string | null;
  serverWS: string | null;
  serverAuth: string | null;
  minimumReceive: string | null;
  walletVersion: number | null;
}

@Injectable()
export class AppSettingsService {
  storeKey = `nanovault-appsettings`;

  settings: AppSettings = {
    displayDenomination: 'mbadem',
    // displayPrefix: 'badem',
    walletStore: 'localStorage',
    displayCurrency: '',
    defaultRepresentative: null,
    lockOnClose: 1,
    lockInactivityMinutes: 30,
    powSource: 'best',
    pendingOption: 'amount',
    serverName: 'random',
    serverAPI: null,
    serverWS: null,
    serverAuth: null,
    minimumReceive: null,
    walletVersion: 1
  };

  serverOptions = [
    {
      name: 'Random',
      value: 'random',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    },
    {
      name: 'Badem API 1',
      value: 'badem',
      api: 'https://badem-api.badem.io/proxy',
      ws: 'wss://badem-ws.badem.io',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Badem API 2',
      value: 'badem',
      api: 'https://badem-api-2.badem.io/proxy',
      ws: 'wss://badem-ws-2.badem.io',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Badem API 3',
      value: 'badem',
      api: 'https://badem-api-3.badem.io/proxy',
      ws: 'wss://badem-ws-3.badem.io',
      auth: null,
      shouldRandom: true,
    },
    {
      name: 'Custom',
      value: 'custom',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    },
    {
      name: 'Offline Mode',
      value: 'offline',
      api: null,
      ws: null,
      auth: null,
      shouldRandom: false,
    }
  ];

  constructor() { }

  loadAppSettings() {
    let settings: AppSettings = this.settings;
    const settingsStore = localStorage.getItem(this.storeKey);
    if (settingsStore) {
      settings = JSON.parse(settingsStore);
    }
    this.settings = Object.assign(this.settings, settings);

    this.loadServerSettings();

    return this.settings;
  }

  loadServerSettings() {
    const matchingServerOption = this.serverOptions.find(d => d.value === this.settings.serverName);

    if (this.settings.serverName === 'random' || !matchingServerOption) {
      const availableServers = this.serverOptions.filter(server => server.shouldRandom);
      const randomServerOption = availableServers[Math.floor(Math.random() * availableServers.length)];
      console.log('SETTINGS: Random', randomServerOption);

      this.settings.serverAPI = randomServerOption.api;
      this.settings.serverWS = randomServerOption.ws;
    } else if (this.settings.serverName === 'custom') {
      console.log('SETTINGS: Custom');
    } else if (this.settings.serverName === 'offline') {
      console.log('SETTINGS: Offline Mode');
      this.settings.serverName = matchingServerOption.value;
      this.settings.serverAPI = matchingServerOption.api;
      this.settings.serverWS = matchingServerOption.ws;
    } else {
      console.log('SETTINGS: Found', matchingServerOption);
      this.settings.serverName = matchingServerOption.value;
      this.settings.serverAPI = matchingServerOption.api;
      this.settings.serverWS = matchingServerOption.ws;
    }
  }

  saveAppSettings() {
    localStorage.setItem(this.storeKey, JSON.stringify(this.settings));
  }

  getAppSetting(key) {
    return this.settings[key] || null;
  }

  setAppSetting(key, value) {
    this.settings[key] = value;
    this.saveAppSettings();
  }

  setAppSettings(settingsObject) {
    for (const key in settingsObject) {
      if (!settingsObject.hasOwnProperty(key)) continue;
      this.settings[key] = settingsObject[key];
    }

    this.saveAppSettings();
  }

  clearAppSettings() {
    localStorage.removeItem(this.storeKey);
    this.settings = {
      displayDenomination: 'mbadem',
      // displayPrefix: 'badem',
      walletStore: 'localStorage',
      displayCurrency: '',
      defaultRepresentative: null,
      lockOnClose: 1,
      lockInactivityMinutes: 30,
      powSource: 'best',
      pendingOption: 'amount',
      serverName: 'random',
      serverAPI: null,
      serverWS: null,
      serverAuth: null,
      minimumReceive: null,
      walletVersion: 1,
    };
  }

  // Get the base URL part of the serverAPI, e.g. https://nanovault.io from https://nanovault.io/api/node-api.
  getServerApiBaseUrl(): string {
    const u = url.parse(this.settings.serverAPI);
    u.pathname = '/';
    return url.format(u);
  }
}
