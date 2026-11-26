import { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { PreguntaFormulario } from '../types/lectura';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Trash2,
  Check,
  Loader2,
  Eye,
  EyeOff,
  ListChecks,
} from 'lucide-react';

interface Props {
  preguntas: PreguntaFormulario[];
  onActualizarPreguntas: () => Promise<void> | void;
}

type TipoNuevaPregunta = 'text' | 'number' | 'datetime' | 'select' | 'toggle';

const ETIQUETAS_TIPO: Record<PreguntaFormulario['tipo'], string> = {
  text: 'Texto corto',
  number: 'Número',
  datetime: 'Fecha y Hora',
  select: 'Lista desplegable',
  toggle: 'Botones de opción',
  file: 'Archivo / Foto',
};

const parseOpciones = (texto: string): string[] =>
  texto
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

interface PreguntaCardProps {
  pregunta: PreguntaFormulario;
  indice: number;
  total: number;
  guardandoId: number | null;
  onGuardarTexto: (
    pregunta: PreguntaFormulario,
    cambios: { etiqueta: string; placeholder: string; opciones: string[] }
  ) => Promise<void>;
  onActualizarCampo: (
    pregunta: PreguntaFormulario,
    cambios: Partial<PreguntaFormulario>
  ) => Promise<void>;
  onMoverOrden: (indice: number, direccion: -1 | 1) => Promise<void>;
  onEliminar: (pregunta: PreguntaFormulario) => Promise<void>;
}

