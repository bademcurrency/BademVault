import { TestBed, inject } from '@angular/core/testing';

import { BademBlockService } from './nano-block.service';

describe('BademBlockService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [BademBlockService]
    });
  });

  it('should be created', inject([BademBlockService], (service: BademBlockService) => {
    expect(service).toBeTruthy();
  }));
});
