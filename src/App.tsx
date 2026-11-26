import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { LecturaFertirriego, PreguntaFormulario } from './types/lectura';
import EncuestaForm from './components/EncuestaForm';
import FormBuilder from './components/FormBuilder';
import {
  Database,
  FileSpreadsheet,
  SlidersHorizontal,
  Search,
  Edit2,
  Trash2,
  Droplets,
  AlertTriangle,
  CheckCircle,
  Eye,
  X,
  Download,
} from 'lucide-react';

const PARCELAS_DEFAULT = ['Parcela A', 'Parcela B', 'Parcela C'];
const ESTADOS_RIEGO_DEFAULT = ['Óptimo', 'Alerta', 'Estrés hídrico'];

const formatearFechaTabla = (valor: unknown): string => {
  if (!valor) return '—';
  const fecha = new Date(String(valor));
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const obtenerValorCelda = (
  item: LecturaFertirriego,
  pregunta: PreguntaFormulario
): string | number | null | undefined => {
  if (pregunta.es_base) {
    const val = item[pregunta.clave as keyof LecturaFertirriego];
    if (typeof val === 'object') return null;
    return val;
  }
  return item.respuestas_extra?.[pregunta.clave];
};

export default function App() {
  const esRutaAdmin = window.location.pathname.toLowerCase().startsWith('/admin');

  const [vista, setVista] = useState<'encuesta' | 'basedatos' | 'editor'>(
    esRutaAdmin ? 'basedatos' : 'encuesta'
  );
  const [preguntas, setPreguntas] = useState<PreguntaFormulario[]>([]);
  const [cargandoPreguntas, setCargandoPreguntas] = useState(true);
  const [lecturas, setLecturas] = useState<LecturaFertirriego[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroParcela, setFiltroParcela] = useState('Todas');
  const [filtroRiego, setFiltroRiego] = useState('Todos');
  const [registroEditar, setRegistroEditar] = useState<LecturaFertirriego | null>(null);
  const [fotoModal, setFotoModal] = useState<string | null>(null);

  const cargarPreguntas = async () => {
    const { data, error } = await supabase
      .from('preguntas_formulario')
      .select('*')
      .order('orden', { ascending: true });

    if (!error && data) {
      setPreguntas(data);
    }
    setCargandoPreguntas(false);
  };

  const cargarLecturas = async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('lecturas_fertirriego')
      .select('*')
      .order('id', { ascending: false });

    if (!error && data) {
      setLecturas(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    let activo = true;

    const inicializar = async () => {
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas_formulario')
        .select('*')
        .order('orden', { ascending: true });

      if (!activo) return;

      if (!preguntasError && preguntasData) {
        setPreguntas(preguntasData);
      }
      setCargandoPreguntas(false);

      if (esRutaAdmin) {
        const { data: lecturasData, error: lecturasError } = await supabase
          .from('lecturas_fertirriego')
          .select('*')
          .order('id', { ascending: false });

        if (!activo) return;

        if (!lecturasError && lecturasData) {
          setLecturas(lecturasData);
        }
        setCargando(false);
      }
    };

    void inicializar();

    return () => {
      activo = false;
    };
  }, [esRutaAdmin]);

  const handleEliminar = async (id?: number) => {
    if (!id || !confirm('¿Seguro que deseas eliminar este registro?')) return;
    const { error } = await supabase.from('lecturas_fertirriego').delete().eq('id', id);
    if (!error) {
      await cargarLecturas();
    }
  };

  const handleEditar = (item: LecturaFertirriego) => {
    setRegistroEditar(item);
    setVista('encuesta');
  };

  const handleExportarExcel = async () => {
    const { exportarExcelProfesional } = await import('./utils/exportarExcel');
    await exportarExcelProfesional(lecturasFiltradas, preguntas);
  };

  if (!esRutaAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="bg-indigo-950 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Agro Control</h1>
              <p className="text-xs text-indigo-300">Registro de Lecturas y Fertirriego en Campo</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {cargandoPreguntas ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
              Cargando formulario...
            </div>
          ) : (
            <EncuestaForm
              key="trabajador-nuevo"
              preguntas={preguntas}
              registroEditar={null}
              onGuardado={() => {}}
              onCancelarEdicion={() => {}}
            />
          )}
        </main>
      </div>
    );
  }

  const preguntasActivas = [...preguntas]
    .filter((p) => p.activa)
    .sort((a, b) => a.orden - b.orden);

  const opcionesParcela =
    preguntas.find((p) => p.clave === 'nombre_parcela')?.opciones ?? PARCELAS_DEFAULT;
  const opcionesRiego =
    preguntas.find((p) => p.clave === 'estado_riego')?.opciones ?? ESTADOS_RIEGO_DEFAULT;

  const lecturasFiltradas = lecturas.filter((item) => {
    const termino = busqueda.toLowerCase();
    const coincideExtra = Object.values(item.respuestas_extra ?? {}).some(
      (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(termino)
    );
    const coincideTexto =
      (item.codigo_sensor ?? '').toLowerCase().includes(termino) ||
      (item.variedad_arandano ?? '').toLowerCase().includes(termino) ||
      coincideExtra;
    const coincideParcela = filtroParcela === 'Todas' || item.nombre_parcela === filtroParcela;
    const coincideRiego = filtroRiego === 'Todos' || item.estado_riego === filtroRiego;
    return coincideTexto && coincideParcela && coincideRiego;
  });

  const totalAlertas = lecturas.filter((l) => l.estado_riego !== 'Óptimo').length;
  const sensoresActivos = lecturas.filter((l) => l.estado_equipo === 'Activo').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-indigo-950 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Agro Control — Admin</h1>
              <p className="text-xs text-indigo-300">
                Control de Humedad y Fertirriego en Arándanos
              </p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 bg-indigo-900/70 p-1 rounded-xl">
            <button
              onClick={() => {
                setRegistroEditar(null);
                setVista('encuesta');
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                vista === 'encuesta'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" /> Encuesta
            </button>
            <button
              onClick={() => setVista('basedatos')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                vista === 'basedatos'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4" /> Base de Datos
            </button>
            <button
              onClick={() => setVista('editor')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                vista === 'editor'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-indigo-200 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Editor de Formulario
            </button>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {vista === 'encuesta' ? (
          cargandoPreguntas ? (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-400">
              Cargando formulario...
            </div>
          ) : (
            <EncuestaForm
              key={registroEditar?.id ?? 'nuevo'}
              preguntas={preguntas}
              registroEditar={registroEditar}
              onGuardado={() => {
                setRegistroEditar(null);
                void cargarLecturas();
                setVista('basedatos');
              }}
              onCancelarEdicion={() => {
                setRegistroEditar(null);
                setVista('basedatos');
              }}
            />
          )
        ) : vista === 'editor' ? (
          <FormBuilder preguntas={preguntas} onActualizarPreguntas={cargarPreguntas} />
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Total Registros</p>
                  <p className="text-2xl font-bold text-slate-800 mt-1">{lecturas.length}</p>
                </div>
                <Database className="w-8 h-8 text-indigo-500 opacity-80" />
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">Equipos Activos</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{sensoresActivos}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-emerald-500 opacity-80" />
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase">
                    Alertas / Estrés Hídrico
                  </p>
                  <p className="text-2xl font-bold text-rose-600 mt-1">{totalAlertas}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-rose-500 opacity-80" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 justify-between">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    placeholder="Buscar por sensor, variedad o campo extra..."
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <select
                  value={filtroParcela}
                  onChange={(e) => setFiltroParcela(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                >
                  <option value="Todas">Todas las Parcelas</option>
                  {opcionesParcela.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
                <select
                  value={filtroRiego}
                  onChange={(e) => setFiltroRiego(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                >
                  <option value="Todos">Todos los Estados</option>
                  {opcionesRiego.map((opcion) => (
                    <option key={opcion} value={opcion}>
                      {opcion}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => void handleExportarExcel()}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
              >
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs uppercase">
                    {preguntasActivas.map((pregunta) => (
                      <th
                        key={pregunta.id ?? pregunta.clave}
                        className={`py-3.5 px-4 whitespace-nowrap ${
                          pregunta.tipo === 'file' ? 'text-center' : ''
                        }`}
                      >
                        {pregunta.etiqueta}
                      </th>
                    ))}
                    <th className="py-3.5 px-4 text-right whitespace-nowrap">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargando || cargandoPreguntas ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, preguntasActivas.length + 1)}
                        className="py-10 text-center text-slate-400"
                      >
                        Cargando registros...
                      </td>
                    </tr>
                  ) : lecturasFiltradas.length === 0 ? (
                    <tr>
                      <td
                        colSpan={Math.max(1, preguntasActivas.length + 1)}
                        className="py-10 text-center text-slate-400"
                      >
                        No se encontraron registros
                      </td>
                    </tr>
                  ) : (
                    lecturasFiltradas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        {preguntasActivas.map((pregunta) => {
                          const raw = obtenerValorCelda(item, pregunta);

                          if (pregunta.tipo === 'file' || pregunta.clave === 'foto_evidencia_url') {
                            const url = typeof raw === 'string' && raw ? raw : null;
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 text-center whitespace-nowrap"
                              >
                                {url ? (
                                  <button
                                    onClick={() => setFotoModal(url)}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg"
                                  >
                                    <Eye className="w-3.5 h-3.5" /> Ver
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">Sin foto</span>
                                )}
                              </td>
                            );
                          }

                          if (pregunta.tipo === 'datetime') {
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 whitespace-nowrap text-xs text-slate-600"
                              >
                                {formatearFechaTabla(raw)}
                              </td>
                            );
                          }

                          if (pregunta.clave === 'nombre_parcela') {
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 font-semibold text-indigo-900 whitespace-nowrap"
                              >
                                {raw ?? '—'}
                              </td>
                            );
                          }

                          if (pregunta.clave === 'codigo_sensor') {
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 whitespace-nowrap font-mono font-semibold text-xs"
                              >
                                {raw ?? '—'}
                              </td>
                            );
                          }

                          if (pregunta.clave === 'estado_equipo') {
                            const activo = raw === 'Activo';
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 whitespace-nowrap"
                              >
                                <span
                                  className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium ${
                                    activo
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {raw ?? '—'}
                                </span>
                              </td>
                            );
                          }

                          if (pregunta.clave === 'lectura_humedad') {
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap"
                              >
                                {raw !== null && raw !== undefined ? `${raw}%` : '—'}
                              </td>
                            );
                          }

                          if (pregunta.clave === 'estado_riego') {
                            const claseBadge =
                              raw === 'Óptimo'
                                ? 'bg-emerald-100 text-emerald-700'
                                : raw === 'Alerta'
                                ? 'bg-amber-100 text-amber-700'
                                : raw === 'Estrés hídrico'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-indigo-100 text-indigo-700';
                            return (
                              <td
                                key={pregunta.id ?? pregunta.clave}
                                className="py-3 px-4 whitespace-nowrap"
                              >
                                <span
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${claseBadge}`}
                                >
                                  {raw ?? '—'}
                                </span>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={pregunta.id ?? pregunta.clave}
                              className="py-3 px-4 whitespace-nowrap text-slate-700"
                            >
                              {raw !== null && raw !== undefined && raw !== '' ? String(raw) : '—'}
                            </td>
                          );
                        })}

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEditar(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 mr-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void handleEliminar(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {fotoModal && (
        <div
          onClick={() => setFotoModal(null)}
          className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4"
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={fotoModal}
              alt="Evidencia en campo"
              className="w-full max-h-[80vh] object-contain bg-slate-900"
            />
          </div>
        </div>
      )}
    </div>
  );
}
