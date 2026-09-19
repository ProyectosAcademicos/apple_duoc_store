import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { fetchAuthSession } from 'aws-amplify/auth';
import { authInterceptor } from './auth.interceptor';
import { PedidosService } from './pedidos.service';

vi.mock('aws-amplify/auth', () => ({ fetchAuthSession: vi.fn() }));

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let service: PedidosService;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PedidosService);
  });

  afterEach(() => controller.verify());

  it('envía el Access Token, no el ID Token, al consultar productos', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: {
      accessToken: { toString: () => 'access-de-prueba', payload: {} },
      idToken: { toString: () => 'id-de-prueba', payload: {} }
    } });
    const result = firstValueFrom(service.obtenerPedidos());
    await Promise.resolve();
    const req = controller.expectOne(request => request.url.endsWith('/api/producto'));
    expect(req.request.headers.get('Authorization')).toBe('Bearer access-de-prueba');
    req.flush([]);
    await expect(result).resolves.toEqual([]);
  });

  it('no consulta Cognito ni agrega autorización a otras peticiones', async () => {
    const result = firstValueFrom(http.get('https://example.org/datos'));
    const req = controller.expectOne('https://example.org/datos');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(fetchAuthSession).not.toHaveBeenCalled();
    req.flush([]);
    await result;
  });

  it('informa sesión expirada sin enviar la petición cuando falta el token', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({});
    await expect(firstValueFrom(service.obtenerPedidos())).rejects.toMatchObject({ status: 401 });
    controller.expectNone(() => true);
  });

  it.each(['UserUnAuthenticatedException', 'NotAuthorizedException'])(
    'trata %s como sesión inválida', async name => {
      vi.mocked(fetchAuthSession).mockRejectedValue(Object.assign(new Error('detalle'), { name }));
      await expect(firstValueFrom(service.obtenerPedidos())).rejects.toMatchObject({ status: 401 });
      controller.expectNone(() => true);
    }
  );

  it('conserva errores de red de Amplify sin confundirlos con sesión expirada', async () => {
    const error = Object.assign(new Error('detalle de red'), { name: 'NetworkError' });
    vi.mocked(fetchAuthSession).mockRejectedValue(error);
    await expect(firstValueFrom(service.obtenerPedidos())).rejects.toBe(error);
    controller.expectNone(() => true);
  });

  it('conserva el 403 de la API para el mensaje de permisos', async () => {
    vi.mocked(fetchAuthSession).mockResolvedValue({ tokens: {
      accessToken: { toString: () => 'access-de-prueba', payload: {} }
    } });
    const result = firstValueFrom(service.obtenerPedidos()).catch(error => error);
    await Promise.resolve();
    controller.expectOne(request => request.url.endsWith('/api/producto'))
      .flush({}, { status: 403, statusText: 'Forbidden' });
    expect(await result).toBeInstanceOf(HttpErrorResponse);
    expect((await result).status).toBe(403);
  });
});
