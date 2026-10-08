import { Component, EventEmitter, Input, Output, signal, OnInit } from '@angular/core';
import { Produto } from '../../models/produto.model';
import { CarritoService } from '../../services/carrito.service';
import { environment } from '../../../environments/environment';

type TabActiva = 'aplicaciones' | 'codigos';

@Component({
  selector: 'app-producto-detalle',
  standalone: true,
  templateUrl: './producto-detalle.component.html',
})
export class ProductoDetalleComponent implements OnInit {
  @Input({ required: true }) produto!: Produto;
  @Output() cerrar = new EventEmitter<void>();
  @Output() agregado = new EventEmitter<void>();

  readonly tabActiva = signal<TabActiva>('aplicaciones');
  readonly fotoAtual = signal<string | null>(null);

  constructor(
    readonly carrito: CarritoService,
  ) {}

  get galeriaCompletas(): string[] {
    const urls = this.produto.galeria && this.produto.galeria.length > 0 
                 ? this.produto.galeria 
                 : (this.produto.urlImagen ? [this.produto.urlImagen] : []);
    
    return urls.map(u => {
       if (u.startsWith('http')) return u;
       return environment.apiUrl.replace('/api/produtos/buscar', '') + u;
    });
  }

  get imagenCompleta(): string | null {
     const urls = this.galeriaCompletas;
     return urls.length > 0 ? urls[0] : null;
  }

  ngOnInit() {
    const galeria = this.galeriaCompletas;
    if (galeria.length > 0) {
      this.fotoAtual.set(galeria[0]);
    }
  }

  mudarFoto(url: string) {
    this.fotoAtual.set(url);
  }

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