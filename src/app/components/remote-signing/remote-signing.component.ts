import { Component, OnInit } from '@angular/core';
import {UtilService} from '../../services/util.service';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { RemoteSignService } from '../../services/remote-sign.service';
import { QrModalService } from '../../services/qr-modal.service';

@Component({
  selector: 'app-send',
  templateUrl: './remote-signing.component.html',
  styleUrls: ['./remote-signing.component.css']
})
export class RemoteSigningComponent implements OnInit {
  toAccountID = '';
  toAccountStatus: number = null;
  unsignedBlock = '';
  signedBlock = '';
  unsignedStatus: number = null;
  signedStatus: number = null;

  constructor(
    private util: UtilService,
    private router: Router,
    private notifcationService: NotificationService,
    private remoteSignService: RemoteSignService,
    private qrModalService: QrModalService,
  ) { }

  async ngOnInit() {

  }

  validateDestination() {
    if (this.util.account.isValidAccount(this.toAccountID)) {
      this.toAccountStatus = 1;
      return true;
    } else {
      this.toAccountStatus = 0;
      return false;
    }
  }

  validateUnsigned(string) {
    let url = null;
    if (string.startsWith('bademsign:')) {
      url = new URL(string);
    }
    if (url && this.remoteSignService.checkSignBlock(url.pathname)) {
      this.unsignedStatus = 1;
    } else {
      this.unsignedStatus = 0;
    }
  }

  validateSigned(string) {
    let url = null;
    if (string.startsWith('bademprocess:')) {
      url = new URL(string);
    }
    if (url && this.remoteSignService.checkSignBlock(url.pathname) && this.remoteSignService.checkProcessBlock(url.pathname)) {
      this.signedStatus = 1;
    } else {
      this.signedStatus = 0;
    }
  }

  start() {
    if (this.validateDestination()) {
      this.router.navigate(['account', this.toAccountID], { queryParams: {sign: 1}});
    } else {
      this.notifcationService.sendWarning('Not a valid account format!');
    }
  }

  navigateBlock(block) {
    let badScheme = false;

    if (block.startsWith('bademsign:') || block.startsWith('bademprocess:')) {
      const url = new URL(block);
      if (url.protocol === 'bademsign:') {
        this.remoteSignService.navigateSignBlock(url);
      } else if (url.protocol === 'bademprocess:') {
        this.remoteSignService.navigateProcessBlock(url);
      } else {
        badScheme = true;
      }
    } else {
      badScheme = true;
    }
    if (badScheme) {
      this.notifcationService.sendWarning('Not a recognized block format!', { length: 5000 });
    }
  }

  // open qr reader modal
  openQR(reference, type) {
    const qrResult = this.qrModalService.openQR(reference, type);
    qrResult.then((data) => {
      switch (data.reference) {
        case 'account1':
          this.toAccountID = data.content;
          break;
      }
    }, () => {}
    );
  }
}
