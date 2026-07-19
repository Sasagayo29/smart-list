import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ListaItens } from './lista-itens';

describe('ListaItens', () => {
  let component: ListaItens;
  let fixture: ComponentFixture<ListaItens>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaItens]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ListaItens);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
