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

  function simularSesionValida() {
    vi.mocked(getCurrentUser).mockResolvedValue({ username: 'estudiante', userId: '1' });
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: {
      accessToken: { toString: () => 'token-de-prueba', payload: {} }
    } });
  }

  async function iniciarComponente() {
    const fixture = TestBed.createComponent(App);
    // Espía sin reemplazar la implementación: esperamos la promesa iniciada por afterNextRender.
    const verSesion = vi.spyOn(fixture.componentInstance, 'verSesion');
    fixture.detectChanges();
    expect(verSesion).toHaveBeenCalledExactlyOnceWith(true);
    await verSesion.mock.results[0].value;
    await fixture.whenStable();
    return fixture;
  }

  beforeEach(async () => {
    vi.resetAllMocks();
    vi.mocked(getCurrentUser).mockRejectedValue(Object.assign(new Error('Sin sesión'), {
      name: 'UserUnAuthenticatedException'
    }));
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
    const fixture = await iniciarComponente();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Lo mejor de Apple.');
  });

  it('evita consultas duplicadas y actualiza la vista al recibir productos', async () => {
    simularSesionValida();
    const fixture = await iniciarComponente();
    const app = fixture.componentInstance;
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    respuesta = new Subject<Producto[]>();
    const boton = fixture.nativeElement.querySelector('.orders button') as HTMLButtonElement;
    boton.click();
    app.consultarProductos();
    await fixture.whenStable();
    expect(obtenerPedidos).toHaveBeenCalledTimes(2);
    expect(boton.disabled).toBe(true);
    respuesta.next([{ id: 1, nombre: 'iPhone', categoria: 'Teléfono', precio: 1000, stock: 2 }]);
    respuesta.complete();
    await fixture.whenStable();
    expect(boton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.orders-list').textContent).toContain('iPhone');
    const tarjeta = fixture.nativeElement.querySelector('.order-card').textContent;
    expect(tarjeta).toContain('Teléfono');
    expect(tarjeta).toMatch(/\$\s?1\.000/);
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
    const fixture = await iniciarComponente();
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

  it('oculta el token por defecto, permite mostrarlo y ocultarlo, y lo limpia al salir', async () => {
    simularSesionValida();
    const fixture = await iniciarComponente();
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Token obtenido correctamente');
    expect(fixture.nativeElement.textContent).not.toContain('token-de-prueba');
    const boton = fixture.nativeElement.querySelector('.token-toggle') as HTMLButtonElement;
    expect(boton.textContent).toContain('Mostrar Access Token');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#access-token')).toBeNull();
    boton.click();
    await fixture.whenStable();
    expect(boton.textContent).toContain('Ocultar Access Token');
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#access-token').textContent).toBe('token-de-prueba');
    boton.click();
    await fixture.whenStable();
    expect(boton.textContent).toContain('Mostrar Access Token');
    expect(fixture.nativeElement.querySelector('#access-token')).toBeNull();
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    boton.click();
    await fixture.whenStable();
    await fixture.componentInstance.logout();
    await fixture.whenStable();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.account')).toBeNull();
    expect(fixture.componentInstance.usuario).toBe('');
    expect(fixture.componentInstance.accessToken).toBe('');
    expect(fixture.componentInstance.mostrarAccessToken).toBe(false);
  });

  it('muestra fallos de inicio y cierre de sesión sin detalles técnicos', async () => {
    const fixture = await iniciarComponente();
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

  it('inicia sin sesión sin mostrar errores ni consultar productos', async () => {
    const fixture = await iniciarComponente();
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(fetchAuthSession).not.toHaveBeenCalled();
    expect(obtenerPedidos).not.toHaveBeenCalled();
    expect(fixture.componentInstance.autenticado).toBe(false);
    expect(fixture.componentInstance.procesandoSesion).toBe(false);
    expect(fixture.componentInstance.errorSesion).toBe('');
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('no carga productos ni muestra sesión expirada si inicialmente faltan tokens', async () => {
    simularSesionValida();
    vi.mocked(fetchAuthSession).mockResolvedValue({});
    const fixture = await iniciarComponente();
    expect(fixture.componentInstance.autenticado).toBe(false);
    expect(fixture.componentInstance.procesandoSesion).toBe(false);
    expect(fixture.componentInstance.errorSesion).toBe('');
    expect(obtenerPedidos).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
  });

  it('carga automáticamente una vez tras validar sesión y permite consultar de nuevo manualmente', async () => {
    simularSesionValida();
    const fixture = await iniciarComponente();
    const app = fixture.componentInstance;
    expect(app.autenticado).toBe(true);
    expect(app.procesandoSesion).toBe(false);
    expect(app.cargandoProductos).toBe(true);
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    app.consultarProductos();
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta.next([{ id: 1, nombre: 'iPhone', categoria: 'Teléfono', precio: 1000, stock: 2 }]);
    respuesta.complete();
    await fixture.whenStable();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(app.cargandoProductos).toBe(false);
    expect(fixture.nativeElement.querySelector('.orders-list').textContent).toContain('iPhone');
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta = new Subject<Producto[]>();
    const boton = fixture.nativeElement.querySelector('.orders button') as HTMLButtonElement;
    expect(boton.disabled).toBe(false);
    boton.click();
    expect(obtenerPedidos).toHaveBeenCalledTimes(2);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    expect(app.cargandoProductos).toBe(false);
  });

  it('mantiene el botón Ver sesión tras una comprobación inicial sin usuario', async () => {
    const fixture = await iniciarComponente();
    simularSesionValida();
    const boton = Array.from(fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>)
      .find(element => element.textContent?.trim() === 'Ver sesión')!;
    expect(boton.disabled).toBe(false);
    boton.click();
    await vi.mocked(fixture.componentInstance.verSesion).mock.results[1].value;
    await fixture.whenStable();
    expect(getCurrentUser).toHaveBeenCalledTimes(2);
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.autenticado).toBe(true);
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.cargandoProductos).toBe(false);
  });
});