function PreguntaCard({
  pregunta,
  indice,
  total,
  guardandoId,
  onGuardarTexto,
  onActualizarCampo,
  onMoverOrden,
  onEliminar,
}: PreguntaCardProps) {
  const [etiqueta, setEtiqueta] = useState(pregunta.etiqueta);
  const [placeholder, setPlaceholder] = useState(pregunta.placeholder);
  const [opcionesTexto, setOpcionesTexto] = useState(pregunta.opciones.join(', '));

  const tieneOpciones = pregunta.tipo === 'select' || pregunta.tipo === 'toggle';
  const opcionesActuales = tieneOpciones ? parseOpciones(opcionesTexto) : [];
  const hayCambiosTexto =
    etiqueta.trim() !== pregunta.etiqueta ||
    placeholder.trim() !== pregunta.placeholder ||
    (tieneOpciones && opcionesActuales.join('|') !== pregunta.opciones.join('|'));

  const ocupado = guardandoId === pregunta.id;

  const guardarBorrador = async () => {
    if (!hayCambiosTexto || !etiqueta.trim()) return;
    await onGuardarTexto(pregunta, {
      etiqueta: etiqueta.trim(),
      placeholder: placeholder.trim(),
      opciones: tieneOpciones ? opcionesActuales : [],
    });
  };

  return (
    <div
      className={`rounded-2xl border p-5 transition shadow-sm ${
        pregunta.activa
          ? 'bg-white border-slate-200'
          : 'bg-slate-50 border-slate-200/80 opacity-70'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
            {indice + 1}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
            {ETIQUETAS_TIPO[pregunta.tipo]}
          </span>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              pregunta.es_base
                ? 'bg-slate-100 text-slate-600'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {pregunta.es_base ? 'Campo base' : 'Personalizada'}
          </span>
          <code className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-0.5 rounded">
            {pregunta.clave}
          </code>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={indice === 0 || ocupado}
            onClick={() => void onMoverOrden(indice, -1)}
            title="Subir orden"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={indice === total - 1 || ocupado}
            onClick={() => void onMoverOrden(indice, 1)}
            title="Bajar orden"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void onActualizarCampo(pregunta, { activa: !pregunta.activa })}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition ${
              pregunta.activa
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
            }`}
          >
            {pregunta.activa ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {pregunta.activa ? 'Activa' : 'Oculta'}
          </button>
          {!pregunta.es_base && (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void onEliminar(pregunta)}
              title="Eliminar pregunta"
              className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Texto de la pregunta
          </label>
          <input
            type="text"
            value={etiqueta}
            onChange={(e) => setEtiqueta(e.target.value)}
            onBlur={() => void guardarBorrador()}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Placeholder / Ayuda
          </label>
          <input
            type="text"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            onBlur={() => void guardarBorrador()}
            placeholder="Texto de ayuda opcional"
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {tieneOpciones && (
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Opciones (separadas por coma)
            </label>
            <input
              type="text"
              value={opcionesTexto}
              onChange={(e) => setOpcionesTexto(e.target.value)}
              onBlur={() => void guardarBorrador()}
              placeholder="Opción 1, Opción 2, Opción 3"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={pregunta.requerido}
            disabled={ocupado}
            onChange={(e) =>
              void onActualizarCampo(pregunta, { requerido: e.target.checked })
            }
            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="font-medium">Campo obligatorio</span>
        </label>

        {hayCambiosTexto && (
          <button
            type="button"
            disabled={ocupado || !etiqueta.trim()}
            onClick={() => void guardarBorrador()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition disabled:opacity-50"
          >
            {ocupado ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Guardar cambios
          </button>
        )}
      </div>
    </div>
  );
}

export default function FormBuilder({ preguntas, onActualizarPreguntas }: Props) {
  const [etiquetaNueva, setEtiquetaNueva] = useState('');
  const [tipoNuevo, setTipoNuevo] = useState<TipoNuevaPregunta>('text');
  const [opcionesNuevas, setOpcionesNuevas] = useState('');
  const [placeholderNuevo, setPlaceholderNuevo] = useState('');
  const [requeridoNuevo, setRequeridoNuevo] = useState(false);
  const [creando, setCreando] = useState(false);
  const [guardandoId, setGuardandoId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const preguntasOrdenadas = [...preguntas].sort((a, b) => a.orden - b.orden);
  const requiereOpcionesNueva = tipoNuevo === 'select' || tipoNuevo === 'toggle';

  const handleAgregarPregunta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!etiquetaNueva.trim()) return;

    const opciones = requiereOpcionesNueva ? parseOpciones(opcionesNuevas) : [];
    if (requiereOpcionesNueva && opciones.length === 0) {
      setErrorMsg('Ingresa al menos una opción separada por coma para este tipo de pregunta.');
      return;
    }

    setCreando(true);
    setErrorMsg(null);

    try {
      const siguienteOrden =
        preguntasOrdenadas.length > 0
          ? Math.max(...preguntasOrdenadas.map((p) => p.orden)) + 1
          : 1;

      const nuevaPregunta: Omit<PreguntaFormulario, 'id'> = {
        clave: `campo_${Date.now()}`,
        etiqueta: etiquetaNueva.trim(),
        tipo: tipoNuevo,
        opciones,
        placeholder: placeholderNuevo.trim(),
        requerido: requeridoNuevo,
        orden: siguienteOrden,
        activa: true,
        es_base: false,
      };

      const { error } = await supabase.from('preguntas_formulario').insert([nuevaPregunta]);
      if (error) throw error;

      setEtiquetaNueva('');
      setTipoNuevo('text');
      setOpcionesNuevas('');
      setPlaceholderNuevo('');
      setRequeridoNuevo(false);
      await onActualizarPreguntas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo agregar la pregunta.');
    } finally {
      setCreando(false);
    }
  };

  const handleActualizarCampo = async (
    pregunta: PreguntaFormulario,
    cambios: Partial<PreguntaFormulario>
  ) => {
    if (!pregunta.id) return;
    setGuardandoId(pregunta.id);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('preguntas_formulario')
        .update(cambios)
        .eq('id', pregunta.id);
      if (error) throw error;
      await onActualizarPreguntas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo actualizar la pregunta.');
    } finally {
      setGuardandoId(null);
    }
  };

  const handleGuardarTexto = async (
    pregunta: PreguntaFormulario,
    cambios: { etiqueta: string; placeholder: string; opciones: string[] }
  ) => {
    await handleActualizarCampo(pregunta, cambios);
  };

  const handleMoverOrden = async (indice: number, direccion: -1 | 1) => {
    const destino = indice + direccion;
    if (destino < 0 || destino >= preguntasOrdenadas.length) return;

    const actual = preguntasOrdenadas[indice];
    const vecina = preguntasOrdenadas[destino];
    if (!actual.id || !vecina.id) return;

    const ordenActual = actual.orden === vecina.orden ? indice + 1 : actual.orden;
    const ordenVecina = actual.orden === vecina.orden ? destino + 1 : vecina.orden;

    setGuardandoId(actual.id);
    setErrorMsg(null);

    try {
      const [res1, res2] = await Promise.all([
        supabase
          .from('preguntas_formulario')
          .update({ orden: ordenVecina })
          .eq('id', actual.id),
        supabase
          .from('preguntas_formulario')
          .update({ orden: ordenActual })
          .eq('id', vecina.id),
      ]);

      if (res1.error) throw res1.error;
      if (res2.error) throw res2.error;
      await onActualizarPreguntas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo reordenar la pregunta.');
    } finally {
      setGuardandoId(null);
    }
  };

  const handleEliminar = async (pregunta: PreguntaFormulario) => {
    if (!pregunta.id || pregunta.es_base) return;
    if (!confirm(`¿Seguro que deseas eliminar la pregunta "${pregunta.etiqueta}"?`)) return;

    setGuardandoId(pregunta.id);
    setErrorMsg(null);

    try {
      const { error } = await supabase
        .from('preguntas_formulario')
        .delete()
        .eq('id', pregunta.id);
      if (error) throw error;
      await onActualizarPreguntas();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo eliminar la pregunta.');
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800">Agregar Nueva Pregunta</h2>
            <p className="text-xs text-slate-500">
              Personaliza la encuesta de campo en tiempo real
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleAgregarPregunta} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Texto de la pregunta *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Conductividad eléctrica (CE)"
                value={etiquetaNueva}
                onChange={(e) => setEtiquetaNueva(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tipo de respuesta *
              </label>
              <select
                value={tipoNuevo}
                onChange={(e) => setTipoNuevo(e.target.value as TipoNuevaPregunta)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="text">Texto corto</option>
                <option value="number">Número</option>
                <option value="datetime">Fecha y Hora</option>
                <option value="select">Lista desplegable</option>
                <option value="toggle">Botones de opción</option>
              </select>
            </div>

            {requiereOpcionesNueva && (
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Opciones separadas por coma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Baja, Media, Alta"
                  value={opcionesNuevas}
                  onChange={(e) => setOpcionesNuevas(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Placeholder
              </label>
              <input
                type="text"
                placeholder="Ej: 1.8 mS/cm"
                value={placeholderNuevo}
                onChange={(e) => setPlaceholderNuevo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requeridoNuevo}
                  onChange={(e) => setRequeridoNuevo(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="font-medium">Respuesta obligatoria</span>
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={creando}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-60"
          >
            {creando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Agregar Pregunta
          </button>
        </form>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-base font-bold text-slate-800">
            Preguntas del Formulario ({preguntasOrdenadas.length})
          </h3>
          <span className="text-xs text-slate-500">
            Activas: {preguntasOrdenadas.filter((p) => p.activa).length}
          </span>
        </div>

        {preguntasOrdenadas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-400">
            No hay preguntas registradas en la tabla preguntas_formulario.
          </div>
        ) : (
          preguntasOrdenadas.map((pregunta, indice) => (
            <PreguntaCard
              key={pregunta.id ?? pregunta.clave}
              pregunta={pregunta}
              indice={indice}
              total={preguntasOrdenadas.length}
              guardandoId={guardandoId}
              onGuardarTexto={handleGuardarTexto}
              onActualizarCampo={handleActualizarCampo}
              onMoverOrden={handleMoverOrden}
              onEliminar={handleEliminar}
            />
          ))
        )}
      </div>
    </div>
  );
}
