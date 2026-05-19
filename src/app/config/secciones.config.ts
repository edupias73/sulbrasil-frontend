export interface SeccionCatalogo {
  id: string;
  nombre: string;
  icono: string;
  palabrasClave: string[];
}

/** Slugs deben coincidir con la columna `categoria` del CSV/backend */
export const SECCIONES_CATALOGO: SeccionCatalogo[] = [
  { id: 'lampadas', nombre: 'Lámpadas', icono: '💡', palabrasClave: ['lampada', 'lámpada', 'luz', 'bulbo'] },
  { id: 'lanternas', nombre: 'Lanternas', icono: '🔦', palabrasClave: ['lanterna', 'farol'] },
  { id: 'reguladores', nombre: 'Reguladores', icono: '⚡', palabrasClave: ['regulador', 'regulador de voltaje'] },
  { id: 'rectificador', nombre: 'Rectificador', icono: '🔌', palabrasClave: ['rectificador', 'diodo'] },
  { id: 'placa', nombre: 'Placa', icono: '📟', palabrasClave: ['placa', 'tarjeta'] },
  { id: 'chicotes', nombre: 'Chicotes', icono: '🔗', palabrasClave: ['chicote', 'cable', 'arnés'] },
  { id: 'alternadores', nombre: 'Alternadores', icono: '⚙️', palabrasClave: ['alternador', 'alternator'] },
  { id: 'arranques', nombre: 'Arranques', icono: '🔧', palabrasClave: ['arranque', 'motor de arranque', 'burro'] },
  { id: 'porta-carvao', nombre: 'Porta Carbón', icono: '🪫', palabrasClave: ['porta carvao', 'porta carbón', 'carbon'] },
  { id: 'resistencia', nombre: 'Resistencia', icono: '🌡️', palabrasClave: ['resistencia', 'resistor'] },
  { id: 'bendix', nombre: 'Bendix', icono: '⚙️', palabrasClave: ['bendix', 'impulsor'] },
  { id: 'planetarios', nombre: 'Planetarios', icono: '🛞', palabrasClave: ['planetario', 'engranaje'] },
  { id: 'solenoides', nombre: 'Solenoides', icono: '🧲', palabrasClave: ['solenoide', 'rele', 'relé'] },
  { id: 'mancais', nombre: 'Mancais', icono: '🔩', palabrasClave: ['mancal', 'cojinete', 'rolamento'] },
  { id: 'acessorios', nombre: 'Accesorios', icono: '📦', palabrasClave: ['accesorio', 'acessorio'] },
];

export function obtenerSeccion(id: string | null): SeccionCatalogo | undefined {
  if (!id) return undefined;
  return SECCIONES_CATALOGO.find((s) => s.id === id);
}
