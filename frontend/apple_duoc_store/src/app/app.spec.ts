import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { PedidosService, Producto } from './pedidos.service';
import { fetchAuthSession, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn()
}));

describe('App', () => {
  let respuesta: Subject<Producto[]>;
  let obtenerPedidos: ReturnType<typeof vi.fn>;
  beforeEach(async () => {
    vi.resetAllMocks();
    respuesta = new Subject<Producto[]>();
    obtenerPedidos = vi.fn(() => respuesta.asObservable());
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [{ provide: PedidosService, useValue: { obtenerPedidos } }],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Lo mejor de Apple.');
  });

  it('evita consultas duplicadas y actualiza la vista al recibir productos', async () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.autenticado = true;
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector('.orders button') as HTMLButtonElement;
    boton.click();
    app.consultarProductos();
    await fixture.whenStable();
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    expect(boton.disabled).toBe(true);
    respuesta.next([{ id: 1, nombre: 'iPhone', categoria: 'Teléfono', precio: 1000, stock: 2 }]);
    respuesta.complete();
    await fixture.whenStable();
    expect(boton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.orders-list').textContent).toContain('iPhone');
    const tarjeta = fixture.nativeElement.querySelector('.order-card').textContent;
    expect(tarjeta).toContain('Teléfono');
    expect(tarjeta).toContain('CLP');
    expect(tarjeta).toContain('1,000');
    expect(tarjeta).toContain('Stock: 2');
    expect(tarjeta).not.toContain('Estado:');
    expect(fixture.nativeElement.querySelector('.spinner')).toBeNull();
  });

  it.each([
    [0, 'No pudimos conectarnos con el servidor. Intenta nuevamente.'],
    [401, 'Tu sesión expiró. Inicia sesión nuevamente.'],
    [403, 'No tienes autorización para consultar esta información.'],
    [500, 'No fue posible cargar los productos.']
  ])('muestra un mensaje humano para HTTP %s', async (status, mensaje) => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.autenticado = true;
    app.usuario = 'estudiante';
    fixture.detectChanges();
    app.consultarProductos();
    respuesta.error(new HttpErrorResponse({ status: Number(status) }));
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(mensaje);
    expect(app.cargandoProductos).toBe(false);
    if (status === 401) {
      expect(app.autenticado).toBe(false);
      expect(app.usuario).toBe('');
      expect(app.productos).toEqual([]);
    }
  });

  it('verifica sesión sin mostrar el token y limpia los datos al salir', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'estudiante', userId: '1' });
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: { accessToken: { toString: () => 'token-de-prueba', payload: {} } } });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.componentInstance.verSesion();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Token obtenido correctamente');
    expect(fixture.nativeElement.textContent).not.toContain('token-de-prueba');
    await fixture.componentInstance.logout();
    await fixture.whenStable();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.account')).toBeNull();
    expect(fixture.componentInstance.usuario).toBe('');
  });

  it('muestra fallos de inicio y cierre de sesión sin detalles técnicos', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    vi.mocked(signInWithRedirect).mockRejectedValue(new Error('detalle técnico'));
    await fixture.componentInstance.login();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No fue posible iniciar sesión. Intenta nuevamente.');
    vi.mocked(signOut).mockRejectedValue(new Error('detalle técnico'));
    await fixture.componentInstance.logout();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('No fue posible cerrar sesión. Intenta nuevamente.');
    expect(fixture.nativeElement.textContent).not.toContain('detalle técnico');
    expect(fixture.componentInstance.procesandoSesion).toBe(false);
  });
});

