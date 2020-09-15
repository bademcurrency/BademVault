import { Component, OnInit } from '@angular/core';
import BigNumber from 'bignumber.js';
import {AddressBookService} from '../../services/address-book.service';
import {BehaviorSubject} from 'rxjs';
import {WalletService} from '../../services/wallet.service';
import {NotificationService} from '../../services/notification.service';
import {ApiService} from '../../services/api.service';
import {UtilService} from '../../services/util.service';
import {WorkPoolService} from '../../services/work-pool.service';
import {AppSettingsService} from '../../services/app-settings.service';
import {ActivatedRoute} from '@angular/router';
import {PriceService} from '../../services/price.service';
import {BademBlockService} from '../../services/nano-block.service';
import { QrModalService } from '../../services/qr-modal.service';

const nacl = window['nacl'];

@Component({
  selector: 'app-send',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css']
})
export class SendComponent implements OnInit {
  badem = 100;

  activePanel = 'send';

  accounts = this.walletService.wallet.accounts;
  addressBookResults$ = new BehaviorSubject([]);
  showAddressBook = false;
  addressBookMatch = '';

  amounts = [
    { name: 'BADEM', shortName: 'BADEM', value: 'mbadem' },
    { name: 'kbadem', shortName: 'kbadem', value: 'kbadem' },
    { name: 'bdm', shortName: 'bdm', value: 'bdm' },
  ];
  selectedAmount = this.amounts[0];

  amount = null;
  amountRaw = new BigNumber(0);
  amountFiat: number|null = null;
  rawAmount: BigNumber = new BigNumber(0);
  fromAccount: any = {};
  fromAccountID: any = '';
  fromAddressBook = '';
  toAccount: any = false;
  toAccountID = '';
  toAddressBook = '';
  toAccountStatus = null;
  amountStatus = null;
  confirmingTransaction = false;
  selAccountInit = false;

  constructor(
    private router: ActivatedRoute,
    private walletService: WalletService,
    private addressBookService: AddressBookService,
    private notificationService: NotificationService,
    private nodeApi: ApiService,
    private nanoBlock: BademBlockService,
    public price: PriceService,
    private workPool: WorkPoolService,
    public settings: AppSettingsService,
    private util: UtilService,
    private qrModalService: QrModalService, ) { }

  async ngOnInit() {
    const params = this.router.snapshot.queryParams;

    if (params && params.amount) {
      this.amount = params.amount;
    }
    if (params && params.to) {
      this.toAccountID = params.to;
      this.validateDestination();
    }

    this.addressBookService.loadAddressBook();

    // Set default From account
    this.fromAccountID = this.accounts.length ? this.accounts[0].id : '';

    // Update selected account if changed in the sidebar
    this.walletService.wallet.selectedAccount$.subscribe(async acc => {
      if (this.selAccountInit) {
        if (acc) {
          this.fromAccountID = acc.id;
        } else {
          this.findFirstAccount();
        }
      }
      this.selAccountInit = true;
    });

    // Set the account selected in the sidebar as default
    if (this.walletService.wallet.selectedAccount !== null) {
      this.fromAccountID = this.walletService.wallet.selectedAccount.id;
    } else {
      // If "total balance" is selected in the sidebar, use the first account in the wallet that has a balance
      this.findFirstAccount();
    }
  }

  async findFirstAccount() {
    // Load balances before we try to find the right account
    if (this.walletService.wallet.balance.isZero()) {
      await this.walletService.reloadBalances();
    }

    // Look for the first account that has a balance
    const accountIDWithBalance = this.accounts.reduce((previous, current) => {
      if (previous) return previous;
      if (current.balance.gt(0)) return current.id;
      return null;
    }, null);

    if (accountIDWithBalance) {
      this.fromAccountID = accountIDWithBalance;
    }
  }

  // An update to the Badem amount, sync the fiat value
  syncFiatPrice() {
    if (!this.validateAmount()) return;
    const rawAmount = this.getAmountBaseValue(this.amount || 0).plus(this.amountRaw);
    if (rawAmount.lte(0)) {
      this.amountFiat = 0;
      return;
    }

    // This is getting hacky, but if their currency is bitcoin, use 6 decimals, if it is not, use 2
    const precision = this.settings.settings.displayCurrency === 'BTC' ? 1000000 : 100;

    // Determine fiat value of the amount
    const fiatAmount = this.util.badem.rawToMbadem(rawAmount).times(this.price.price.lastPrice)
      .times(precision).floor().div(precision).toNumber();

    this.amountFiat = fiatAmount;
  }

  // An update to the fiat amount, sync the nano value based on currently selected denomination
  syncBademPrice() {
    if (!this.amountFiat) {
      this.amount = '';
      return;
    }
    if (!this.util.string.isNumeric(this.amountFiat)) return;
    const rawAmount = this.util.badem.mbademToRaw(new BigNumber(this.amountFiat).div(this.price.price.lastPrice));
    const bademVal = this.util.badem.rawToBadem(rawAmount).floor();
    const bademAmount = this.getAmountValueFromBase(this.util.badem.bademToRaw(bademVal));

    this.amount = bademAmount.toNumber();
  }

  searchAddressBook() {
    this.showAddressBook = true;
    const search = this.toAccountID || '';
    const addressBook = this.addressBookService.addressBook;

    const matches = addressBook
      .filter(a => a.name.toLowerCase().indexOf(search.toLowerCase()) !== -1)
      .slice(0, 5);

    this.addressBookResults$.next(matches);
  }

  selectBookEntry(account) {
    this.showAddressBook = false;
    this.toAccountID = account;
    this.searchAddressBook();
    this.validateDestination();
  }

