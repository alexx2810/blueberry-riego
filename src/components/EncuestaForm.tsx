import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { LecturaFertirriego, PreguntaFormulario } from '../types/lectura';
import { Camera, Send, CheckCircle2, Loader2, X } from 'lucide-react';

interface Props {
  preguntas: PreguntaFormulario[];
  registroEditar: LecturaFertirriego | null;
  onGuardado: () => void;
  onCancelarEdicion: () => void;
}

const getFechaActualLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

const generarNombreArchivo = (ext: string) =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

const getValorInicialCampo = (
  pregunta: PreguntaFormulario,
  registro: LecturaFertirriego | null
): string => {
  if (registro) {
    if (pregunta.es_base) {
      const raw = registro[pregunta.clave as keyof LecturaFertirriego];
      if (raw !== undefined && raw !== null && typeof raw !== 'object') {
        if (pregunta.tipo === 'datetime') {
          return String(raw).slice(0, 16);
        }
        return String(raw);
      }
    } else if (registro.respuestas_extra && pregunta.clave in registro.respuestas_extra) {
      const extraVal = registro.respuestas_extra[pregunta.clave];
      if (extraVal !== undefined && extraVal !== null) {
        return String(extraVal);
      }
    }
  }

  if (pregunta.tipo === 'datetime') {
    return getFechaActualLocal();
  }
  if ((pregunta.tipo === 'select' || pregunta.tipo === 'toggle') && pregunta.opciones.length > 0) {
    return pregunta.opciones[0];
  }
  return '';
};

const construirValoresIniciales = (
  preguntas: PreguntaFormulario[],
  registro: LecturaFertirriego | null
): Record<string, string> => {
  const iniciales: Record<string, string> = {};
  preguntas.forEach((p) => {
    if (p.tipo !== 'file') {
      iniciales[p.clave] = getValorInicialCampo(p, registro);
    }
  });
  return iniciales;
};

const obtenerClaseToggle = (clave: string, opcion: string, seleccionado: boolean): string => {
  if (!seleccionado) {
    return 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50';
  }
  if (clave === 'estado_equipo') {
    return opcion === 'Activo'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-slate-700 text-white border-slate-700';
  }
  if (clave === 'estado_riego') {
    if (opcion === 'Óptimo') return 'bg-emerald-600 text-white border-emerald-600';
    if (opcion === 'Alerta') return 'bg-amber-500 text-white border-amber-500';
    if (opcion === 'Estrés hídrico') return 'bg-rose-600 text-white border-rose-600';
  }
  return 'bg-indigo-600 text-white border-indigo-600';
};

