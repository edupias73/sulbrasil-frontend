import { Injectable, computed, signal } from '@angular/core';
import { ItemCarrito, Produto } from '../models/produto.model';

@Injectable({ providedIn: 'root' })
export class CarritoService {
  private readonly items = signal<ItemCarrito[]>([]);

  readonly itemsCarrito = this.items.asReadonly();

  readonly cantidadItems = computed(() =>
    this.items().reduce((total, item) => total + item.cantidad, 0),
  );

  readonly totalPrecio = computed(() =>
    this.items().reduce((total, item) => total + item.produto.preco * item.cantidad, 0),
  );

  agregar(produto: Produto, cantidad = 1): void {
    this.items.update((lista) => {
      const indice = lista.findIndex((item) => item.produto.id === produto.id);

      if (indice >= 0) {
        const actualizada = [...lista];
        actualizada[indice] = {
          ...actualizada[indice],
          cantidad: actualizada[indice].cantidad + cantidad,
        };
        return actualizada;
      }

      return [...lista, { produto, cantidad }];
    });
  }

  remover(produtoId: number): void {
    this.items.update((lista) => lista.filter((item) => item.produto.id !== produtoId));
  }

  actualizarCantidad(produtoId: number, cantidad: number): void {
    if (cantidad <= 0) {
      this.remover(produtoId);
      return;
    }

    this.items.update((lista) =>
      lista.map((item) =>
        item.produto.id === produtoId ? { ...item, cantidad } : item,
      ),
    );
  }

  vaciar(): void {
    this.items.set([]);
  }

  enviarPedidoWhatsApp(numero: string): void {
    const items = this.items();
    if (items.length === 0) {
      return;
    }

    const lineas = items.map(
      (item) =>
        `- ${item.cantidad}x ${item.produto.nomePeca} (Cod: ${item.produto.codigoInterno}) - Gs ${this.formatearPrecio(item.produto.preco * item.cantidad)}`,
    );

    const texto = `¡Hola! Me gustaría hacer el siguiente pedido:\n${lineas.join('\n')}`;
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;

    window.open(url, '_blank');
  }

  formatearPrecio(valor: number): string {
    return Math.round(valor).toLocaleString('es-PY');
  }
}
