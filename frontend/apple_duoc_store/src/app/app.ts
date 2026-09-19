import { ChangeDetectorRef, Component, DestroyRef, inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { signInWithRedirect, signOut, fetchAuthSession, getCurrentUser } from 'aws-amplify/auth';
import { PedidosService } from './pedidos.service';

const ERROR_CONEXION = 'No pudimos conectarnos con el servidor. Intenta nuevamente.';
const ERROR_SESION = 'Tu sesión expiró. Inicia sesión nuevamente.';

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  usuario = '';
  autenticado = false;
  productos: any[] = [];
  cargandoProductos = false;
  procesandoSesion = false;
  errorProductos = '';
  errorSesion = '';

  constructor(private pedidosService: PedidosService) {}

  async login() {
    if (this.procesandoSesion || this.cargandoProductos) return;
    this.procesandoSesion = true;
    this.errorSesion = '';
    try {
      await signInWithRedirect();
    } catch {
      this.errorSesion = 'No fue posible iniciar sesión. Intenta nuevamente.';
    } finally {
      this.procesandoSesion = false;
      this.changeDetector.markForCheck();
    }
  }

  async logout() {
    if (this.procesandoSesion || this.cargandoProductos) return;
    this.procesandoSesion = true;
    this.errorSesion = '';
    try {
      await signOut();
      this.limpiarSesion();
    } catch {
      this.errorSesion = 'No fue posible cerrar sesión. Intenta nuevamente.';
    } finally {
      this.procesandoSesion = false;
      this.changeDetector.markForCheck();
    }
  }

  async verSesion() {
    if (this.procesandoSesion || this.cargandoProductos) return;
    this.procesandoSesion = true;
    this.errorSesion = '';
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      if (!session.tokens?.accessToken) {
        this.limpiarSesion();
        this.errorSesion = ERROR_SESION;
        return;
      }
      this.usuario = user.username;
      this.autenticado = true;
    } catch (error) {
      this.limpiarSesion();
      this.errorSesion = error instanceof Error && error.name === 'NetworkError'
        ? ERROR_CONEXION
        : 'No pudimos verificar tu sesión. Inicia sesión nuevamente.';
    } finally {
      this.procesandoSesion = false;
      this.changeDetector.markForCheck();
    }
  }

  consultarProductos() {
    if (this.cargandoProductos || this.procesandoSesion) return;
    if (!this.autenticado) {
      this.errorSesion = ERROR_SESION;
      return;
    }
    this.cargandoProductos = true;
    this.errorProductos = '';
    this.productos = [];
    this.pedidosService.obtenerPedidos().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.cargandoProductos = false;
        this.changeDetector.markForCheck();
      })
    ).subscribe({
      next: (data) => {
        this.productos = data;
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse && error.status === 401) {
          this.limpiarSesion();
          this.errorSesion = ERROR_SESION;
        } else if (error instanceof HttpErrorResponse && error.status === 403) {
          this.errorProductos = 'No tienes autorización para consultar esta información.';
        } else if ((error instanceof HttpErrorResponse && error.status === 0)
          || (error instanceof Error && error.name === 'NetworkError')) {
          this.errorProductos = ERROR_CONEXION;
        } else {
          this.errorProductos = 'No fue posible cargar los productos.';
        }
      }
    });
  }

  private limpiarSesion() {
    this.usuario = '';
    this.autenticado = false;
    this.productos = [];
    this.errorProductos = '';
  }
}
