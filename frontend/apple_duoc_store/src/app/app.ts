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
  token = '';
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
      this.token = session.tokens?.accessToken?.toString()??'';
      this.autenticado = true;
      console.log("Usuario:",user);
      console.log("Access Token:",session.tokens?.accessToken?.toString())
    }
    catch(Error){
      console.log("No existe sesion",Error);
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
        console.log(
          'Productos:',
          data
        );
      },
      error: (error) => {
        console.error(error);
        this.errorProductos =
          `Error HTTP ${error.status}`;
        this.cargandoProductos = false;
      }
    });
}


}