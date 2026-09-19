import{
    Injectable
}from "@angular/core";

import{
    HttpClient
}from "@angular/common/http";

@Injectable ({ providedIn: 'root'})

export class ProductosService{
    private apiUrl = "https://psxwhfaf33.execute-api.us-east-1.amazonaws.com/test/api/productos";
    constructor(
        private http: HttpClient
    ){}

    obtenerProductos(){
        return this.http.get<any[]>(
            this.apiUrl
        );
    }
} //texto prueba