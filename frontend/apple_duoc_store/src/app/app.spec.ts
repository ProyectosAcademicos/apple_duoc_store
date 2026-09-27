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

  it.each<{ caso: string; payload: Record<string, string | number | boolean | never[]>; esperado: string }>([
    { caso: 'prioriza preferred_username', payload: { preferred_username: ' alias ', name: 'Nombre', given_name: 'Nombre corto', email: 'usuario@example.com' }, esperado: 'alias' },
    { caso: 'usa name si falta el alias', payload: { name: ' Nombre completo ', given_name: 'Nombre', email: 'usuario@example.com' }, esperado: 'Nombre completo' },
    { caso: 'usa given_name e ignora valores vacíos o no string', payload: { preferred_username: 123, name: '   ', given_name: ' Nombre ', email: 'usuario@example.com' }, esperado: 'Nombre' },
    { caso: 'usa email si no hay nombres válidos', payload: { preferred_username: '', name: false, given_name: ' ', email: ' usuario@example.com ' }, esperado: 'usuario@example.com' },
    { caso: 'usa username si no hay atributos amigables', payload: {}, esperado: 'identificador-interno' },
    { caso: 'usa username si todos los atributos son inválidos', payload: { preferred_username: [], name: false, given_name: 123, email: ' ' }, esperado: 'identificador-interno' },
  ])('$caso', async ({ payload, esperado }) => {
    vi.mocked(getCurrentUser).mockResolvedValue({ username: ' identificador-interno ', userId: '1' });
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: {
      accessToken: { toString: () => 'token-de-prueba', payload: {} },
      idToken: { toString: () => 'id-token-de-prueba', payload },
    } });
    const fixture = await iniciarComponente();
    expect(fixture.componentInstance.usuario).toBe(esperado);
    expect(fixture.nativeElement.querySelector('.nav-username').textContent).toBe(esperado);
    expect(fixture.componentInstance.accessToken).toBe('token-de-prueba');
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    expect(obtenerPedidos).toHaveBeenCalledTimes(1);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
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
    expect(fixture.nativeElement.querySelector('.spinner')).not.toBeNull();
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    respuesta = new Subject<Producto[]>();
    expect(fixture.nativeElement.textContent).not.toContain('Consultar productos');
    app.consultarProductos();
    app.consultarProductos();
    await fixture.whenStable();
    expect(obtenerPedidos).toHaveBeenCalledTimes(2);
    expect(app.cargandoProductos).toBe(true);
    respuesta.next([{ id: 1, nombre: 'iPhone', categoria: 'Teléfono', precio: 1000, stock: 2 }]);
    respuesta.complete();
    await fixture.whenStable();
    expect(app.cargandoProductos).toBe(false);
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
    expect(fixture.nativeElement.querySelector('#token-panel')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('token-de-prueba');
    const navbar = fixture.nativeElement.querySelector('.nav-session') as HTMLElement;
    expect(navbar.textContent).toContain('estudiante');
    expect(navbar.textContent).not.toContain('token-de-prueba');
    const detalles = fixture.nativeElement.querySelector('.profile') as HTMLDetailsElement;
    expect(detalles.open).toBe(false);
    detalles.querySelector('summary')!.click();
    expect(detalles.open).toBe(true);
    const boton = fixture.nativeElement.querySelector('.token-toggle') as HTMLButtonElement;
    expect(boton.textContent).toContain('Ver Access Token');
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#access-token')).toBeNull();
    boton.click();
    await fixture.whenStable();
    expect(detalles.open).toBe(false);
    expect(navbar.querySelector('#access-token')).toBeNull();
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('#access-token').textContent).toBe('token-de-prueba');
    (fixture.nativeElement.querySelector('.token-close') as HTMLButtonElement).click();
    await fixture.whenStable();
    expect(boton.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('#access-token')).toBeNull();
    expect(fetchAuthSession).toHaveBeenCalledTimes(1);
    detalles.querySelector('summary')!.click();
    boton.click();
    await fixture.whenStable();
    const logout = vi.spyOn(fixture.componentInstance, 'logout');
    detalles.querySelector('summary')!.click();
    const salir = navbar.querySelector('.profile-logout') as HTMLButtonElement;
    expect(salir.textContent).toContain('Cerrar sesión');
    salir.click();
    await logout.mock.results[0].value;
    await fixture.whenStable();
    expect(signOut).toHaveBeenCalledTimes(1);
    expect(fixture.nativeElement.querySelector('.account')).toBeNull();
    expect(fixture.componentInstance.usuario).toBe('');
    expect(fixture.componentInstance.accessToken).toBe('');
    expect(fixture.componentInstance.mostrarAccessToken).toBe(false);
    expect(navbar.textContent).toContain('Iniciar sesión');
    expect(navbar.textContent).not.toContain('estudiante');
    expect(navbar.querySelector('.profile')).toBeNull();
    expect(fixture.nativeElement.querySelector('#access-token')).toBeNull();
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
    const entrar = fixture.nativeElement.querySelector('.nav-session button') as HTMLButtonElement;
    expect(entrar.textContent).toContain('Iniciar sesión');
    expect(entrar.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.profile')).toBeNull();
    entrar.click();
    await fixture.whenStable();
    expect(signInWithRedirect).toHaveBeenCalledTimes(1);
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

  it('carga automáticamente una vez y conserva la consulta interna sin botón de consulta', async () => {
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
    expect(fixture.nativeElement.textContent).not.toContain('Consultar productos');
    app.consultarProductos();
    expect(obtenerPedidos).toHaveBeenCalledTimes(2);
    respuesta.next([]);
    respuesta.complete();
    await fixture.whenStable();
    expect(app.cargandoProductos).toBe(false);
  });

  it('mantiene la comprobación de sesión tras una inicialización sin usuario', async () => {
    const fixture = await iniciarComponente();
    simularSesionValida();
    await fixture.componentInstance.verSesion();
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
