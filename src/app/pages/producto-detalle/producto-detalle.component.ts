import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { Produto } from '../../models/produto.model';
import { CarritoService } from '../../services/carrito.service';

type TabActiva = 'aplicaciones' | 'codigos';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  templateUrl: './producto-detalle.component.html',
})
export class ProductoDetalleComponent {
  @Input({ required: true }) produto!: Produto;
  @Output() cerrar = new EventEmitter<void>();
  @Output() agregado = new EventEmitter<void>();

  readonly tabActiva = signal<TabActiva>('aplicaciones');

  constructor(
    readonly carrito: CarritoService,
  ) {}

  seleccionarTab(tab: TabActiva): void {
    this.tabActiva.set(tab);
  }

  formatearAnos(anoInicio?: number | null, anoFim?: number | null): string {
    if (anoInicio && anoFim) {
      return `${anoInicio} – ${anoFim}`;
    }
    if (anoInicio) {
      return `Desde ${anoInicio}`;
    }
    if (anoFim) {
      return `Hasta ${anoFim}`;
    }
    return '—';
  }

  anadirAlCarrito(): void {
    this.carrito.agregar(this.produto);
    this.agregado.emit();
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }
}
