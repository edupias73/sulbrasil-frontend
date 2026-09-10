import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SECCIONES_CATALOGO } from '../../config/secciones.config';
import { ContenidoProducto, ContenidoSeccion } from '../../models/catalogo-contenido.model';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminContenidoService } from '../../services/admin-contenido.service';
import { CatalogoContenidoService, BannerCarousel } from '../../services/catalogo-contenido.service';
import { ProdutoService } from '../../services/produto.service';
import { Produto } from '../../models/produto.model';
import { environment } from '../../../environments/environment';

type TabAdmin = 'csv' | 'productos' | 'manual' | 'banners';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './admin.component.html',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly auth = inject(AdminAuthService);
  private readonly adminApi = inject(AdminContenidoService);
  private readonly catalogo = inject(CatalogoContenidoService);
  private readonly produtoService = inject(ProdutoService);
  private readonly http = inject(HttpClient);

  readonly secciones = SECCIONES_CATALOGO;
  readonly autenticado = signal(false);
  readonly tab = signal<TabAdmin>('manual');
  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  
  // Banners State
  readonly banners = signal<BannerCarousel[]>([]);

  readonly pinInput = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualCodigo = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualNombre = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualMarca = new FormControl('', { nonNullable: true });
  readonly manualCategoria = new FormControl('alternadores', { nonNullable: true });
  readonly manualPreco = new FormControl<number | null>(null, { validators: [Validators.required] });
  readonly manualEstoque = new FormControl<number>(1, { nonNullable: true });
  
  readonly buscaAdmin = new FormControl('', { nonNullable: true });
  readonly produtosBuscados = signal<Produto[]>([]);
  readonly produtoSelecionadoVisual = signal<Produto | null>(null);
  readonly codigoProducto = new FormControl('', { nonNullable: true });
  readonly descripcionProducto = new FormControl('', { nonNullable: true });

  archivoProducto: File | null = null;
  archivoCsv: File | null = null;
  previewProducto: string | null = null;
  imagenActualProducto: string | null = null;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    if (this.auth.estaAutenticado()) {
      this.autenticado.set(true);
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }

  async ingresar(): Promise<void> {
    const pin = this.pinInput.value.trim();
    if (!pin) return;
    this.mensaje.set(null);
    try {
      const valido = await firstValueFrom(this.adminApi.verificarPin(pin));
      if (!valido) {
        this.mensaje.set({ tipo: 'error', texto: 'PIN incorrecto.' });
        return;
      }
      this.auth.guardarPin(pin);
      this.autenticado.set(true);
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' });
    }
  }

  salir(): void {
    this.auth.cerrarSesion();
    this.autenticado.set(false);
    this.pinInput.reset();
  }

  cambiarTab(t: TabAdmin): void {
    this.tab.set(t);
    this.mensaje.set(null);
    if (t === 'banners') this.cargarBanners();
  }

  // ==========================================
  // CARROSSEL (BANNERS)
  // ==========================================
  async cargarBanners() {
    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const sec = contenido.secciones['BANNERS_HOME'];
      if (sec?.descripcion) {
        this.banners.set(JSON.parse(sec.descripcion));
      }
    } catch {}
  }

  async subirBanner(event: Event, tipo: 'imagen' | 'video') {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.guardando.set(true);
    this.mensaje.set(null);
    try {
      const idBanner = 'banner-' + Date.now();
      const url = await firstValueFrom(this.adminApi.subirImagen('secciones', idBanner, file));
      const novosBanners = [...this.banners(), { id: idBanner, tipo, url }];
      
      await firstValueFrom(this.adminApi.guardarSeccion('BANNERS_HOME', { descripcion: JSON.stringify(novosBanners) }));
      this.banners.set(novosBanners);
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: '¡Banner añadido al carrusel!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al subir el archivo.' });
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarBanner(id: string) {
    const novos = this.banners().filter(b => b.id !== id);
    this.guardando.set(true);
    try {
      await firstValueFrom(this.adminApi.guardarSeccion('BANNERS_HOME', { descripcion: JSON.stringify(novos) }));
      this.banners.set(novos);
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: 'Banner eliminado.' });
    } finally {
      this.guardando.set(false);
    }
  }

  // ==========================================
  // LÓGICA DE PRODUTOS, CSV E MANUAL (Mantidas intactas)
  // ==========================================
  onArchivoProducto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.archivoProducto = file;
    this.previewProducto = URL.createObjectURL(file);
  }

  async guardarProductoManual(): Promise<void> {
    if (this.manualCodigo.invalid || this.manualNombre.invalid || this.manualPreco.invalid) {
      this.mensaje.set({ tipo: 'error', texto: 'Llene los campos obligatorios.' }); return;
    }
    this.guardando.set(true);
    this.mensaje.set(null);
    try {
      const novoProduto = {
        codigoInterno: this.manualCodigo.value.trim().toUpperCase(),
        nomePeca: this.manualNombre.value.trim(),
        marcaPrincipal: this.manualMarca.value.trim(),
        preco: 0, quantidadeEstoque: 1, categoria: this.manualCategoria.value
      };
      const urlSalvar = environment.apiUrl.replace('/buscar', '/manual');
      await firstValueFrom(this.http.post(urlSalvar, novoProduto));

      const codigoStr = novoProduto.codigoInterno;
      if (this.archivoProducto || this.descripcionProducto.value.trim()) {
        let imagenUrl = undefined;
        if (this.archivoProducto) {
          imagenUrl = await firstValueFrom(this.adminApi.subirImagen('productos', codigoStr, this.archivoProducto));
        }
        await firstValueFrom(this.adminApi.guardarProducto(codigoStr, { descripcion: this.descripcionProducto.value.trim(), imagen: imagenUrl }));
      }
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: '¡Producto creado con éxito!' });
      this.manualCodigo.reset(); this.manualNombre.reset(); this.manualMarca.reset(); this.manualPreco.reset();
      this.descripcionProducto.reset(); this.archivoProducto = null; this.previewProducto = null;
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al crear el producto.' });
    } finally {
      this.guardando.set(false);
    }
  }

  onArchivoCsv(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) this.archivoCsv = input.files[0];
  }

  async subirCsv(): Promise<void> {
    if (!this.archivoCsv) return;
    this.guardando.set(true);
    this.mensaje.set(null);
    try {
      const res = await firstValueFrom(this.adminApi.importarCsv(this.archivoCsv));
      this.mensaje.set({ tipo: 'ok', texto: `Importados: ${res.importados} | Actualizados: ${res.atualizados}` });
      this.archivoCsv = null;
    } catch (e: any) {
      this.mensaje.set({ tipo: 'error', texto: e.error?.erro || 'Error al importar CSV.' });
    } finally {
      this.guardando.set(false);
    }
  }

  async buscarProdutoVisual(): Promise<void> {
    const termo = this.buscaAdmin.value.trim();
    if (termo.length < 2) return;
    try {
      const res = await firstValueFrom(this.produtoService.buscar(termo, null));
      this.produtosBuscados.set(res);
      if (res.length === 0) this.mensaje.set({ tipo: 'error', texto: 'No se encontraron repuestos.' });
    } catch {}
  }

  async selecionarParaEditar(p: Produto): Promise<void> {
    this.produtoSelecionadoVisual.set(p);
    this.codigoProducto.setValue(p.codigoInterno);
    this.produtosBuscados.set([]); 
    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const prod = contenido.productos[p.codigoInterno.toUpperCase()];
      this.descripcionProducto.setValue(prod?.descripcion ?? '');
      this.imagenActualProducto = prod?.imagen ?? null;
      this.previewProducto = this.imagenActualProducto;
      this.archivoProducto = null;
    } catch {}
  }

  limpiarSeleccionProduto(): void {
    this.produtoSelecionadoVisual.set(null); this.codigoProducto.reset(); this.descripcionProducto.reset();
    this.previewProducto = null; this.archivoProducto = null;
  }

  async guardarFotoExistente(): Promise<void> {
    const codigo = this.codigoProducto.value.trim().toUpperCase();
    if (!codigo) return;
    this.guardando.set(true);
    try {
      let imagenUrl = this.imagenActualProducto;
      if (this.archivoProducto) {
        imagenUrl = await firstValueFrom(this.adminApi.subirImagen('productos', codigo, this.archivoProducto));
      }
      await firstValueFrom(this.adminApi.guardarProducto(codigo, { descripcion: this.descripcionProducto.value.trim(), imagen: imagenUrl ?? undefined }));
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: '¡Foto guardada!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al guardar.' });
    } finally {
      this.guardando.set(false);
    }
  }
}