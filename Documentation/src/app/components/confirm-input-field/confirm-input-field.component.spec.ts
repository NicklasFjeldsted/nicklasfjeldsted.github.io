import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmInputFieldComponent } from './confirm-input-field.component';

describe('ConfirmInputFieldComponent', () => {
  let component: ConfirmInputFieldComponent;
  let fixture: ComponentFixture<ConfirmInputFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ConfirmInputFieldComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(ConfirmInputFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
