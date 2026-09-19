package cl.duoc.apple_backend.controller;

import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AppleProductoController {

    @GetMapping("api/productos")
    public List<Map<String, Object>> listarProductos() {

        return List.of(
            Map.of (
                "id", 1,
                "nombre", "iPhone Duo",
                "categoria", "iPhone",
                "precio", 2499990,
                "stock", 10
            ),

            Map.of (
                "id", 2,
                "nombre", "MacBook Air",
                "categoria", "Mac",
                "precio", 1299990,
                "stock", 8
            ),

            Map.of (
                "id", 3,
                "nombre", "iPad Pro",
                "categoria", "iPad",
                "precio", 999990,
                "stock", 5
            ),

            Map.of (
                "id", 4,
                "nombre", "Apple Watch Series 7",
                "categoria", "Apple Watch",
                "precio", 499990,
                "stock", 12
            ),

            Map.of (
                "id", 5,
                "nombre", "AirPods Pro",
                "categoria", "AirPods",
                "precio", 249990,
                "stock", 15
            )
        );
    }
}
