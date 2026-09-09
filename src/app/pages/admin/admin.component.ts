import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SECCIONES_CATALOGO } from '../../config/secciones.config';
import { ContenidoProducto, ContenidoSeccion } from '../../models/catalogo-contenido.model';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminContenidoService } from '../../services/admin-contenido.service';
import { CatalogoContenidoService } from '../../services/catalogo-contenido.service';
import { ProdutoService } from '../../services/produto.service';
import { Produto } from '../../models/produto.model';
import { environment } from '../../../environments/environment';

type TabAdmin = 'csv' | 'productos' | 'manual' | 'secciones';

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
  private readonly router = inject(Router);

  readonly secciones = SECCIONES_CATALOGO;
  readonly autenticado = signal(false);
  readonly tab = signal<TabAdmin>('manual'); // Aba padrão agora é a manual
  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  readonly pinInput = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly seccionSeleccionada = new FormControl('alternadores', { nonNullable: true });
  readonly descripcionSeccion = new FormControl('', { nonNullable: true });
  
  // Campos para CADASTRO MANUAL
  readonly manualCodigo = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualNombre = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualMarca = new FormControl('', { nonNullable: true });
  readonly manualCategoria = new FormControl('alternadores', { nonNullable: true });
  readonly manualPreco = new FormControl<number | null>(null, { validators: [Validators.required] });
  readonly manualEstoque = new FormControl<number>(1, { nonNullable: true });
  
  // Campos para BUSCA/EDIÇÃO VISUAL
  readonly buscaAdmin = new FormControl('', { nonNullable: true });
  readonly produtosBuscados = signal<Produto[]>([]);
  readonly produtoSelecionadoVisual = signal<Produto | null>(null);
  
  readonly codigoProducto = new FormControl('', { nonNullable: true });
  readonly descripcionProducto = new FormControl('', { nonNullable: true });

  archivoSeccion: File | null = null;
  archivoProducto: File | null = null;
  archivoCsv: File | null = null;

  previewSeccion: string | null = null;
  previewProducto: string | null = null;
  imagenActualSeccion: string | null = null;
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
    if (t === 'secciones') void this.cargarDatosSeccion();
  }

  onArchivoProducto(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.archivoProducto = file;
    this.previewProducto = URL.createObjectURL(file);
  }

  // ==========================================
  // LÓGICA 1: CADASTRO 100% MANUAL NOVO
  // ==========================================
  async guardarProductoManual(): Promise<void> {
    if (this.manualCodigo.invalid || this.manualNombre.invalid || this.manualPreco.invalid) {
      this.mensaje.set({ tipo: 'error', texto: 'Llene los campos obligatorios (Código, Nombre, Precio).' });
      return;
    }

    this.guardando.set(true);
    this.mensaje.set(null);

    try {
      // 1. Salva os dados base no Banco de Dados (MySQL)
    const novoProduto = {
        codigoInterno: this.manualCodigo.value.trim().toUpperCase(),
        nomePeca: this.manualNombre.value.trim(),
        marcaPrincipal: this.manualMarca.value.trim(),
        preco: 0, // ZERO automático
        quantidadeEstoque: 1, // Sempre com estoque 1
        categoria: this.manualCategoria.value
      };

      const urlSalvar = environment.apiUrl.replace('/buscar', '/manual');
      await firstValueFrom(this.http.post(urlSalvar, novoProduto));

      // 2. Se tiver foto ou descrição longa, salva no JSON/Volume
      let imagenUrl = undefined;
      const codigoStr = novoProduto.codigoInterno;

      if (this.archivoProducto || this.descripcionProducto.value.trim()) {
        if (this.archivoProducto) {
          imagenUrl = await firstValueFrom(this.adminApi.subirImagen('productos', codigoStr, this.archivoProducto));
        }
        const datosExtras: ContenidoProducto = {
          descripcion: this.descripcionProducto.value.trim(),
          imagen: imagenUrl
        };
        await firstValueFrom(this.adminApi.guardarProducto(codigoStr, datosExtras));
      }

      await this.catalogo.recargar();
      
      this.mensaje.set({ tipo: 'ok', texto: '¡Producto creado con éxito!' });
      
      // Limpa o form
      this.manualCodigo.reset();
      this.manualNombre.reset();
      this.manualMarca.reset();
      this.manualPreco.reset();
      this.manualEstoque.setValue(1);
      this.descripcionProducto.reset();
      this.archivoProducto = null;
      this.previewProducto = null;

    } catch (e: any) {
      this.mensaje.set({ tipo: 'error', texto: 'Error al crear el producto. ¿El código ya existe?' });
    } finally {
      this.guardando.set(false);
    }
  }

  // ==========================================
  // LÓGICA 2: IMPORTAR CSV
  // ==========================================
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
      this.mensaje.set({ tipo: 'ok', texto: `¡Éxito! Importados: ${res.importados} | Actualizados: ${res.atualizados}` });
      this.archivoCsv = null;
    } catch (e: any) {
      this.mensaje.set({ tipo: 'error', texto: e.error?.erro || 'Error al importar CSV.' });
    } finally {
      this.guardando.set(false);
    }
  }

  // ==========================================
  // LÓGICA 3: EDITAR FOTOS DE PEÇAS EXISTENTES
  // ==========================================
  async buscarProdutoVisual(): Promise<void> {
    const termo = this.buscaAdmin.value.trim();
    if (termo.length < 2) return;
    this.mensaje.set(null);
    try {
      const res = await firstValueFrom(this.produtoService.buscar(termo, null));
      this.produtosBuscados.set(res);
      if (res.length === 0) this.mensaje.set({ tipo: 'error', texto: 'No se encontraron repuestos.' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al buscar piezas.' });
    }
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
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al cargar detalles del producto.' });
    }
  }

  limpiarSeleccionProduto(): void {
    this.produtoSelecionadoVisual.set(null);
    this.codigoProducto.reset();
    this.descripcionProducto.reset();
    this.previewProducto = null;
    this.archivoProducto = null;
  }

  async guardarFotoExistente(): Promise<void> {
    const codigo = this.codigoProducto.value.trim().toUpperCase();
    if (!codigo) return;
    this.guardando.set(true);
    this.mensaje.set(null);
    try {
      let imagenUrl = this.imagenActualProducto;
      if (this.archivoProducto) {
        imagenUrl = await firstValueFrom(this.adminApi.subirImagen('productos', codigo, this.archivoProducto));
      }
      const datos: ContenidoProducto = {
        descripcion: this.descripcionProducto.value.trim(),
        imagen: imagenUrl ?? undefined,
      };
      await firstValueFrom(this.adminApi.guardarProducto(codigo, datos));
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: '¡Foto y detalles guardados!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo guardar el producto.' });
    } finally {
      this.guardando.set(false);
    }
  }

  // ==========================================
  // LÓGICA DE SEÇÕES
  // ==========================================
  async onSeccionChange(): Promise<void> { await this.cargarDatosSeccion(); }
  private async cargarDatosSeccion(): Promise<void> {
    const id = this.seccionSeleccionada.value;
    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const sec = contenido.secciones[id];
      this.descripcionSeccion.setValue(sec?.descripcion ?? '');
      this.imagenActualSeccion = sec?.imagen ?? null;
      this.previewSeccion = this.imagenActualSeccion;
      this.archivoSeccion = null;
    } catch {}
  }
  onArchivoSeccion(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.archivoSeccion = input.files[0];
      this.previewSeccion = URL.createObjectURL(input.files[0]);
    }
  }
  async guardarSeccion(): Promise<void> {
    const id = this.seccionSeleccionada.value;
    this.guardando.set(true);
    try {
      let imagenUrl = this.imagenActualSeccion;
      if (this.archivoSeccion) imagenUrl = await firstValueFrom(this.adminApi.subirImagen('secciones', id, this.archivoSeccion));
      const datos: ContenidoSeccion = { descripcion: this.descripcionSeccion.value.trim(), imagen: imagenUrl ?? undefined };
      await firstValueFrom(this.adminApi.guardarSeccion(id, datos));
      this.mensaje.set({ tipo: 'ok', texto: '¡Sección guardada!' });
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'No se pudo guardar la sección.' });
    } finally {
      this.guardando.set(false);
    }
  }
}