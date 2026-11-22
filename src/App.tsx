import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import type { LecturaFertirriego } from './types/lectura';
import EncuestaForm from './components/EncuestaForm';
import { exportarExcelProfesional } from './utils/exportarExcel';
import {
  Database, FileSpreadsheet, Search, Edit2, Trash2,
  Droplets, AlertTriangle, CheckCircle, Eye, X, Download, Lock, LogOut
} from 'lucide-react';

const CLAVE_ADMIN = 'sandra2026';

export default function App() {
  const esRutaAdmin = window.location.pathname.toLowerCase().startsWith('/admin');

  const [autenticado, setAutenticado] = useState<boolean>(() => {
    return sessionStorage.getItem('blueberry_admin') === 'true';
  });
  const [claveInput, setClaveInput] = useState('');
  const [errorClave, setErrorClave] = useState(false);

  const [vista, setVista] = useState<'encuesta' | 'basedatos'>(
    esRutaAdmin ? 'basedatos' : 'encuesta'
  );
  const [lecturas, setLecturas] = useState<LecturaFertirriego[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroParcela, setFiltroParcela] = useState('Todas');
  const [filtroRiego, setFiltroRiego] = useState('Todos');
  const [registroEditar, setRegistroEditar] = useState<LecturaFertirriego | null>(null);
  const [fotoModal, setFotoModal] = useState<string | null>(null);

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
    if (esRutaAdmin && autenticado) {
      cargarLecturas();
    }
  }, [esRutaAdmin, autenticado]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (claveInput === CLAVE_ADMIN) {
      sessionStorage.setItem('blueberry_admin', 'true');
      setAutenticado(true);
      setErrorClave(false);
    } else {
      setErrorClave(true);
    }
  };

  const handleCerrarSesion = () => {
    sessionStorage.removeItem('blueberry_admin');
    setAutenticado(false);
    setClaveInput('');
  };

  const handleEliminar = async (id?: number) => {
    if (!id || !confirm('¿Seguro que deseas eliminar este registro?')) return;
    const { error } = await supabase.from('lecturas_fertirriego').delete().eq('id', id);
    if (!error) cargarLecturas();
  };

  const handleEditar = (item: LecturaFertirriego) => {
    setRegistroEditar(item);
    setVista('encuesta');
  };

  // 1. MODO TRABAJADORES (Ruta raíz "/") -> Solo ven la Encuesta
  if (!esRutaAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="bg-indigo-950 text-white shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">BlueBerryRiego</h1>
              <p className="text-xs text-indigo-300">Registro de Lecturas y Fertirriego en Campo</p>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          <EncuestaForm
            registroEditar={null}
            onGuardado={() => {}}
            onCancelarEdicion={() => {}}
          />
        </main>
      </div>
    );
  }

  // 2. LOGIN DE ADMINISTRADOR (Ruta "/admin" sin sesión)
  if (!autenticado) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-white rounded-2xl shadow-md border border-slate-200 p-7">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl mb-3">
              <Lock className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Panel Administrador</h1>
            <p className="text-xs text-slate-500 mt-1">
              Ingresa la clave para acceder a la Base de Datos
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                required
                placeholder="Contraseña de acceso"
                value={claveInput}
                onChange={(e) => setClaveInput(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {errorClave && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">
                  Contraseña incorrecta. Intenta nuevamente.
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition"
            >
              Ingresar
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. PANEL COMPLETO DE ADMIN (Ruta "/admin" autenticado)
  const lecturasFiltradas = lecturas.filter((item) => {
    const coincideTexto =
      item.codigo_sensor.toLowerCase().includes(busqueda.toLowerCase()) ||
      item.variedad_arandano.toLowerCase().includes(busqueda.toLowerCase());
    const coincideParcela = filtroParcela === 'Todas' || item.nombre_parcela === filtroParcela;
    const coincideRiego = filtroRiego === 'Todos' || item.estado_riego === filtroRiego;
    return coincideTexto && coincideParcela && coincideRiego;
  });

  const totalAlertas = lecturas.filter((l) => l.estado_riego !== 'Óptimo').length;
  const sensoresActivos = lecturas.filter((l) => l.estado_equipo === 'Activo').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="bg-indigo-950 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl">
              <Droplets className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">BlueBerryRiego — Admin</h1>
              <p className="text-xs text-indigo-300">Control de Humedad y Fertirriego en Arándanos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex gap-2 bg-indigo-900/70 p-1 rounded-xl">
              <button
                onClick={() => {
                  setRegistroEditar(null);
                  setVista('encuesta');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  vista === 'encuesta' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" /> Encuesta
              </button>
              <button
                onClick={() => setVista('basedatos')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  vista === 'basedatos' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-200 hover:text-white'
                }`}
              >
                <Database className="w-4 h-4" /> Base de Datos
              </button>
            </nav>

            <button
              onClick={handleCerrarSesion}
              title="Cerrar sesión"
              className="p-2.5 rounded-xl bg-indigo-900/70 text-indigo-200 hover:text-white hover:bg-rose-600/80 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {vista === 'encuesta' ? (
          <EncuestaForm
            registroEditar={registroEditar}
            onGuardado={() => {
              setRegistroEditar(null);
              cargarLecturas();
              setVista('basedatos');
            }}
            onCancelarEdicion={() => {
              setRegistroEditar(null);
              setVista('basedatos');
            }}
          />
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
                  <p className="text-xs font-semibold text-slate-400 uppercase">Alertas / Estrés Hídrico</p>
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
                    placeholder="Buscar por sensor o variedad..."
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
                  <option value="Parcela A">Parcela A</option>
                  <option value="Parcela B">Parcela B</option>
                  <option value="Parcela C">Parcela C</option>
                </select>
                <select
                  value={filtroRiego}
                  onChange={(e) => setFiltroRiego(e.target.value)}
                  className="px-3.5 py-2 rounded-xl border border-slate-300 text-sm bg-white outline-none"
                >
                  <option value="Todos">Todos los Estados</option>
                  <option value="Óptimo">Óptimo</option>
                  <option value="Alerta">Alerta</option>
                  <option value="Estrés hídrico">Estrés hídrico</option>
                </select>
              </div>

              <button
                onClick={() => exportarExcelProfesional(lecturasFiltradas)}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition"
              >
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs uppercase">
                    <th className="py-3.5 px-4">Fecha / Hora</th>
                    <th className="py-3.5 px-4">Parcela</th>
                    <th className="py-3.5 px-4">Variedad</th>
                    <th className="py-3.5 px-4">Temp. Ambiente</th>
                    <th className="py-3.5 px-4">Sensor / Equipo</th>
                    <th className="py-3.5 px-4">Fertirriego</th>
                    <th className="py-3.5 px-4">Humedad</th>
                    <th className="py-3.5 px-4">Estado Riego</th>
                    <th className="py-3.5 px-4 text-center">Evidencia</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cargando ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">Cargando registros...</td>
                    </tr>
                  ) : lecturasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-10 text-center text-slate-400">No se encontraron registros</td>
                    </tr>
                  ) : (
                    lecturasFiltradas.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                          {new Date(item.fecha_hora_lectura).toLocaleString('es-PE', {
                            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold text-indigo-900 whitespace-nowrap">{item.nombre_parcela}</td>
                        <td className="py-3 px-4">{item.variedad_arandano}</td>
                        <td className="py-3 px-4 whitespace-nowrap">{item.temperatura_ambiente}</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-mono font-semibold text-xs">{item.codigo_sensor}</div>
                          <span className={`inline-block text-[11px] px-2 py-0.5 rounded-full font-medium mt-0.5 ${
                            item.estado_equipo === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {item.estado_equipo}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                          {new Date(item.fecha_hora_fertirriego).toLocaleString('es-PE', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-800">{item.lectura_humedad}%</td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.estado_riego === 'Óptimo'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.estado_riego === 'Alerta'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}>
                            {item.estado_riego}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.foto_evidencia_url ? (
                            <button
                              onClick={() => setFotoModal(item.foto_evidencia_url)}
                              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-lg"
                            >
                              <Eye className="w-3.5 h-3.5" /> Ver
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400">Sin foto</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleEditar(item)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 mr-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminar(item.id)}
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
          <div className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setFotoModal(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={fotoModal} alt="Evidencia en campo" className="w-full max-h-[80vh] object-contain bg-slate-900" />
          </div>
        </div>
      )}
    </div>
  );
}