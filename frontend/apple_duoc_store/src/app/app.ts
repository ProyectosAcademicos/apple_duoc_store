import { Component } from "@angular/core";
import {
  signInWithRedirect,
  signOut,
  fetchAuthSession,
  getCurrentUser
} from 'aws-amplify/auth';

import { PedidosService } from "./pedidos.service";
@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {


  usuario = '';
  autenticado = false;
  productos: any[] = [];
  cargandoProductos = false;
  errorProductos = '';

  constructor(
    private pedidosService : PedidosService
  ){}

  async login(){
    await signInWithRedirect();
  }
  async logout(){
    await signOut();
  }
  async verSesion(){
    try{
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      this.usuario = user.username;
      this.autenticado = !!session.tokens?.accessToken;
    }
    catch {
      this.autenticado = false;
    }
  }

  consultarProductos() {
  this.cargandoProductos = true;
  this.errorProductos = '';
  this.pedidosService
    .obtenerPedidos()
    .subscribe({
      next: (data) => {
        this.productos = data;
        this.cargandoProductos = false;
      },
      error: (error) => {
        this.errorProductos =
          `Error HTTP ${error.status}`;
        this.cargandoProductos = false;
      }
    });
}


}
