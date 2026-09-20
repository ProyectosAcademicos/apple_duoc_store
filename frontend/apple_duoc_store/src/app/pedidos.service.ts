import{
    Injectable
}from "@angular/core";

import{
    HttpClient, HttpContext
}from "@angular/common/http";
import { REQUIERE_AUTENTICACION } from './auth.interceptor';

export interface Producto {
    id: number;
    nombre: string;
    categoria: string;
    precio: number;
    stock: number;
}

@Injectable ({ providedIn: 'root'})

export class PedidosService{
    private apiUrl = "https://jv7jt7mk3a.execute-api.us-east-1.amazonaws.com/test/api/producto";
    constructor(
        private http: HttpClient
    ){}

    obtenerPedidos(){
        return this.http.get<Producto[]>(
            this.apiUrl,
            { context: new HttpContext().set(REQUIERE_AUTENTICACION, true) }
        );
    }
}
