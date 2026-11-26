export interface PreguntaFormulario {
  id?: number;
  clave: string;
  etiqueta: string;
  tipo: 'text' | 'number' | 'datetime' | 'select' | 'toggle' | 'file';
  opciones: string[];
  placeholder: string;
  requerido: boolean;
  orden: number;
  activa: boolean;
  es_base: boolean;
}

export interface LecturaFertirriego {
  id?: number;
  fecha_hora_lectura: string;
  nombre_parcela: string;
  variedad_arandano: string;
  temperatura_ambiente: string;
  codigo_sensor: string;
  estado_equipo: 'Activo' | 'Inactivo';
  fecha_hora_fertirriego: string;
  lectura_humedad: number;
  estado_riego: string;
  foto_evidencia_url: string | null;
  respuestas_extra?: Record<string, string | number | null>;
  creado_en?: string;
}
