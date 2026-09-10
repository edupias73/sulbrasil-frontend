import { Component, OnDestroy, OnInit, effect, inject, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
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
  imports: [ReactiveFormsModule, RouterLink, ProductoDetalleComponent, MenuSeccionesComponent],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly produtoService = inject(ProdutoService);
  private readonly contenidoService = inject(CatalogoContenidoService);

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

  readonly banners = computed(() => this.contenidoService.obtenerBanners());
  readonly slideActivo = signal(0);
  private carouselInterval: any;

  constructor() {
    // Trava o fundo da tela se um menu ou produto estiver aberto
    effect(() => {
      const bloquear = this.menuAbierto() || this.carritoAbierto() || this.produtoSeleccionado() !== null;
      document.body.style.overflow = bloquear ? 'hidden' : '';
    });

    // Escuta o que o usuário digita na barra de pesquisa sem quebrar o Angular
    this.busqueda.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntilDestroyed()
    ).subscribe(termo => {
      this.executarBusca(termo, this.seccionActiva());
    });
  }

  ngOnInit(): void {
    void this.contenidoService.cargar();

    // Timer do Carrossel (Gira os banners a cada 5 segundos)
    this.carouselInterval = setInterval(() => {
      const total = this.banners().length;
      if (total > 1) {
        this.slideActivo.update(v => (v + 1) % total);
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.carouselInterval) clearInterval(this.carouselInterval);
  }

  // ==========================================
  // O NOVO MOTOR DE BUSCA (À prova de falhas)
  // ==========================================
  executarBusca(termo: string, categoria: string | null): void {
    const t = termo.trim();
    
    if (t.length < 2 && !categoria) {
      this.productos.set([]);
      this.cargando.set(false);
      return;
    }

    // O truque de mestre: setTimeout(..., 0) tira a ação do ciclo principal, evitando o erro NG0100!
    setTimeout(() => {
      this.cargando.set(true);
      this.error.set(null);

      this.produtoService.buscar(t, categoria).subscribe({
        next: (lista) => {
          this.productos.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.error.set('No se pudo conectar con el catálogo.');
          this.productos.set([]);
          this.cargando.set(false);
        }
      });
    }, 0);
  }

  seleccionarSeccion(id: string | null): void {
    this.seccionActiva.set(id);
    this.cerrarMenu(); // Fecha o menu lateral do celular ao clicar
    this.executarBusca(this.busqueda.value, id);
  }

  // ==========================================
  // FUNÇÕES DE TELA
  // ==========================================
  mudarSlide(index: number) { this.slideActivo.set(index); }
  seccionActual() { return obtenerSeccion(this.seccionActiva()); }
  imagenSeccionActiva() { const id = this.seccionActiva(); return id ? this.contenidoService.imagenSeccion(id) : null; }
  descripcionSeccionActiva() { const id = this.seccionActiva(); return id ? this.contenidoService.descripcionSeccion(id) : null; }
  abrirMenu() { this.menuAbierto.set(true); }
  cerrarMenu() { this.menuAbierto.set(false); }
  abrirDetalle(p: Produto) { this.produtoSeleccionado.set(p); }
  cerrarDetalle() { this.produtoSeleccionado.set(null); }
  
  onAgregadoAlCarrito(): void { 
    this.mensajeExito.set('¡Producto añadido a la lista!'); 
    setTimeout(() => this.mensajeExito.set(null), 2500); 
  }
  
  toggleCarrito() { this.carritoAbierto.update(v => !v); }
  cerrarCarrito() { this.carritoAbierto.set(false); }
  enviarWhatsApp() { this.carrito.enviarPedidoWhatsApp(this.whatsappNumero); }
  formatearPrecio(v: number) { return this.carrito.formatearPrecio(v); }
  imagenProducto(p: Produto) { return p.urlImagen ?? null; }
  
  mostrarEstadoVacio() { 
    return this.busqueda.value.trim().length < 2 && !this.seccionActiva(); 
  }
  
  mostrarSinResultados() { 
    return !this.cargando() && this.productos().length === 0 && !this.error() && !this.mostrarEstadoVacio(); 
  }
}