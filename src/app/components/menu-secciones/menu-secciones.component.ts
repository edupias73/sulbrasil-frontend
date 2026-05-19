import { Component, EventEmitter, Input, Output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeccionCatalogo } from '../../config/secciones.config';

@Component({
  selector: 'app-menu-secciones',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './menu-secciones.component.html',
})
export class MenuSeccionesComponent {
  @Input({ required: true }) abierto = false;
  @Input({ required: true }) secciones: SeccionCatalogo[] = [];
  @Input() seccionActiva: string | null = null;

  @Output() cerrar = new EventEmitter<void>();
  @Output() seleccionar = new EventEmitter<string | null>();

  seleccionarSeccion(id: string | null): void {
    this.seleccionar.emit(id);
    this.cerrar.emit();
  }
}
