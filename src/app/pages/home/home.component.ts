import { Component, DestroyRef, OnDestroy, OnInit, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  of,
  startWith,
  switchMap,
  tap,
} from 'rxjs';
import { SECCIONES_CATALOGO, obtenerSeccion } from '../../config/secciones.config';
import { environment } from '../../../environments/environment';
import { Produto } from '../../models/produto.model';
import { CarritoService } from '../../services/carrito.service';
import { CatalogoContenidoService } from '../../services/catalogo-contenido.service';
import { ProdutoService } from '../../services/produto.service';
import { MenuSeccionesComponent } from '../../components/menu-secciones/menu-secciones.component';
import { ProductoDetalleComponent } from '../producto-detalle/producto-detalle.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [ReactiveFormsModule, ProductoDetalleComponent, MenuSeccionesComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly produtoService = inject(ProdutoService);
  private readonly contenidoService = inject(CatalogoContenidoService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    effect(() => {
      const bloquear =
        this.menuAbierto() || this.carritoAbierto() || this.produtoSeleccionado() !== null;
      document.body.style.overflow = bloquear ? 'hidden' : '';
    });
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  readonly carrito = inject(CarritoService);
  readonly secciones = SECCIONES_CATALOGO;
  readonly nombreTienda = environment.nombreTienda;
  readonly whatsappNumero = environment.whatsappNumero;

  readonly busqueda = new FormControl('', { nonNullable: true });
  readonly productos = signal<Produto[]>([]);
  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);
  readonly produtoSeleccionado = signal<Produto | null>(null);
  readonly carritoAbierto = signal(false);
  readonly menuAbierto = signal(false);
  readonly mensajeExito = signal<string | null>(null);
  readonly seccionActiva = signal<string | null>(null);

  ngOnInit(): void {
    void this.contenidoService.cargar();

    combineLatest([
      this.busqueda.valueChanges.pipe(startWith(''), debounceTime(300), distinctUntilChanged()),
      toObservable(this.seccionActiva),
    ])
      .pipe(
        tap(() => this.error.set(null)),
        tap(([termo, categoria]) => {
          const t = termo.trim();
          if (t.length < 2 && !categoria) {
            this.productos.set([]);
            this.cargando.set(false);
          }
        }),
        tap(([termo, categoria]) => {
          const t = termo.trim();
          if (t.length >= 2 || categoria) {
            this.cargando.set(true);
          }
        }),
        switchMap(([termo, categoria]) => {
          const t = termo.trim();
          if (t.length < 2 && !categoria) {
            return of([] as Produto[]);
          }
          return this.produtoService.buscar(t, categoria).pipe(
            catchError(() => {
              this.error.set(
                'No se pudo conectar con el catálogo. Verifique que el servidor esté activo.',
              );
              return of([] as Produto[]);
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => {
        this.productos.set(lista);
        this.cargando.set(false);
      });
  }

  seccionActual() {
    return obtenerSeccion(this.seccionActiva());
  }

  imagenSeccionActiva(): string | null {
    const id = this.seccionActiva();
    return id ? this.contenidoService.imagenSeccion(id) : null;
  }

  descripcionSeccionActiva(): string | null {
    const id = this.seccionActiva();
    return id ? this.contenidoService.descripcionSeccion(id) : null;
  }

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  seleccionarSeccion(id: string | null): void {
    this.seccionActiva.set(id);
  }

  abrirDetalle(produto: Produto): void {
    this.produtoSeleccionado.set(produto);
  }

  cerrarDetalle(): void {
    this.produtoSeleccionado.set(null);
  }

  onAgregadoAlCarrito(): void {
    this.mensajeExito.set('¡Producto añadido al carrito!');
    setTimeout(() => this.mensajeExito.set(null), 2500);
  }

  toggleCarrito(): void {
    this.carritoAbierto.update((v) => !v);
  }

  cerrarCarrito(): void {
    this.carritoAbierto.set(false);
  }

  enviarWhatsApp(): void {
    this.carrito.enviarPedidoWhatsApp(this.whatsappNumero);
  }

  formatearPrecio(valor: number): string {
    return this.carrito.formatearPrecio(valor);
  }

  imagenProducto(produto: Produto): string | null {
    return produto.urlImagen ?? null;
  }

  mostrarEstadoVacio(): boolean {
    const t = this.busqueda.value.trim();
    return t.length < 2 && !this.seccionActiva();
  }

  mostrarSinResultados(): boolean {
    return !this.cargando() && this.productos().length === 0 && !this.error() && !this.mostrarEstadoVacio();
  }
}