export default function EncuestaForm({
  preguntas,
  registroEditar,
  onGuardado,
  onCancelarEdicion,
}: Props) {
  const [valores, setValores] = useState<Record<string, string>>(() =>
    construirValoresIniciales(preguntas, registroEditar)
  );
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    () => registroEditar?.foto_evidencia_url ?? null
  );
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const preguntasActivas = [...preguntas]
    .filter((p) => p.activa)
    .sort((a, b) => a.orden - b.orden);

  const obtenerValorActual = (pregunta: PreguntaFormulario): string => {
    if (pregunta.clave in valores) {
      return valores[pregunta.clave];
    }
    return getValorInicialCampo(pregunta, registroEditar);
  };

  const actualizarValor = (clave: string, valor: string) => {
    setValores((prev) => ({ ...prev, [clave]: valor }));
  };

  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setArchivoFoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const limpiarFormulario = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setValores(construirValoresIniciales(preguntas, null));
    setArchivoFoto(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeExito(false);

    try {
      let fotoUrl = registroEditar?.foto_evidencia_url || null;

      const preguntaArchivoRequerida = preguntasActivas.find(
        (p) => p.tipo === 'file' && p.requerido
      );
      if (preguntaArchivoRequerida && !archivoFoto && !fotoUrl) {
        throw new Error(`El campo "${preguntaArchivoRequerida.etiqueta}" es obligatorio.`);
      }

      if (archivoFoto) {
        const ext = archivoFoto.name.split('.').pop() ?? 'jpg';
        const nombreArchivo = generarNombreArchivo(ext);
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(nombreArchivo, archivoFoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nombreArchivo);

        fotoUrl = urlData.publicUrl;
      }

      const respuestasExtra: Record<string, string | number | null> = {
        ...(registroEditar?.respuestas_extra ?? {}),
      };
      const payload: Record<
        string,
        string | number | null | Record<string, string | number | null>
      > = {};

      preguntasActivas.forEach((pregunta) => {
        if (pregunta.tipo === 'file' || pregunta.clave === 'foto_evidencia_url') {
          if (pregunta.es_base) {
            payload[pregunta.clave] = fotoUrl;
          } else {
            respuestasExtra[pregunta.clave] = fotoUrl;
          }
          return;
        }

        const valorActual = obtenerValorActual(pregunta);

        if (pregunta.es_base) {
          if (pregunta.clave === 'lectura_humedad' || pregunta.tipo === 'number') {
            const numero = parseFloat(valorActual);
            payload[pregunta.clave] = Number.isNaN(numero) ? 0 : numero;
          } else if (pregunta.clave === 'codigo_sensor') {
            payload[pregunta.clave] = valorActual.trim().toUpperCase();
          } else {
            payload[pregunta.clave] = valorActual.trim();
          }
        } else if (pregunta.tipo === 'number') {
          if (valorActual.trim() === '') {
            respuestasExtra[pregunta.clave] = null;
          } else {
            const numero = Number(valorActual);
            respuestasExtra[pregunta.clave] = Number.isNaN(numero) ? null : numero;
          }
        } else {
          respuestasExtra[pregunta.clave] = valorActual.trim() === '' ? null : valorActual.trim();
        }
      });

      payload.respuestas_extra = respuestasExtra;

      if (registroEditar?.id) {
        const { error } = await supabase
          .from('lecturas_fertirriego')
          .update(payload)
          .eq('id', registroEditar.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('lecturas_fertirriego')
          .insert([payload]);
        if (error) throw error;
      }

      setMensajeExito(true);
      limpiarFormulario();
      setTimeout(() => {
        setMensajeExito(false);
        onGuardado();
      }, 1000);
    } catch (err: unknown) {
      const mensaje = err instanceof Error ? err.message : 'Error inesperado al guardar';
      alert('Error al guardar: ' + mensaje);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {registroEditar
              ? `Editando Registro #${registroEditar.id}`
              : 'Encuesta de Lecturas y Fertirriego'}
          </h2>
          <p className="text-sm text-slate-500">Complete los datos registrados en parcela</p>
        </div>
        {registroEditar && (
          <button
            type="button"
            onClick={() => {
              limpiarFormulario();
              onCancelarEdicion();
            }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200"
          >
            <X className="w-4 h-4" /> Cancelar
          </button>
        )}
      </div>

      {mensajeExito && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-sm font-medium">
            ¡Registro guardado correctamente en la base de datos!
          </span>
        </div>
      )}

      {preguntasActivas.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">
          No hay preguntas activas configuradas en el formulario.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {preguntasActivas.map((pregunta, index) => {
              const valorActual = obtenerValorActual(pregunta);
              const esAnchoCompleto =
                pregunta.tipo === 'file' ||
                pregunta.clave === 'estado_riego' ||
                (pregunta.tipo === 'toggle' && pregunta.opciones.length > 2);

              if (pregunta.tipo === 'file') {
                return (
                  <div key={pregunta.id ?? pregunta.clave} className="md:col-span-2">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                    </label>
                    <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition overflow-hidden">
                      {previewUrl ? (
                        <img
                          src={previewUrl}
                          alt="Vista previa"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                          <Camera className="w-7 h-7 mb-1.5 text-indigo-500" />
                          <span className="text-sm font-medium">
                            {pregunta.placeholder || 'Toca para subir o tomar foto'}
                          </span>
                          <span className="text-xs text-slate-400">JPG, PNG o WEBP</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleSeleccionarFoto}
                        className="hidden"
                      />
                    </label>
                  </div>
                );
              }

              if (pregunta.tipo === 'toggle') {
                const cols =
                  pregunta.opciones.length >= 3
                    ? 'grid-cols-3'
                    : pregunta.opciones.length === 2
                    ? 'grid-cols-2'
                    : 'grid-cols-1';
                return (
                  <div
                    key={pregunta.id ?? pregunta.clave}
                    className={esAnchoCompleto ? 'md:col-span-2' : ''}
                  >
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                    </label>
                    <div className={`grid ${cols} gap-2.5`}>
                      {pregunta.opciones.map((opcion) => (
                        <button
                          key={opcion}
                          type="button"
                          onClick={() => actualizarValor(pregunta.clave, opcion)}
                          className={`py-2.5 px-2 rounded-xl text-sm font-semibold border transition ${obtenerClaseToggle(
                            pregunta.clave,
                            opcion,
                            valorActual === opcion
                          )}`}
                        >
                          {opcion}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              }

              if (pregunta.tipo === 'select') {
                const opcionesSelect =
                  valorActual && !pregunta.opciones.includes(valorActual)
                    ? [valorActual, ...pregunta.opciones]
                    : pregunta.opciones;

                return (
                  <div key={pregunta.id ?? pregunta.clave}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                    </label>
                    <select
                      required={pregunta.requerido}
                      value={valorActual}
                      onChange={(e) => actualizarValor(pregunta.clave, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      {!pregunta.requerido && pregunta.opciones.length === 0 && (
                        <option value="">Selecciona una opción</option>
                      )}
                      {opcionesSelect.map((opcion) => (
                        <option key={opcion} value={opcion}>
                          {opcion}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              if (pregunta.tipo === 'datetime') {
                return (
                  <div key={pregunta.id ?? pregunta.clave}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                    </label>
                    <input
                      type="datetime-local"
                      required={pregunta.requerido}
                      value={valorActual}
                      onChange={(e) => actualizarValor(pregunta.clave, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    />
                  </div>
                );
              }

              if (pregunta.tipo === 'number') {
                const esHumedad = pregunta.clave === 'lectura_humedad';
                return (
                  <div key={pregunta.id ?? pregunta.clave}>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                      {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min={esHumedad ? '0' : undefined}
                      max={esHumedad ? '100' : undefined}
                      required={pregunta.requerido}
                      placeholder={pregunta.placeholder}
                      value={valorActual}
                      onChange={(e) => actualizarValor(pregunta.clave, e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                );
              }

              return (
                <div key={pregunta.id ?? pregunta.clave}>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    {index + 1}. {pregunta.etiqueta} {pregunta.requerido ? '*' : ''}
                  </label>
                  <input
                    type="text"
                    required={pregunta.requerido}
                    placeholder={pregunta.placeholder}
                    value={valorActual}
                    onChange={(e) => actualizarValor(pregunta.clave, e.target.value)}
                    className={`w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${
                      pregunta.clave === 'codigo_sensor' ? 'uppercase' : ''
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-60"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {registroEditar ? 'Actualizar Registro' : 'Enviar Encuesta'}
          </button>
        </form>
      )}
    </div>
  );
}
