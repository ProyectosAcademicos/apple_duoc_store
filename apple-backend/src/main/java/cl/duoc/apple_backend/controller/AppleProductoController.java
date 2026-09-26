package cl.duoc.apple_backend.controller;

import java.util.List;
import java.util.Map;
import java.util.ArrayList;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;

@RestController
public class AppleProductoController {

    @GetMapping("api/productos")
    public List<Map<String, Object>> listarProductos() {
        return productos;
    }

    private final List<Map<String, Object>> productos = new ArrayList<>(
            List.of(
                    Map.of(
                            "id", 1,
                            "nombre", "iPhone Duo",
                            "categoria", "iPhone",
                            "precio", 2499990,
                            "stock", 10),
                    Map.of(
                            "id", 2,
                            "nombre", "MacBook Air",
                            "categoria", "Mac",
                            "precio", 1299990,
                            "stock", 8),
                    Map.of(
                            "id", 3,
                            "nombre", "iPad Pro",
                            "categoria", "iPad",
                            "precio", 999990,
                            "stock", 5),
                    Map.of(
                            "id", 4,
                            "nombre", "Apple Watch Series 7",
                            "categoria", "Apple Watch",
                            "precio", 499990,
                            "stock", 12),
                    Map.of(
                            "id", 5,
                            "nombre", "AirPods Pro",
                            "categoria", "AirPods",
                            "precio", 249990,
                            "stock", 15)));

    @GetMapping("api/productos/{id}")
    public Map<String, Object> obtenerProductosPorId(@PathVariable int id) {

        return listarProductos().stream()
                .filter(producto -> producto.get("id").equals(id))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Producto no encontrado"));

    }

    @PostMapping("api/productos")
    public Map<String, Object> crearProducto(@RequestBody Map<String, Object> nuevoProducto) {

        Object nuevoId = nuevoProducto.get("id");

        boolean idExiste = productos.stream()
                .anyMatch(producto -> producto.get("id").equals(nuevoId));

        if (idExiste) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Ya existe un producto con ese ID");
        }

        productos.add(nuevoProducto);

        return nuevoProducto;
    }

    @PutMapping("api/productos/{id}")
    public Map<String, Object> actualizarProducto(
        @PathVariable int id,
        @RequestBody Map<String, Object> productoActualizado) {
            for (int i = 0; i < productos.size(); i ++) {
                
                if (productos.get(i).get("id").equals(id)){
                    
                    Map<String, Object> producto = Map.of(
                        "id", id,
                        "nombre", productoActualizado.get("nombre"),
                        "categoria", productoActualizado.get("categoria"),
                        "precio", productoActualizado.get("precio"),
                        "stock", productoActualizado.get("stock")
                    );

                    productos.set(i, producto);

                    return producto;
                }
            }

            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "producto no encontrado"
            );
        }

        @DeleteMapping("api/productos/{id}")
        public Map<String, Object> eliminarProducto(@PathVariable int id) {

            for (int i = 0; i <productos.size(); i++) {
                
                if (productos.get(i).get("id").equals(id)) {

                    Map<String, Object> productoEliminado = productos.remove(i);

                    return productoEliminado;
                }
            }

            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Producto no encontrado"
            );
        }
}
