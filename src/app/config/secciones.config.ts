export interface SeccionCatalogo {
  id: string;
  nombre: string;
  icono: string;
  palabrasClave: string[];
}

export const SECCIONES_CATALOGO: SeccionCatalogo[] = [
  { id: 'lampadas', nombre: 'Lámparas', icono: 'fa-regular fa-lightbulb', palabrasClave: ['lampada', 'lámpara', 'luz', 'bulbo'] },
  { id: 'lanternas', nombre: 'Lanternas', icono: 'fa-solid fa-car-side', palabrasClave: ['lanterna', 'farol'] },
  { id: 'reguladores', nombre: 'Reguladores', icono: 'fa-solid fa-microchip', palabrasClave: ['regulador'] },
  { id: 'rectificador', nombre: 'Rectificador', icono: 'fa-solid fa-plug-circle-bolt', palabrasClave: ['rectificador', 'diodo'] },
  { id: 'placa', nombre: 'Placa', icono: 'fa-solid fa-server', palabrasClave: ['placa', 'tarjeta'] },
  { id: 'chicotes', nombre: 'Chicotes', icono: 'fa-solid fa-network-wired', palabrasClave: ['chicote', 'cable', 'arnés'] },
  { id: 'alternadores', nombre: 'Alternadores', icono: 'fa-solid fa-bolt', palabrasClave: ['alternador'] },
  { id: 'arranques', nombre: 'Arranques', icono: 'fa-solid fa-car-battery', palabrasClave: ['arranque', 'motor de arranque', 'burro'] },
  { id: 'porta-carvao', nombre: 'Porta Carbón', icono: 'fa-solid fa-ring', palabrasClave: ['porta carvao', 'carbon'] },
  { id: 'resistencia', nombre: 'Resistencia', icono: 'fa-solid fa-wave-square', palabrasClave: ['resistencia', 'resistor'] },
  { id: 'bendix', nombre: 'Bendix', icono: 'fa-solid fa-gear', palabrasClave: ['bendix', 'impulsor'] },
  { id: 'planetarios', nombre: 'Planetarios', icono: 'fa-solid fa-cogs', palabrasClave: ['planetario', 'engranaje'] },
  { id: 'solenoides', nombre: 'Solenoides', icono: 'fa-solid fa-magnet', palabrasClave: ['solenoide', 'rele', 'relé'] },
  { id: 'mancais', nombre: 'Mancais', icono: 'fa-regular fa-circle-dot', palabrasClave: ['mancal', 'cojinete', 'rolamento'] },
  { id: 'acessorios', nombre: 'Accesorios', icono: 'fa-solid fa-toolbox', palabrasClave: ['accesorio'] },
];

export function obtenerSeccion(id: string | null): SeccionCatalogo | undefined {
  if (!id) return undefined;
  return SECCIONES_CATALOGO.find((s) => s.id === id);
}