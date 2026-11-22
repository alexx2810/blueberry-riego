import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LecturaFertirriego } from '../types/lectura';
import { Camera, Send, CheckCircle2, Loader2, X } from 'lucide-react';

interface Props {
  registroEditar: LecturaFertirriego | null;
  onGuardado: () => void;
  onCancelarEdicion: () => void;
}

const getFechaActualLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

export default function EncuestaForm({ registroEditar, onGuardado, onCancelarEdicion }: Props) {
  const [fechaLectura, setFechaLectura] = useState(getFechaActualLocal());
  const [parcela, setParcela] = useState<'Parcela A' | 'Parcela B' | 'Parcela C'>('Parcela A');
  const [variedad, setVariedad] = useState('Ventura');
  const [temperatura, setTemperatura] = useState<'Ola de calor' | 'Templado' | 'Frío'>('Templado');
  const [sensor, setSensor] = useState('');
  const [estadoEquipo, setEstadoEquipo] = useState<'Activo' | 'Inactivo'>('Activo');
  const [fechaFertirriego, setFechaFertirriego] = useState(getFechaActualLocal());
  const [humedad, setHumedad] = useState('');
  const [estadoRiego, setEstadoRiego] = useState<'Óptimo' | 'Alerta' | 'Estrés hídrico'>('Óptimo');
  const [archivoFoto, setArchivoFoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  useEffect(() => {
    if (registroEditar) {
      setFechaLectura(registroEditar.fecha_hora_lectura.slice(0, 16));
      setParcela(registroEditar.nombre_parcela);
      setVariedad(registroEditar.variedad_arandano);
      setTemperatura(registroEditar.temperatura_ambiente);
      setSensor(registroEditar.codigo_sensor);
      setEstadoEquipo(registroEditar.estado_equipo);
      setFechaFertirriego(registroEditar.fecha_hora_fertirriego.slice(0, 16));
      setHumedad(String(registroEditar.lectura_humedad));
      setEstadoRiego(registroEditar.estado_riego);
      setPreviewUrl(registroEditar.foto_evidencia_url);
      setArchivoFoto(null);
    }
  }, [registroEditar]);

  const handleSeleccionarFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setArchivoFoto(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const limpiarFormulario = () => {
    setFechaLectura(getFechaActualLocal());
    setParcela('Parcela A');
    setVariedad('Ventura');
    setTemperatura('Templado');
    setSensor('');
    setEstadoEquipo('Activo');
    setFechaFertirriego(getFechaActualLocal());
    setHumedad('');
    setEstadoRiego('Óptimo');
    setArchivoFoto(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setMensajeExito(false);

    try {
      let fotoUrl = registroEditar?.foto_evidencia_url || null;

      if (archivoFoto) {
        const ext = archivoFoto.name.split('.').pop();
        const nombreArchivo = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('evidencias')
          .upload(nombreArchivo, archivoFoto);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('evidencias')
          .getPublicUrl(nombreArchivo);

        fotoUrl = urlData.publicUrl;
      }

      const payload = {
        fecha_hora_lectura: fechaLectura,
        nombre_parcela: parcela,
        variedad_arandano: variedad.trim(),
        temperatura_ambiente: temperatura,
        codigo_sensor: sensor.trim().toUpperCase(),
        estado_equipo: estadoEquipo,
        fecha_hora_fertirriego: fechaFertirriego,
        lectura_humedad: parseFloat(humedad),
        estado_riego: estadoRiego,
        foto_evidencia_url: fotoUrl,
      };

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
    } catch (err: any) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-800">
            {registroEditar ? `Editando Registro #${registroEditar.id}` : 'Encuesta de Lecturas y Fertirriego'}
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
          <span className="text-sm font-medium">¡Registro guardado correctamente en la base de datos!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">1. Fecha y Hora de Lectura *</label>
            <input
              type="datetime-local"
              required
              value={fechaLectura}
              onChange={(e) => setFechaLectura(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">2. Nombre de Parcela *</label>
            <select
              value={parcela}
              onChange={(e) => setParcela(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Parcela A">Parcela A</option>
              <option value="Parcela B">Parcela B</option>
              <option value="Parcela C">Parcela C</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">3. Variedad de Arándano *</label>
            <select
              value={variedad}
              onChange={(e) => setVariedad(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Ventura">Ventura</option>
              <option value="Biloxi">Biloxi</option>
              <option value="Sekoya Pop">Sekoya Pop</option>
              <option value="Emerald">Emerald</option>
              <option value="Rocío">Rocío</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">4. Temperatura del Ambiente *</label>
            <select
              value={temperatura}
              onChange={(e) => setTemperatura(e.target.value as any)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="Ola de calor">Ola de calor</option>
              <option value="Templado">Templado</option>
              <option value="Frío">Frío</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">5. Código del Sensor *</label>
            <input
              type="text"
              required
              placeholder="Ej: SENS-A01"
              value={sensor}
              onChange={(e) => setSensor(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">6. Estado de Equipo *</label>
            <div className="grid grid-cols-2 gap-2.5">
              {(['Activo', 'Inactivo'] as const).map((estado) => (
                <button
                  key={estado}
                  type="button"
                  onClick={() => setEstadoEquipo(estado)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
                    estadoEquipo === estado
                      ? estado === 'Activo'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {estado}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">7. Lectura de Fertirriego (Fecha/Hora) *</label>
            <input
              type="datetime-local"
              required
              value={fechaFertirriego}
              onChange={(e) => setFechaFertirriego(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">8. Lectura de Humedad (%) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              required
              placeholder="Ej: 64.5"
              value={humedad}
              onChange={(e) => setHumedad(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">9. Estado de Riego *</label>
          <div className="grid grid-cols-3 gap-2.5">
            {(['Óptimo', 'Alerta', 'Estrés hídrico'] as const).map((est) => (
              <button
                key={est}
                type="button"
                onClick={() => setEstadoRiego(est)}
                className={`py-2.5 px-2 rounded-xl text-sm font-semibold border transition ${
                  estadoRiego === est
                    ? est === 'Óptimo'
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : est === 'Alerta'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-rose-600 text-white border-rose-600'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {est}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1.5">10. Foto de Evidencia</label>
          <label className="flex flex-col items-center justify-center w-full h-36 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition overflow-hidden">
            {previewUrl ? (
              <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-slate-500">
                <Camera className="w-7 h-7 mb-1.5 text-indigo-500" />
                <span className="text-sm font-medium">Toca para subir o tomar foto</span>
                <span className="text-xs text-slate-400">JPG, PNG o WEBP</span>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleSeleccionarFoto} className="hidden" />
          </label>
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
    </div>
  );
}