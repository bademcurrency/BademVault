import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BademAccountIdComponent } from './nano-account-id.component';

describe('BademAccountIdComponent', () => {
  let component: BademAccountIdComponent;
  let fixture: ComponentFixture<BademAccountIdComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BademAccountIdComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BademAccountIdComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
