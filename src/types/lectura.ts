export interface LecturaFertirriego {
  id?: number;
  fecha_hora_lectura: string;
  nombre_parcela: 'Parcela A' | 'Parcela B' | 'Parcela C';
  variedad_arandano: string;
  temperatura_ambiente: 'Ola de calor' | 'Templado' | 'Frío';
  codigo_sensor: string;
  estado_equipo: 'Activo' | 'Inactivo';
  fecha_hora_fertirriego: string;
  lectura_humedad: number;
  estado_riego: 'Óptimo' | 'Alerta' | 'Estrés hídrico';
  foto_evidencia_url: string | null;
  creado_en?: string;
}