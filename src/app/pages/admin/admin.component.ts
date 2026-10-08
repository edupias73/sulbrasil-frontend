import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { SECCIONES_CATALOGO } from '../../config/secciones.config';
import { ContenidoProducto, ContenidoSeccion } from '../../models/catalogo-contenido.model';
import { AdminAuthService } from '../../services/admin-auth.service';
import { AdminContenidoService } from '../../services/admin-contenido.service';
import { CatalogoContenidoService, BannerCarousel } from '../../services/catalogo-contenido.service';
import { ProdutoService } from '../../services/produto.service';
import { CarritoService } from '../../services/carrito.service';
import { environment } from '../../../environments/environment';
import { Produto, AplicacaoVeiculo, CodigoCruzado } from '../../models/produto.model';

type TabAdmin = 'gestion' | 'csv' | 'banners';

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
  readonly carrito = inject(CarritoService);

  readonly secciones = SECCIONES_CATALOGO;
  readonly autenticado = signal(false);
  readonly tab = signal<TabAdmin>('gestion');
  readonly guardando = signal(false);
  readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  
  readonly banners = signal<BannerCarousel[]>([]);
  readonly modoEdicion = signal(false);

  readonly pinInput = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly buscaAdmin = new FormControl('', { nonNullable: true });
  readonly produtosBuscados = signal<Produto[]>([]);

  // Formulário Unificado
  readonly manualCodigo = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualNombre = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly manualMarca = new FormControl('', { nonNullable: true });
  readonly manualCategoria = new FormControl('alternadores', { nonNullable: true });
  readonly manualPreco = new FormControl<number | null>(null, { validators: [Validators.required] });
  readonly manualEstoque = new FormControl<number>(1, { nonNullable: true });
  readonly descripcionProducto = new FormControl('', { nonNullable: true });
  readonly aplicacoes = signal<AplicacaoVeiculo[]>([]);
  readonly codigosOem = signal<CodigoCruzado[]>([]);
  readonly galeriaAdmin = signal<{ url: string; file?: File; isNew: boolean }[]>([]);

  archivoProducto: File | null = null;
  previewProducto: string | null = null;
  imagenActualProducto: string | null = null;

  ngOnInit(): void {
    document.body.style.overflow = 'hidden';
    if (this.auth.estaAutenticado()) this.autenticado.set(true);
  }

  ngOnDestroy(): void { document.body.style.overflow = ''; }

  async ingresar(): Promise<void> {
    const pin = this.pinInput.value.trim();
    if (!pin) return;
    this.mensaje.set(null);
    try {
      const valido = await firstValueFrom(this.adminApi.verificarPin(pin));
      if (!valido) { this.mensaje.set({ tipo: 'error', texto: 'PIN incorrecto.' }); return; }
      this.auth.guardarPin(pin);
      this.autenticado.set(true);
    } catch { this.mensaje.set({ tipo: 'error', texto: 'No se pudo conectar.' }); }
  }

  salir(): void { this.auth.cerrarSesion(); this.autenticado.set(false); this.pinInput.reset(); }

  cambiarTab(t: TabAdmin): void {
    this.tab.set(t);
    this.mensaje.set(null);
    if (t === 'banners') this.cargarBanners();
  }

  // ==========================================
  // GESTÃO UNIFICADA (CRIAR / EDITAR / EXCLUIR)
  // ==========================================
  async buscarProdutoVisual(): Promise<void> {
    const termo = this.buscaAdmin.value.trim();
    if (termo.length < 2) return;
    try {
      const res = await firstValueFrom(this.produtoService.buscar(termo, null));
      this.produtosBuscados.set(res);
      if (res.length === 0) this.mensaje.set({ tipo: 'error', texto: 'No se encontraron repuestos.' });
    } catch {}
  }


onArchivoProducto(event: Event): void {
  const files = (event.target as HTMLInputElement).files;
  if (!files || files.length === 0) return;

  const novos = Array.from(files).map(file => ({
    url: URL.createObjectURL(file),
    file: file,
    isNew: true
  }));

  this.galeriaAdmin.update(g => [...g, ...novos]);

  // Atualiza o preview principal se for a primeira foto
  if (this.galeriaAdmin().length > 0 && !this.previewProducto) {
     this.previewProducto = this.galeriaAdmin()[0].url;
  }
}

removerFotoGaleria(index: number) {
   this.galeriaAdmin.update(g => g.filter((_, i) => i !== index));
   this.previewProducto = this.galeriaAdmin().length > 0 ? this.construirUrl(this.galeriaAdmin()[0].url) : null;
}

construirUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return environment.apiUrl.replace('/api/produtos/buscar', '') + url;
}

async selecionarParaEditar(p: Produto): Promise<void> {
    this.modoEdicion.set(true);
    this.produtosBuscados.set([]);
    this.mensaje.set(null);

    this.manualCodigo.setValue(p.codigoInterno);
    this.manualCodigo.disable(); // Bloqueia o código para não corromper o banco
    this.manualNombre.setValue(p.nomePeca);
    this.manualMarca.setValue(p.marcaPrincipal || '');
    this.manualPreco.setValue(p.preco);
    this.manualEstoque.setValue(p.quantidadeEstoque);
    this.manualCategoria.setValue(p.categoria || 'alternadores');

    // Carrega as tabelas de aplicações e códigos OEM
    this.aplicacoes.set(p.aplicacoesVeiculo ? JSON.parse(JSON.stringify(p.aplicacoesVeiculo)) : []);
    this.codigosOem.set(p.codigosCruzados ? JSON.parse(JSON.stringify(p.codigosCruzados)) : []);

    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const prod = contenido.productos[p.codigoInterno.toUpperCase()];
      this.descripcionProducto.setValue(prod?.descripcion ?? '');
      
      // Carrega a Galeria de Imagens
      const urlList: { url: string; isNew: boolean }[] = [];
      if (prod?.imagenes && prod.imagenes.length > 0) {
         prod.imagenes.forEach(img => urlList.push({ url: img, isNew: false }));
      } else if (prod?.imagen) { 
         // Retrocompatibilidade para fotos antigas
         urlList.push({ url: prod.imagen, isNew: false });
      }
      
      this.galeriaAdmin.set(urlList);
      this.previewProducto = urlList.length > 0 ? this.construirUrl(urlList[0].url) : null;
      this.archivoProducto = null;
    } catch {}
  }

  cancelarEdicion(): void {
    this.modoEdicion.set(false);
    this.manualCodigo.enable();
    this.manualCodigo.reset();
    this.manualNombre.reset();
    this.manualMarca.reset();
    this.manualPreco.reset();
    this.manualEstoque.setValue(1);
    this.descripcionProducto.reset();
    
    this.archivoProducto = null;
    this.previewProducto = null;
    this.imagenActualProducto = null;
    
    this.produtosBuscados.set([]);
    this.buscaAdmin.reset();
    
    // Esvazia as tabelas e a galeria
    this.aplicacoes.set([]);
    this.codigosOem.set([]);
    this.galeriaAdmin.set([]);
  }

  async guardarProducto(): Promise<void> {
    if (this.manualNombre.invalid || this.manualPreco.invalid || (!this.modoEdicion() && this.manualCodigo.invalid)) {
      this.mensaje.set({ tipo: 'error', texto: 'Llene los campos obligatorios.' }); 
      return;
    }
    this.guardando.set(true);
    this.mensaje.set(null);
    
    try {
      const codigoStr = this.manualCodigo.getRawValue().trim().toUpperCase();
      
      // Monta o objeto completo incluindo as tabelas
      const novoProduto = {
        codigoInterno: codigoStr,
        nomePeca: this.manualNombre.value.trim(),
        marcaPrincipal: this.manualMarca.value?.trim() || '',
        preco: this.manualPreco.value,
        quantidadeEstoque: this.manualEstoque.value,
        categoria: this.manualCategoria.value,
        aplicacoesVeiculo: this.aplicacoes(), 
        codigosCruzados: this.codigosOem()    
      };

      // 1. Salva os dados básicos e arrays MySQL no back-end
      await firstValueFrom(this.http.post(environment.apiUrl.replace('/buscar', '/manual'), novoProduto));

      // 2. Processa a Galeria (Faz o upload apenas de fotos recém-adicionadas)
      const urlsFinais: string[] = [];
      for (let i = 0; i < this.galeriaAdmin().length; i++) {
         const item = this.galeriaAdmin()[i];
         if (item.isNew && item.file) {
           const idRandom = codigoStr + '-' + Date.now() + '-' + i;
           const urlSalva = await firstValueFrom(this.adminApi.subirImagen('productos', idRandom, item.file));
           urlsFinais.push(urlSalva);
         } else {
           urlsFinais.push(item.url); 
         }
      }

      const imagenPrincipal = urlsFinais.length > 0 ? urlsFinais[0] : null;

      // 3. Salva a galeria e a descrição no arquivo JSON
      await firstValueFrom(this.adminApi.guardarProducto(codigoStr, { 
        descripcion: this.descripcionProducto.value.trim(), 
        imagen: imagenPrincipal ?? undefined,
        imagenes: urlsFinais
      }));

      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: this.modoEdicion() ? 'Producto actualizado!' : 'Producto creado!' });
      
      if (!this.modoEdicion()) this.cancelarEdicion();
      
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al guardar el producto.' });
    } finally {
      this.guardando.set(false);
    }
  }

  async eliminarProducto(): Promise<void> {
    if (!confirm(' ATENCIÓN: ¿Estás seguro que deseas eliminar esta pieza de forma permanente?')) return;
    this.guardando.set(true);
    try {
      const codigo = this.manualCodigo.getRawValue().trim().toUpperCase();
      await firstValueFrom(this.adminApi.eliminarProducto(codigo));
      this.mensaje.set({ tipo: 'ok', texto: 'Pieza eliminada correctamente.' });
      this.cancelarEdicion();
      await this.catalogo.recargar();
    } catch {
      this.mensaje.set({ tipo: 'error', texto: 'Error al eliminar la pieza.' });
    } finally {
      this.guardando.set(false);
    }
  }

  // ==========================================
  // CSV e BANNERS (Mantidos intactos)
  // ==========================================
  archivoCsv: File | null = null;
  onArchivoCsv(e: Event) { this.archivoCsv = (e.target as HTMLInputElement).files?.[0] || null; }
  
  async subirCsv() {
    if (!this.archivoCsv) return;
    this.guardando.set(true);
    try {
      const res = await firstValueFrom(this.adminApi.importarCsv(this.archivoCsv));
      this.mensaje.set({ tipo: 'ok', texto: `Importados: ${res.importados} | Actualizados: ${res.atualizados}` });
      this.archivoCsv = null;
    } catch (e: any) { this.mensaje.set({ tipo: 'error', texto: e.error?.erro || 'Error CSV.' }); }
    finally { this.guardando.set(false); }
  }

  async cargarBanners() {
    try {
      const contenido = await firstValueFrom(this.adminApi.obtenerContenido());
      const sec = contenido.secciones['BANNERS_HOME'];
      if (sec?.descripcion) this.banners.set(JSON.parse(sec.descripcion));
    } catch {}
  }

  async subirBanner(event: Event, tipo: 'imagen' | 'video') {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.guardando.set(true);
    try {
      const id = 'banner-' + Date.now();
      const url = await firstValueFrom(this.adminApi.subirImagen('secciones', id, file));
      const novos = [...this.banners(), { id, tipo, url }];
      await firstValueFrom(this.adminApi.guardarSeccion('BANNERS_HOME', { descripcion: JSON.stringify(novos) }));
      this.banners.set(novos);
      await this.catalogo.recargar();
      this.mensaje.set({ tipo: 'ok', texto: 'Banner añadido!' });
    } catch { this.mensaje.set({ tipo: 'error', texto: 'Error.' }); } 
    finally { this.guardando.set(false); }
  }

  async eliminarBanner(id: string) {
    const novos = this.banners().filter(b => b.id !== id);
    this.guardando.set(true);
    try {
      await firstValueFrom(this.adminApi.guardarSeccion('BANNERS_HOME', { descripcion: JSON.stringify(novos) }));
      this.banners.set(novos);
      await this.catalogo.recargar();
    } finally { this.guardando.set(false); }
  }

  agregarAplicacao() { this.aplicacoes.update(a => [...a, { montadora: '', veiculo: '', anoInicio: null, anoFim: null }]); }
removerAplicacao(idx: number) { this.aplicacoes.update(a => a.filter((_, i) => i !== idx)); }
actualizarAplicacao(idx: number, campo: keyof AplicacaoVeiculo, valor: any) {
  this.aplicacoes.update(a => { const newA = [...a]; newA[idx] = { ...newA[idx], [campo]: valor }; return newA; });
}

agregarCodigo() { this.codigosOem.update(c => [...c, { marcaFabricante: '', codigo: '' }]); }
removerCodigo(idx: number) { this.codigosOem.update(c => c.filter((_, i) => i !== idx)); }
actualizarCodigo(idx: number, campo: keyof CodigoCruzado, valor: any) {
  this.codigosOem.update(c => { const newC = [...c]; newC[idx] = { ...newC[idx], [campo]: valor }; return newC; });
}
}