  async validateDestination() {
    // The timeout is used to solve a bug where the results get hidden too fast and the click is never registered
    setTimeout(() => this.showAddressBook = false, 400);

    // Remove spaces from the account id
    this.toAccountID = this.toAccountID.replace(/ /g, '');

    this.addressBookMatch = this.addressBookService.getAccountName(this.toAccountID);

    // const accountInfo = await this.walletService.walletApi.accountInfo(this.toAccountID);
    this.toAccountStatus = null;
    if (this.util.account.isValidAccount(this.toAccountID)) {
      const accountInfo = await this.nodeApi.accountInfo(this.toAccountID);
      if (accountInfo.error) {
        if (accountInfo.error === 'Account not found') {
          this.toAccountStatus = 1;
        }
      }
      if (accountInfo && accountInfo.frontier) {
        this.toAccountStatus = 2;
      }
    } else {
      this.toAccountStatus = 0;
    }
  }

  validateAmount() {
    if (this.util.account.isValidBademAmount(this.amount)) {
      this.amountStatus = 1;
      return true;
    } else {
      this.amountStatus = 0;
      return false;
    }
  }

  async sendTransaction() {
    const isValid = this.util.account.isValidAccount(this.toAccountID);
    if (!isValid) {
      return this.notificationService.sendWarning(`To account address is not valid`);
    }
    if (!this.fromAccountID || !this.toAccountID) {
      return this.notificationService.sendWarning(`From and to account are required`);
    }
    if (!this.validateAmount()) {
      return this.notificationService.sendWarning(`Invalid BADEM Amount`);
    }

    const from = await this.nodeApi.accountInfo(this.fromAccountID);
    const to = await this.nodeApi.accountInfo(this.toAccountID);
    if (!from) {
      return this.notificationService.sendError(`From account not found`);
    }

    from.balanceBN = new BigNumber(from.balance || 0);
    to.balanceBN = new BigNumber(to.balance || 0);

    this.fromAccount = from;
    this.toAccount = to;

    const rawAmount = this.getAmountBaseValue(this.amount || 0);
    this.rawAmount = rawAmount.plus(this.amountRaw);

    const bademAmount = this.rawAmount.div(this.badem);

    if (this.amount < 0 || rawAmount.lessThan(0)) {
      return this.notificationService.sendWarning(`Amount is invalid`);
    }
    if (from.balanceBN.minus(rawAmount).lessThan(0)) {
      return this.notificationService.sendError(`From account does not have enough BADEM`);
    }

    // Determine a proper raw amount to show in the UI, if a decimal was entered
    this.amountRaw = this.rawAmount.mod(this.badem);

    // Determine fiat value of the amount
    this.amountFiat = this.util.badem.rawToMbadem(rawAmount).times(this.price.price.lastPrice).toNumber();

    // Start precopmuting the work...
    this.fromAddressBook = this.addressBookService.getAccountName(this.fromAccountID);
    this.toAddressBook = this.addressBookService.getAccountName(this.toAccountID);
    this.workPool.addWorkToCache(this.fromAccount.frontier);

    this.activePanel = 'confirm';
  }

  async confirmTransaction() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.fromAccountID);
    if (!walletAccount) {
      throw new Error(`Unable to find sending account in wallet`);
    }
    if (this.walletService.walletIsLocked()) {
      return this.notificationService.sendWarning(`Wallet must be unlocked`);
    }

    this.confirmingTransaction = true;

    try {
      const newHash = await this.bademBlock.generateSend(walletAccount, this.toAccountID,
        this.rawAmount, this.walletService.isLedgerWallet());
      if (newHash) {
        this.notificationService.sendSuccess(`Successfully sent ${this.amount} ${this.selectedAmount.shortName}!`);
        this.activePanel = 'send';
        this.amount = null;
        this.amountFiat = null;
        this.resetRaw();
        this.toAccountID = '';
        this.toAccountStatus = null;
        this.fromAddressBook = '';
        this.toAddressBook = '';
        this.addressBookMatch = '';
      } else {
        if (!this.walletService.isLedgerWallet()) {
          this.notificationService.sendError(`There was an error sending your transaction, please try again.`);
        }
      }
    } catch (err) {
      this.notificationService.sendError(`There was an error sending your transaction: ${err.message}`);
    }


    this.confirmingTransaction = false;

    await this.walletService.reloadBalances();
  }

  setMaxAmount() {
    const walletAccount = this.walletService.wallet.accounts.find(a => a.id === this.fromAccountID);
    if (!walletAccount) {
      return;
    }

    this.amountRaw = walletAccount.balanceRaw;

    const bademVal = this.util.badem.rawToBadem(walletAccount.balance).floor();
    const maxAmount = this.getAmountValueFromBase(this.util.badem.bademToRaw(bademVal));
    this.amount = maxAmount.toNumber();
    this.syncFiatPrice();
  }

  resetRaw() {
    this.amountRaw = new BigNumber(0);
  }

  getAmountBaseValue(value) {

    switch (this.selectedAmount.value) {
      default:
      case 'bdm': return this.util.badem.bademToRaw(value);
      case 'kbadem': return this.util.badem.kbademToRaw(value);
      case 'mbadem': return this.util.badem.mbademToRaw(value);
    }
  }

  getAmountValueFromBase(value) {
    switch (this.selectedAmount.value) {
      default:
      case 'bdm': return this.util.badem.rawToBadem(value);
      case 'kbadem': return this.util.badem.rawToKbadem(value);
      case 'mbadem': return this.util.badem.rawToMbadem(value);
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.toAccountID = data.content;
          this.validateDestination();
          break;
      }
    }, () => {}
    );
  }

}
