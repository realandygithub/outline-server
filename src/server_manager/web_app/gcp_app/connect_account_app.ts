/*
  Copyright 2018 The Outline Authors

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
import '@polymer/polymer/polymer-legacy.js';
import '@polymer/iron-pages/iron-pages.js';
import '../ui_components/outline-step-view.js';

import {css, customElement, html, LitElement, property} from 'lit-element';

import {makePublicEvent} from '../../infrastructure/events';
import {LocalStorageRepository} from '../../infrastructure/repository';
import * as account from '../../model/account';
import {AccountModelFactory} from '../../model/account';
import * as cloud_provider from '../../model/cloud_provider';
import {COMMON_STYLES} from '../ui_components/cloud-install-styles';
import {OutlineNotificationManager} from '../ui_components/outline-notification-manager';
import {Credentials} from "google-auth-library/build/src/auth/credentials";
import {GcpAccount} from "../../model/gcp_account";
import {GcpRestApiProviderService, OAuthCredential} from "./services/rest_api_client";

@customElement('gcp-connect-account-app')
export class GcpConnectAccountApp extends LitElement implements AccountModelFactory<GcpAccount> {
  @property({type: Function}) localize: Function;
  @property({type: Object}) accountRepository: LocalStorageRepository<account.Data, string> = null;
  @property({type: Object}) notificationManager: OutlineNotificationManager = null;

  static get styles() {
    return [
      COMMON_STYLES, css`
      :host {
      }
      .container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
        align-items: center;
        padding: 132px 0;
        font-size: 14px;
      }
      #connectAccount img {
        width: 48px;
        height: 48px;
        margin-bottom: 12px;
      }
      .card {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        justify-content: space-between;
        margin: 24px 0;
        padding: 24px;
        background: var(--background-contrast-color);
        box-shadow: 0 0 2px 0 rgba(0, 0, 0, 0.14), 0 2px 2px 0 rgba(0, 0, 0, 0.12), 0 1px 3px 0 rgba(0, 0, 0, 0.2);
        border-radius: 2px;
      }
      @media (min-width: 1025px) {
        paper-card {
          /* Set min with for the paper-card to grow responsively. */
          min-width: 600px;
        }
      }
      .card p {
        color: var(--light-gray);
        width: 100%;
        text-align: center;
      }
      .card paper-button {
        color: var(--light-gray);
        width: 100%;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 2px;
      }
      .card paper-button[disabled] {
        color: var(--medium-gray);
        background: transparent;
      }
      /* Mirror images */
      :host(:dir(rtl)) .mirror {
        transform: scaleX(-1);
      }`
    ];
    // TODO: RTL
  }

  render() {
    return html`
    <outline-step-view id="connectAccount">
      <span slot="step-title">${this.localize('oauth-connect-title')}</span>
      <span slot="step-description">${this.localize('oauth-connect-description')}</span>
      <paper-card class="card">
        <div class="container">
          <img src="images/digital_ocean_logo.svg">
          <p>${this.localize('oauth-connect-tag')}</p>
        </div>
        <paper-button @tap="${this.onCancel}">${this.localize('cancel')}</paper-button>
      </paper-card>
    </outline-step-view>`;
  }

  async start(): Promise<GcpAccount> {
    try {
      const credential = await runGcpOauth();
      const data = await this.createAccountData(credential);
      return this.createAccountModel(data);
    } catch (error) {
      console.error(`GCP authentication failed: ${error}`);
      this.notificationManager.showError(this.localize('error-do-auth'));
      throw error;
    }
  }

  async createAccountModel(data: account.Data): Promise<GcpAccount> {
    const refreshToken = data.credential as string;
    const oauthCredential = new OAuthCredential(refreshToken);
    await oauthCredential.refresh();
    const providerService = new GcpRestApiProviderService('cloud-spanner-test-179701',  oauthCredential);
    return new GcpAccount(providerService, data, this.accountRepository);
  }

  private async createAccountData(credentials: Credentials) {
    return {
      id: 'blah',
      displayName: 'blah',
      provider: cloud_provider.Id.GCP,
      credential: credentials.refresh_token,
    };
  }

  private onCancel() {
    const event = makePublicEvent('GcpConnectAccount#Cancelled');
    this.dispatchEvent(event);
  }
}